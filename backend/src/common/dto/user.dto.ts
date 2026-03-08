import { IsString, IsEmail, IsOptional, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

// ─── User DTOs ───────────────────────────────────────────

export class UpdateProfileDto {
    @IsString()
    @IsOptional()
    @MinLength(2)
    @MaxLength(50)
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    name?: string;
}

export class ChangePasswordDto {
    @IsString()
    @IsOptional()
    currentPassword?: string;

    @IsString()
    @MinLength(8)
    @MaxLength(128)
    newPassword: string;
}

// ─── Auth DTOs ───────────────────────────────────────────

export class ResendVerificationDto {
    @IsEmail()
    email: string;
}
