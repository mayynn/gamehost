import { IsString, IsNumber, IsOptional, IsEmail, MinLength, MaxLength, Min, Max } from 'class-validator';

// ─── Payment DTOs ────────────────────────────────────────

export class CreatePaymentDto {
    @IsNumber()
    @Min(1)
    @Max(100000)
    amount: number;

    @IsString()
    @IsOptional()
    serverId?: string;
}

export class SubmitUpiDto {
    @IsString()
    @MinLength(6)
    @MaxLength(50)
    utr: string;

    @IsNumber()
    @Min(1)
    @Max(100000)
    amount: number;

    @IsString()
    @IsOptional()
    serverId?: string;

    @IsString()
    @IsOptional()
    planId?: string;
}

export class AddBalanceDto {
    @IsNumber()
    @Min(1)
    @Max(100000)
    amount: number;

    @IsString()
    @IsOptional()
    userId?: string;
}

export class VerifyRazorpayDto {
    @IsString()
    razorpay_order_id: string;

    @IsString()
    razorpay_payment_id: string;

    @IsString()
    razorpay_signature: string;
}

export class VerifyCashfreeDto {
    @IsString()
    orderId: string;
}
