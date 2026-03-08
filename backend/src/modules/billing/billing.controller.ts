import { Controller, Get, Post, Body, UseGuards, Param, Req, BadRequestException, RawBodyRequest, Query } from '@nestjs/common';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces';
import { CreatePaymentDto, SubmitUpiDto, AddBalanceDto, VerifyRazorpayDto, VerifyCashfreeDto } from '../../common/dto';

@Controller('billing')
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class BillingController {
    constructor(private billingService: BillingService) { }

    @Get('gateways')
    getGateways() {
        return this.billingService.getEnabledGateways();
    }

    @Get('balance')
    @UseGuards(JwtAuthGuard)
    getBalance(@CurrentUser() user: any) {
        return this.billingService.getBalance(user.id);
    }

    @Post('balance/add')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    async addBalance(@CurrentUser() user: any, @Body() body: AddBalanceDto) {
        // If userId is provided, add to that user; otherwise add to admin's own
        const targetUserId = body.userId || user.id;
        return this.billingService.addBalance(targetUserId, body.amount, 'ADMIN_ADD', `Admin ${user.id} added balance`, undefined);
    }

    @Get('payments')
    @UseGuards(JwtAuthGuard)
    getPayments(@CurrentUser() user: any) {
        return this.billingService.getUserPayments(user.id);
    }

    @Get('balance/transactions')
    @UseGuards(JwtAuthGuard)
    getBalanceTransactions(@CurrentUser() user: any) {
        return this.billingService.getBalanceTransactions(user.id);
    }

    // --- Razorpay ---
    @Post('razorpay/create')
    @UseGuards(JwtAuthGuard)
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    createRazorpayOrder(@CurrentUser() user: any, @Body() body: CreatePaymentDto) {
        return this.billingService.createRazorpayOrder(user.id, body.amount, body.serverId);
    }

    @Post('razorpay/verify')
    @UseGuards(JwtAuthGuard)
    verifyRazorpay(@Body() body: VerifyRazorpayDto) {
        return this.billingService.verifyRazorpayPayment(body);
    }

    // --- Cashfree ---
    @Post('cashfree/create')
    @UseGuards(JwtAuthGuard)
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    createCashfreeOrder(@CurrentUser() user: any, @Body() body: CreatePaymentDto) {
        return this.billingService.createCashfreeOrder(user.id, body.amount, body.serverId);
    }

    @Post('cashfree/verify')
    @UseGuards(JwtAuthGuard)
    verifyCashfree(@Body() body: VerifyCashfreeDto) {
        return this.billingService.verifyCashfreePayment(body.orderId);
    }

    // --- UPI ---
    @Post('upi/submit')
    @UseGuards(JwtAuthGuard)
    submitUpi(@CurrentUser() user: any, @Body() body: SubmitUpiDto) {
        return this.billingService.submitUpiPayment(user.id, body.utr, body.amount, body.serverId, body.planId);
    }

    // --- Balance ---
    @Post('balance/pay')
    @UseGuards(JwtAuthGuard)
    payWithBalance(@CurrentUser() user: any, @Body() body: CreatePaymentDto) {
        return this.billingService.payWithBalance(user.id, body.amount, body.serverId);
    }

    // --- Webhooks (server-to-server, no auth guard — verified by HMAC signature) ---
    @Post('razorpay/webhook')
    async razorpayWebhook(@Body() body: any, @Req() req: RawBodyRequest<Request>) {
        const rawBody = req.rawBody?.toString('utf8') || '';
        const signature = req.headers['x-razorpay-signature'] as string || '';
        return this.billingService.handleRazorpayWebhook(body, rawBody, signature);
    }

    @Post('cashfree/webhook')
    async cashfreeWebhook(@Body() body: any, @Req() req: RawBodyRequest<Request>) {
        const rawBody = req.rawBody?.toString('utf8') || '';
        const signature = req.headers['x-cashfree-signature'] as string || '';
        const timestamp = req.headers['x-cashfree-timestamp'] as string || '';
        return this.billingService.handleCashfreeWebhook(body, rawBody, signature, timestamp);
    }
}
