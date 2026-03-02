import { Controller, Get, Post, Body, UseGuards, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

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
    @UseGuards(JwtAuthGuard)
    addBalance(@CurrentUser() user: any, @Body('amount') amount: number) {
        return this.billingService.addBalance(user.id, amount);
    }

    @Get('payments')
    @UseGuards(JwtAuthGuard)
    getPayments(@CurrentUser() user: any) {
        return this.billingService.getUserPayments(user.id);
    }

    // --- Razorpay ---
    @Post('razorpay/create')
    @UseGuards(JwtAuthGuard)
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    createRazorpayOrder(@CurrentUser() user: any, @Body() body: { amount: number; serverId?: string }) {
        return this.billingService.createRazorpayOrder(user.id, body.amount, body.serverId);
    }

    @Post('razorpay/verify')
    verifyRazorpay(@Body() body: any) {
        return this.billingService.verifyRazorpayPayment(body);
    }

    // --- Cashfree ---
    @Post('cashfree/create')
    @UseGuards(JwtAuthGuard)
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    createCashfreeOrder(@CurrentUser() user: any, @Body() body: { amount: number; serverId?: string }) {
        return this.billingService.createCashfreeOrder(user.id, body.amount, body.serverId);
    }

    @Post('cashfree/verify')
    verifyCashfree(@Body('orderId') orderId: string) {
        return this.billingService.verifyCashfreePayment(orderId);
    }

    // --- UPI ---
    @Post('upi/submit')
    @UseGuards(JwtAuthGuard)
    submitUpi(@CurrentUser() user: any, @Body() body: { utr: string; amount: number; serverId?: string; planId?: string }) {
        return this.billingService.submitUpiPayment(user.id, body.utr, body.amount, body.serverId, body.planId);
    }

    // --- Balance ---
    @Post('balance/pay')
    @UseGuards(JwtAuthGuard)
    payWithBalance(@CurrentUser() user: any, @Body() body: { amount: number; serverId?: string }) {
        return this.billingService.payWithBalance(user.id, body.amount, body.serverId);
    }

    // --- Webhooks (server-to-server, no auth guard) ---
    @Post('razorpay/webhook')
    async razorpayWebhook(@Body() body: any) {
        return this.billingService.handleRazorpayWebhook(body);
    }

    @Post('cashfree/webhook')
    async cashfreeWebhook(@Body() body: any) {
        return this.billingService.handleCashfreeWebhook(body);
    }
}
