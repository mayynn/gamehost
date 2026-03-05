import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, IsInt, Min, Max, MinLength, MaxLength } from 'class-validator';

export class CreatePlanDto {
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @IsString()
    @IsEnum(['FREE', 'PREMIUM', 'CUSTOM'])
    type: string;

    @IsInt()
    @Min(128)
    ram: number;

    @IsInt()
    @Min(10)
    cpu: number;

    @IsInt()
    @Min(256)
    disk: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    backups?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    ports?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    databases?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    pricePerMonth?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    pricePerGb?: number;

    @IsOptional()
    @IsInt()
    nodeId?: number;

    @IsOptional()
    @IsInt()
    eggId?: number;

    @IsOptional()
    @IsString()
    nodeAssignMode?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsInt()
    sortOrder?: number;

    @IsOptional() @IsInt() @Min(128) minRam?: number;
    @IsOptional() @IsInt() @Max(65536) maxRam?: number;
    @IsOptional() @IsInt() @Min(10) minCpu?: number;
    @IsOptional() @IsInt() @Max(3200) maxCpu?: number;
    @IsOptional() @IsInt() @Min(256) minDisk?: number;
    @IsOptional() @IsInt() @Max(1048576) maxDisk?: number;
    @IsOptional() @IsInt() @Min(0) maxBackups?: number;
    @IsOptional() @IsInt() @Min(0) maxPorts?: number;
}

export class UpdatePlanDto {
    @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
    @IsOptional() @IsString() @MaxLength(500) description?: string;
    @IsOptional() @IsInt() @Min(128) ram?: number;
    @IsOptional() @IsInt() @Min(10) cpu?: number;
    @IsOptional() @IsInt() @Min(256) disk?: number;
    @IsOptional() @IsInt() @Min(0) backups?: number;
    @IsOptional() @IsInt() @Min(1) ports?: number;
    @IsOptional() @IsInt() @Min(0) databases?: number;
    @IsOptional() @IsNumber() @Min(0) pricePerMonth?: number;
    @IsOptional() @IsNumber() @Min(0) pricePerGb?: number;
    @IsOptional() @IsInt() nodeId?: number;
    @IsOptional() @IsInt() eggId?: number;
    @IsOptional() @IsString() nodeAssignMode?: string;
    @IsOptional() @IsBoolean() isActive?: boolean;
    @IsOptional() @IsInt() sortOrder?: number;
    @IsOptional() @IsInt() @Min(128) minRam?: number;
    @IsOptional() @IsInt() @Max(65536) maxRam?: number;
    @IsOptional() @IsInt() @Min(10) minCpu?: number;
    @IsOptional() @IsInt() @Max(3200) maxCpu?: number;
    @IsOptional() @IsInt() @Min(256) minDisk?: number;
    @IsOptional() @IsInt() @Max(1048576) maxDisk?: number;
    @IsOptional() @IsInt() @Min(0) maxBackups?: number;
    @IsOptional() @IsInt() @Min(0) maxPorts?: number;
}

export class SetRoleDto {
    @IsString()
    @IsEnum(['USER', 'ADMIN'])
    role: 'USER' | 'ADMIN';
}

export class AddBalanceDto {
    @IsNumber()
    @Min(1)
    @Max(100000)
    amount: number;

    @IsOptional()
    @IsString()
    userId?: string;
}
