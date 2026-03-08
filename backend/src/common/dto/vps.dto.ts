import { IsString, IsNumber, IsOptional, IsIn, MinLength, MaxLength } from 'class-validator';

// ─── VPS DTOs ────────────────────────────────────────────

export class ProvisionVpsDto {
    @IsString()
    @MinLength(1)
    planId: string;

    @IsString()
    @MinLength(1)
    os: string;

    @IsString()
    @MinLength(1)
    @MaxLength(100)
    hostname: string;
}

export class VpsActionDto {
    @IsString()
    @IsIn(['start', 'stop', 'restart', 'shutdown'])
    action: 'start' | 'stop' | 'restart' | 'shutdown';

    @IsString()
    @IsOptional()
    os?: string;
}

export class ReinstallVpsDto {
    @IsString()
    @MinLength(1)
    os: string;
}
