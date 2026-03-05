import { IsString, IsInt, IsOptional, IsObject, MinLength, MaxLength, Min, Max } from 'class-validator';

export class CreateServerDto {
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name: string;

    @IsString()
    planId: string;

    @IsInt()
    @Min(1)
    eggId: number;

    @IsInt()
    @Min(1)
    nestId: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    nodeId?: number;

    @IsOptional()
    @IsInt()
    @Min(128)
    @Max(65536)
    ram?: number;

    @IsOptional()
    @IsInt()
    @Min(10)
    @Max(3200)
    cpu?: number;

    @IsOptional()
    @IsInt()
    @Min(256)
    @Max(1048576)
    disk?: number;

    @IsOptional()
    @IsObject()
    environment?: Record<string, string>;
}
