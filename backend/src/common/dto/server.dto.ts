import { IsString, IsBoolean, IsNumber, IsInt, IsOptional, IsIn, MinLength, MaxLength, Matches, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

// ─── Server Settings DTOs ────────────────────────────────

export class RenameServerDto {
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    name: string;
}

export class ChangeDockerImageDto {
    @IsString()
    @MinLength(1)
    @MaxLength(500)
    @Matches(/^[a-zA-Z0-9][a-zA-Z0-9._\-/]+:[a-zA-Z0-9._\-]+$/, {
        message: 'Docker image must be in format repository:tag',
    })
    docker_image: string;
}

export class UpdateStartupDto {
    @IsString()
    @MinLength(1)
    key: string;

    @IsString()
    value: string;
}

export class CreateDatabaseDto {
    @IsString()
    @MinLength(1)
    @MaxLength(48)
    @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Database name must be alphanumeric with underscores' })
    name: string;
}

export class SendCommandDto {
    @IsString()
    @MinLength(1)
    @MaxLength(2000)
    command: string;
}

// ─── Schedule DTOs ───────────────────────────────────────

export class CreateScheduleDto {
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    name: string;

    @IsBoolean()
    is_active: boolean;

    @IsString()
    minute: string;

    @IsString()
    hour: string;

    @IsString()
    day_of_week: string;

    @IsString()
    day_of_month: string;

    @IsString()
    month: string;
}

export class CreateScheduleTaskDto {
    @IsString()
    @IsIn(['command', 'power', 'backup'])
    action: 'command' | 'power' | 'backup';

    @IsString()
    payload: string;

    @IsNumber()
    @Min(0)
    @Max(900)
    time_offset: number;

    @IsBoolean()
    @IsOptional()
    continue_on_failure?: boolean;
}

// ─── Backup DTOs ─────────────────────────────────────────

export class RestoreBackupDto {
    @IsBoolean()
    @IsOptional()
    truncate?: boolean;
}

// ─── Plan Pricing DTOs ──────────────────────────────────

export class CalculatePriceDto {
    @IsString()
    @MinLength(1)
    planId: string;

    @IsInt()
    @Min(128)
    ram: number;

    @IsInt()
    @Min(10)
    cpu: number;

    @IsInt()
    @Min(256)
    disk: number;
}
