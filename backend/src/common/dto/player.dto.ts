import { IsString, IsNumber, IsOptional, MinLength, MaxLength } from 'class-validator';

// ─── Player Management DTOs ──────────────────────────────

export class PlayerNameDto {
    @IsString()
    @MinLength(1)
    @MaxLength(32)
    player: string;
}

export class BanPlayerDto {
    @IsString()
    @MinLength(1)
    @MaxLength(32)
    player: string;

    @IsString()
    @IsOptional()
    @MaxLength(500)
    reason?: string;
}

export class IpActionDto {
    @IsString()
    @MinLength(1)
    ip: string;
}

export class BanIpDto {
    @IsString()
    @MinLength(1)
    ip: string;

    @IsString()
    @IsOptional()
    @MaxLength(500)
    reason?: string;
}

export class KickPlayerDto {
    @IsString()
    @MinLength(1)
    @MaxLength(32)
    player: string;

    @IsString()
    @IsOptional()
    @MaxLength(500)
    reason?: string;
}
