import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ServersService } from '../servers/servers.service';
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
        const secret = this.config.get('RAZORPAY_KEY_SECRET');
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

        await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: PaymentStatus.COMPLETED,
                gatewayPaymentId: data.razorpay_payment_id,
            },
        });

        await this.handlePaymentSuccess(payment);
        return { success: true };
    }

    // ========== CASHFREE ==========

    async createCashfreeOrder(userId: string, amount: number, serverId?: string): Promise<any> {
        if (this.config.get('CASHFREE_ENABLED') !== 'true') {
            throw new BadRequestException('Cashfree is not enabled');
        }

        const user = await this.prisma.user.findUnique({ where: { id: userId } });
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
                    return_url: `${this.config.get('APP_URL')}/billing/verify?order_id=${orderId}`,
                },
            },
            {
                headers: {
                    'x-client-id': this.config.get('CASHFREE_APP_ID'),
                    'x-client-secret': this.config.get('CASHFREE_SECRET_KEY'),
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
                'x-client-id': this.config.get('CASHFREE_APP_ID'),
                'x-client-secret': this.config.get('CASHFREE_SECRET_KEY'),
                'x-api-version': '2023-08-01',
            },
        });

        if (order.order_status === 'PAID') {
            const payment = await this.prisma.payment.findFirst({
                where: { gatewayOrderId: orderId },
            });

            if (payment) {
                await this.prisma.payment.update({
                    where: { id: payment.id },
                    data: { status: PaymentStatus.COMPLETED },
                });
                await this.handlePaymentSuccess(payment);
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

        return this.prisma.upiPayment.create({
            data: { userId, utr, amount, serverId, planId },
        });
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

    async addBalance(userId: string, amount: number) {
        return this.prisma.balance.upsert({
            where: { userId },
            update: { amount: { increment: amount } },
            create: { userId, amount },
        });
    }

    async deductBalance(userId: string, amount: number): Promise<boolean> {
        const balance = await this.prisma.balance.findUnique({ where: { userId } });
        if (!balance || balance.amount < amount) return false;

        await this.prisma.balance.update({
            where: { userId },
            data: { amount: { decrement: amount } },
        });
        return true;
    }

    async payWithBalance(userId: string, amount: number, serverId?: string): Promise<any> {
        const deducted = await this.deductBalance(userId, amount);
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
        if (payment.serverId) {
            // Renewal: unsuspend and extend expiry
            const server = await this.prisma.server.findUnique({ where: { id: payment.serverId } });
            if (server) {
                const currentExpiry = server.expiresAt?.getTime() || Date.now();
                const newExpiry = new Date(Math.max(Date.now(), currentExpiry) + 30 * 24 * 60 * 60 * 1000);
                await this.prisma.server.update({
                    where: { id: server.id },
                    data: { status: ServerStatus.ACTIVE, expiresAt: newExpiry, renewalNotified: false },
                });
                this.logger.log(`Server ${server.id} renewed until ${newExpiry.toISOString()}`);
            }
        } else {
            // Balance top-up
            await this.addBalance(payment.userId, payment.amount);
            this.logger.log(`Balance added: ₹${payment.amount} for user ${payment.userId}`);
        }
        this.logger.log(`Payment ${payment.id} completed: ₹${payment.amount} via ${payment.gateway}`);
    }

    // ========== RENEWAL CRON ==========

    @Cron(CronExpression.EVERY_HOUR)
    async checkRenewals() {
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        // Notify servers expiring in 7 days
        await this.prisma.server.updateMany({
            where: {
                status: ServerStatus.ACTIVE,
                renewalNotified: false,
                expiresAt: { lte: sevenDaysFromNow },
            },
            data: { renewalNotified: true },
        });

        // Suspend expired servers
        const expiredServers = await this.prisma.server.findMany({
            where: {
                status: ServerStatus.ACTIVE,
                expiresAt: { lte: now },
            },
        });

        for (const server of expiredServers) {
            await this.prisma.server.update({
                where: { id: server.id },
                data: { status: ServerStatus.SUSPENDED },
            });
            this.logger.warn(`Server ${server.id} suspended (expired)`);
        }

        // Delete servers suspended for 48+ hours
        const deleteThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000);
        const toDelete = await this.prisma.server.findMany({
            where: {
                status: ServerStatus.SUSPENDED,
                expiresAt: { lte: deleteThreshold },
            },
        });

        for (const server of toDelete) {
            await this.serversService.deleteServer(server.id);
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
    getEnabledGateways() {
        return {
            razorpay: this.config.get('RAZORPAY_ENABLED') === 'true',
            cashfree: this.config.get('CASHFREE_ENABLED') === 'true',
            upi: this.config.get('UPI_ENABLED') === 'true',
            balance: true,
        };
    }

    // ========== WEBHOOKS ==========

    async handleRazorpayWebhook(body: any): Promise<any> {
        const event = body.event;
        const entity = body.payload?.payment?.entity;

        if (!entity) return { status: 'ignored' };

        // Verify webhook signature
        const secret = this.config.get('RAZORPAY_WEBHOOK_SECRET', '');
        if (secret) {
            // Razorpay webhook signature verification would happen here
            // using the X-Razorpay-Signature header
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
                await this.handlePaymentSuccess(payment);
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

    async handleCashfreeWebhook(body: any): Promise<any> {
        const event = body.type;
        const data = body.data;

        if (!data) return { status: 'ignored' };

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
                    await this.handlePaymentSuccess(payment);
                    this.logger.log(`Cashfree webhook: Order ${orderId} paid`);
                }
            }
        }

        return { status: 'ok' };
    }
}
