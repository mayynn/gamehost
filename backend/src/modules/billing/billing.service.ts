import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ServersService } from '../servers/servers.service';
import { PterodactylService } from '../pterodactyl/pterodactyl.service';
import { DiscordService } from '../discord/discord.service';
import { PaymentGateway, PaymentStatus, ServerStatus, UpiStatus } from '@prisma/client';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class BillingService {
    private readonly logger = new Logger(BillingService.name);

    constructor(
        private prisma: PrismaService,
        private config: ConfigService,
        private serversService: ServersService,
        private pterodactyl: PterodactylService,
        private discord: DiscordService,
    ) { }

    // ========== RAZORPAY ==========

    async createRazorpayOrder(userId: string, amount: number, serverId?: string): Promise<any> {
        if (this.config.get('RAZORPAY_ENABLED') !== 'true') {
            throw new BadRequestException('Razorpay is not enabled');
        }

        const Razorpay = require('razorpay');
        const instance = new Razorpay({
            key_id: this.config.get('RAZORPAY_KEY_ID'),
            key_secret: this.config.get('RAZORPAY_KEY_SECRET'),
        });

        const order = await instance.orders.create({
            amount: Math.round(amount * 100), // paisa
            currency: 'INR',
            receipt: `gamehost_${Date.now()}`,
        });

        // Save payment record
        const payment = await this.prisma.payment.create({
            data: {
                userId,
                serverId,
                gateway: PaymentGateway.RAZORPAY,
                amount,
                status: PaymentStatus.PENDING,
                gatewayOrderId: order.id,
            },
        });

        return {
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            paymentId: payment.id,
            keyId: this.config.get('RAZORPAY_KEY_ID'),
        };
    }

    async verifyRazorpayPayment(data: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
    }): Promise<any> {
        const secret = this.config.get('RAZORPAY_KEY_SECRET', '');
        if (!secret) {
            throw new BadRequestException('Razorpay is not configured');
        }
        const body = data.razorpay_order_id + '|' + data.razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(body)
            .digest('hex');

        if (expectedSignature !== data.razorpay_signature) {
            throw new BadRequestException('Invalid payment signature');
        }

        const payment = await this.prisma.payment.findFirst({
            where: { gatewayOrderId: data.razorpay_order_id },
        });

        if (!payment) throw new BadRequestException('Payment not found');

        // Prevent double-processing (network retries, duplicate calls)
        if (payment.status === PaymentStatus.COMPLETED) {
            return { success: true, message: 'Payment already processed' };
        }

        await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: PaymentStatus.COMPLETED,
                gatewayPaymentId: data.razorpay_payment_id,
            },
        });

        // Re-fetch updated payment to pass correct status to handler
        const updatedPayment = await this.prisma.payment.findUnique({ where: { id: payment.id } });
        await this.handlePaymentSuccess(updatedPayment);
        return { success: true };
    }

    // ========== CASHFREE ==========

    async createCashfreeOrder(userId: string, amount: number, serverId?: string): Promise<any> {
        if (this.config.get('CASHFREE_ENABLED') !== 'true') {
            throw new BadRequestException('Cashfree is not enabled');
        }

        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new BadRequestException('User not found');
        const env = this.config.get('CASHFREE_ENV', 'sandbox');
        const baseUrl = env === 'production'
            ? 'https://api.cashfree.com/pg'
            : 'https://sandbox.cashfree.com/pg';

        const orderId = `GH_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        const { data: order } = await axios.post(
            `${baseUrl}/orders`,
            {
                order_id: orderId,
                order_amount: amount,
                order_currency: 'INR',
                customer_details: {
                    customer_id: userId,
                    customer_email: user.email,
                    customer_name: user.name,
                },
                order_meta: {
                    return_url: `${this.config.get('APP_URL')}/dashboard/billing?cf_order_id=${orderId}`,
                },
            },
            {
                headers: {
                    'x-client-id': this.config.get('CASHFREE_APP_ID', ''),
                    'x-client-secret': this.config.get('CASHFREE_SECRET_KEY', ''),
                    'x-api-version': '2023-08-01',
                    'Content-Type': 'application/json',
                },
            },
        );

        const payment = await this.prisma.payment.create({
            data: {
                userId,
                serverId,
                gateway: PaymentGateway.CASHFREE,
                amount,
                status: PaymentStatus.PENDING,
                gatewayOrderId: orderId,
            },
        });

        return {
            sessionId: order.payment_session_id,
            orderId,
            paymentId: payment.id,
        };
    }

    async verifyCashfreePayment(orderId: string): Promise<any> {
        const env = this.config.get('CASHFREE_ENV', 'sandbox');
        const baseUrl = env === 'production'
            ? 'https://api.cashfree.com/pg'
            : 'https://sandbox.cashfree.com/pg';

        const { data: order } = await axios.get(`${baseUrl}/orders/${orderId}`, {
            headers: {
                'x-client-id': this.config.get('CASHFREE_APP_ID', ''),
                'x-client-secret': this.config.get('CASHFREE_SECRET_KEY', ''),
                'x-api-version': '2023-08-01',
            },
        });

        if (order.order_status === 'PAID') {
            const payment = await this.prisma.payment.findFirst({
                where: { gatewayOrderId: orderId },
            });

            if (payment) {
                // Prevent double-processing
                if (payment.status === PaymentStatus.COMPLETED) {
                    return { success: true, message: 'Payment already processed' };
                }

                await this.prisma.payment.update({
                    where: { id: payment.id },
                    data: { status: PaymentStatus.COMPLETED },
                });
                // Re-fetch updated payment to pass correct status to handler
                const updatedPayment = await this.prisma.payment.findUnique({ where: { id: payment.id } });
                await this.handlePaymentSuccess(updatedPayment);
            }

            return { success: true };
        }

        return { success: false, status: order.order_status };
    }

    // ========== UPI MANUAL ==========

    async submitUpiPayment(userId: string, utr: string, amount: number, serverId?: string, planId?: string) {
        if (this.config.get('UPI_ENABLED') !== 'true') {
            throw new BadRequestException('UPI payments are not enabled');
        }

        const upiPayment = await this.prisma.upiPayment.create({
            data: { userId, utr, amount, serverId, planId },
        });

        // Notify Discord about new UPI submission
        try {
            const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
            await this.discord.logUtrRequest(user?.name || user?.email || userId, utr, amount);
        } catch {}

        return upiPayment;
    }

    async approveUpiPayment(upiPaymentId: string, approvedBy: string) {
        const upi = await this.prisma.upiPayment.update({
            where: { id: upiPaymentId },
            data: { status: UpiStatus.APPROVED, approvedBy },
        });

        // Create payment record
        const payment = await this.prisma.payment.create({
            data: {
                userId: upi.userId,
                serverId: upi.serverId,
                gateway: PaymentGateway.UPI,
                amount: upi.amount,
                status: PaymentStatus.COMPLETED,
            },
        });

        await this.handlePaymentSuccess(payment);
        return upi;
    }

    async rejectUpiPayment(upiPaymentId: string) {
        return this.prisma.upiPayment.update({
            where: { id: upiPaymentId },
            data: { status: UpiStatus.REJECTED },
        });
    }

    async getPendingUpiPayments() {
        return this.prisma.upiPayment.findMany({
            where: { status: UpiStatus.PENDING },
            include: { user: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    // ========== BALANCE ==========

    async getBalance(userId: string): Promise<number> {
        const balance = await this.prisma.balance.findUnique({ where: { userId } });
        return balance?.amount || 0;
    }

    async addBalance(userId: string, amount: number, type = 'TOP_UP', description?: string, relatedId?: string) {
        const result = await this.prisma.balance.upsert({
            where: { userId },
            update: { amount: { increment: amount } },
            create: { userId, amount },
        });

        // Record balance transaction for audit trail
        await this.prisma.balanceTransaction.create({
            data: { userId, amount, type, description, relatedId },
        });

        return result;
    }

    async deductBalance(userId: string, amount: number, type = 'DEDUCTION', description?: string, relatedId?: string): Promise<boolean> {
        // Use interactive transaction to prevent race conditions (negative balance)
        return this.prisma.$transaction(async (tx) => {
            const balance = await tx.balance.findUnique({ where: { userId } });
            if (!balance || balance.amount < amount) return false;

            await tx.balance.update({
                where: { userId },
                data: { amount: { decrement: amount } },
            });

            // Record balance transaction for audit trail
            await tx.balanceTransaction.create({
                data: { userId, amount: -amount, type, description, relatedId },
            });

            return true;
        });
    }

    async payWithBalance(userId: string, amount: number, serverId?: string): Promise<any> {
        const deducted = await this.deductBalance(userId, amount, serverId ? 'RENEWAL' : 'DEDUCTION', serverId ? `Renewal for server ${serverId}` : 'Balance payment', serverId);
        if (!deducted) throw new BadRequestException('Insufficient balance');

        const payment = await this.prisma.payment.create({
            data: {
                userId,
                serverId,
                gateway: PaymentGateway.BALANCE,
                amount,
                status: PaymentStatus.COMPLETED,
            },
        });

        await this.handlePaymentSuccess(payment);
        return { success: true };
    }

    // ========== PAYMENT SUCCESS HANDLER ==========

    private async handlePaymentSuccess(payment: any) {
        const user = await this.prisma.user.findUnique({ where: { id: payment.userId } });
        const userName = user?.name || 'Unknown';

        if (payment.serverId) {
            // Renewal: unsuspend and extend expiry
            const server = await this.prisma.server.findUnique({ where: { id: payment.serverId } });
            if (server) {
                const currentExpiry = server.expiresAt?.getTime() || Date.now();
                const newExpiry = new Date(Math.max(Date.now(), currentExpiry) + 30 * 24 * 60 * 60 * 1000);

                // Unsuspend in Pterodactyl if server was suspended
                if (server.status === ServerStatus.SUSPENDED && server.pteroServerId) {
                    try {
                        await this.pterodactyl.unsuspendServer(server.pteroServerId);
                    } catch (e: any) {
                        this.logger.error(`Failed to unsuspend server ${server.pteroServerId} in Pterodactyl: ${e.message}`);
                    }
                }

                await this.prisma.server.update({
                    where: { id: server.id },
                    data: { status: ServerStatus.ACTIVE, expiresAt: newExpiry, renewalNotified: false },
                });
                this.logger.log(`Server ${server.id} renewed until ${newExpiry.toISOString()}`);

                // Discord log for renewal
                await this.discord.logServerRenewal(userName, server.name, newExpiry);
            }
        } else {
            // Balance top-up — only add balance if payment was NOT from the BALANCE gateway 
            // (balance gateway already deducted; other gateways add funds)
            if (payment.gateway !== PaymentGateway.BALANCE) {
                await this.addBalance(payment.userId, payment.amount, 'TOP_UP', `${payment.gateway} payment`, payment.id);
            }
            this.logger.log(`Balance added: ₹${payment.amount} for user ${payment.userId}`);
        }

        // Discord log for payment
        await this.discord.logPayment(userName, payment.amount, payment.gateway);
        this.logger.log(`Payment ${payment.id} completed: ₹${payment.amount} via ${payment.gateway}`);
    }

    // ========== SERVER RENEWAL COST CALCULATOR ==========

    private async calculateServerRenewalCost(server: any): Promise<number> {
        if (server.isFreeServer) return 0;
        if (!server.planId) return 0;

        const plan = await this.prisma.plan.findUnique({ where: { id: server.planId } });
        if (!plan) return 0;

        if (plan.type === 'CUSTOM') {
            const pricePerGb = plan.pricePerGb || 50;
            const ramGb = server.ram / 1024;
            const cpuFactor = server.cpu / 100;
            const diskGb = server.disk / 1024;
            return Math.ceil(ramGb * pricePerGb + diskGb * (pricePerGb * 0.1) + cpuFactor * (pricePerGb * 0.5));
        }

        return plan.pricePerMonth || 0;
    }

    // ========== RENEWAL CRON ==========

    @Cron(CronExpression.EVERY_HOUR)
    async checkRenewals() {
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

        // ── Step 1: Send renewal reminders (7 days before expiry) ──
        const serversToNotify = await this.prisma.server.findMany({
            where: {
                status: ServerStatus.ACTIVE,
                renewalNotified: false,
                isFreeServer: false,
                expiresAt: { lte: sevenDaysFromNow, gt: now },
            },
            include: { user: true },
        });

        for (const server of serversToNotify) {
            const daysLeft = Math.ceil((server.expiresAt!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
            const renewalCost = await this.calculateServerRenewalCost(server);

            // Send Discord notification
            await this.discord.sendRenewalReminder(
                server.user.name,
                server.name,
                daysLeft,
                renewalCost,
            );

            // Log the notification
            this.logger.log(`Renewal reminder sent for server ${server.id} (${server.name}) — ${daysLeft} days left`);

            await this.prisma.server.update({
                where: { id: server.id },
                data: { renewalNotified: true },
            });
        }

        // ── Step 2: Auto-renew from balance (3 days before or at expiry) ──
        const serversToAutoRenew = await this.prisma.server.findMany({
            where: {
                status: ServerStatus.ACTIVE,
                isFreeServer: false,
                expiresAt: { lte: threeDaysFromNow, gt: now },
            },
            include: { user: { include: { balance: true } } },
        });

        for (const server of serversToAutoRenew) {
            const renewalCost = await this.calculateServerRenewalCost(server);
            if (renewalCost <= 0) continue;

            const userBalance = server.user.balance?.amount || 0;
            if (userBalance >= renewalCost) {
                // Auto-renew from balance
                const deducted = await this.deductBalance(
                    server.userId,
                    renewalCost,
                    'RENEWAL',
                    `Auto-renewal for server "${server.name}"`,
                    server.id,
                );

                if (deducted) {
                    const currentExpiry = server.expiresAt?.getTime() || Date.now();
                    const newExpiry = new Date(Math.max(Date.now(), currentExpiry) + 30 * 24 * 60 * 60 * 1000);

                    await this.prisma.server.update({
                        where: { id: server.id },
                        data: { expiresAt: newExpiry, renewalNotified: false },
                    });

                    // Record payment
                    await this.prisma.payment.create({
                        data: {
                            userId: server.userId,
                            serverId: server.id,
                            gateway: PaymentGateway.BALANCE,
                            amount: renewalCost,
                            status: PaymentStatus.COMPLETED,
                            metadata: { type: 'auto_renewal', autoRenew: true },
                        },
                    });

                    await this.discord.logServerRenewal(server.user.name, server.name, newExpiry);
                    this.logger.log(`Auto-renewed server ${server.id} (${server.name}) — ₹${renewalCost} deducted, new expiry: ${newExpiry.toISOString()}`);
                }
            }
        }

        // ── Step 3: Suspend expired servers (that weren't auto-renewed) ──
        const expiredServers = await this.prisma.server.findMany({
            where: {
                status: ServerStatus.ACTIVE,
                expiresAt: { lte: now },
            },
            include: { user: true },
        });

        for (const server of expiredServers) {
            // Suspend in Pterodactyl first
            if (server.pteroServerId) {
                try {
                    await this.pterodactyl.suspendServer(server.pteroServerId);
                } catch (e: any) {
                    this.logger.error(`Failed to suspend server ${server.pteroServerId} in Pterodactyl: ${e.message}`);
                }
            }
            await this.prisma.server.update({
                where: { id: server.id },
                data: { status: ServerStatus.SUSPENDED },
            });

            // Notify user of suspension
            await this.discord.logServerSuspend(server.user.name, server.name, 'Expired — insufficient balance for auto-renewal');
            this.logger.warn(`Server ${server.id} suspended (expired)`);
        }

        // ── Step 4: Delete servers suspended for 48+ hours ──
        const deleteThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000);
        const toDelete = await this.prisma.server.findMany({
            where: {
                status: ServerStatus.SUSPENDED,
                isFreeServer: false, // Free servers handled by CreditsService
                updatedAt: { lte: deleteThreshold },
            },
            include: { user: true },
        });

        for (const server of toDelete) {
            await this.serversService.deleteServer(server.id);
            await this.discord.logServerDelete(server.user.name, server.name, 'Suspended 48+ hours without renewal');
            this.logger.warn(`Server ${server.id} deleted (expired 48h+)`);
        }
    }

    // ---------- Payment History ----------
    async getUserPayments(userId: string) {
        return this.prisma.payment.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: { server: true },
        });
    }

    // ---------- Gateway Status ----------
    async getEnabledGateways() {
        // Check DB settings first (admin panel), fall back to env vars
        const dbSettings = await this.prisma.adminSetting.findMany({
            where: { key: { in: ['RAZORPAY_ENABLED', 'CASHFREE_ENABLED', 'UPI_ENABLED', 'UPI_ID'] } },
        });
        const db: Record<string, string> = {};
        for (const s of dbSettings) db[s.key] = s.value;

        return {
            razorpay: (db['RAZORPAY_ENABLED'] || this.config.get('RAZORPAY_ENABLED', 'false')) === 'true',
            cashfree: (db['CASHFREE_ENABLED'] || this.config.get('CASHFREE_ENABLED', 'false')) === 'true',
            upi: (db['UPI_ENABLED'] || this.config.get('UPI_ENABLED', 'false')) === 'true',
            upiId: db['UPI_ID'] || this.config.get('UPI_ID', ''),
            balance: true,
        };
    }

    // ---------- Balance Transactions (ledger/audit) ----------
    async getBalanceTransactions(userId: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [transactions, total] = await Promise.all([
            this.prisma.balanceTransaction.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.balanceTransaction.count({ where: { userId } }),
        ]);
        return { transactions, total, page, totalPages: Math.ceil(total / limit) };
    }

    // ========== WEBHOOKS ==========

    async handleRazorpayWebhook(body: any, rawBody: string, signature: string): Promise<any> {
        const event = body.event;
        const entity = body.payload?.payment?.entity;

        if (!entity) return { status: 'ignored' };

        // Verify webhook signature using raw body and X-Razorpay-Signature header
        const secret = this.config.get('RAZORPAY_WEBHOOK_SECRET', '');
        if (secret) {
            if (!rawBody || !signature) {
                this.logger.warn('Razorpay webhook: missing raw body or signature — rejecting');
                return { status: 'invalid_signature' };
            }
            const expectedSig = crypto
                .createHmac('sha256', secret)
                .update(rawBody)
                .digest('hex');
            if (expectedSig !== signature) {
                this.logger.warn('Razorpay webhook: invalid signature — rejecting');
                return { status: 'invalid_signature' };
            }
        }

        if (event === 'payment.captured') {
            const payment = await this.prisma.payment.findFirst({
                where: { gatewayOrderId: entity.order_id },
            });

            if (payment && payment.status !== PaymentStatus.COMPLETED) {
                await this.prisma.payment.update({
                    where: { id: payment.id },
                    data: {
                        status: PaymentStatus.COMPLETED,
                        gatewayPaymentId: entity.id,
                    },
                });
                // Re-fetch updated payment to pass correct status to handler
                const updatedPayment = await this.prisma.payment.findUnique({ where: { id: payment.id } });
                await this.handlePaymentSuccess(updatedPayment);
                this.logger.log(`Razorpay webhook: Payment ${entity.id} captured`);
            }
        } else if (event === 'payment.failed') {
            const payment = await this.prisma.payment.findFirst({
                where: { gatewayOrderId: entity.order_id },
            });
            if (payment) {
                await this.prisma.payment.update({
                    where: { id: payment.id },
                    data: { status: PaymentStatus.FAILED },
                });
            }
        }

        return { status: 'ok' };
    }

    async handleCashfreeWebhook(body: any, rawBody: string, signature: string, timestamp: string): Promise<any> {
        const event = body.type;
        const data = body.data;

        if (!data) return { status: 'ignored' };

        // Verify Cashfree webhook signature using raw body + x-cashfree-signature/timestamp headers
        const cfSecret = this.config.get('CASHFREE_WEBHOOK_SECRET', '');
        if (cfSecret) {
            if (!rawBody || !signature) {
                this.logger.warn('Cashfree webhook: missing raw body or signature — rejecting');
                return { status: 'invalid_signature' };
            }
            const expectedSig = crypto
                .createHmac('sha256', cfSecret)
                .update(timestamp + rawBody)
                .digest('base64');
            if (expectedSig !== signature) {
                this.logger.warn('Cashfree webhook: invalid signature — rejecting');
                return { status: 'invalid_signature' };
            }
        }

        if (event === 'PAYMENT_SUCCESS_WEBHOOK') {
            const orderId = data.order?.order_id;
            if (orderId) {
                const payment = await this.prisma.payment.findFirst({
                    where: { gatewayOrderId: orderId },
                });

                if (payment && payment.status !== PaymentStatus.COMPLETED) {
                    await this.prisma.payment.update({
                        where: { id: payment.id },
                        data: {
                            status: PaymentStatus.COMPLETED,
                            gatewayPaymentId: data.payment?.cf_payment_id?.toString(),
                        },
                    });
                    // Re-fetch updated payment to pass correct status to handler
                    const updatedPayment = await this.prisma.payment.findUnique({ where: { id: payment.id } });
                    await this.handlePaymentSuccess(updatedPayment);
                    this.logger.log(`Cashfree webhook: Order ${orderId} paid`);
                }
            }
        }

        return { status: 'ok' };
    }
}
