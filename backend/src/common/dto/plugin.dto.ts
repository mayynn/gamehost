import { IsString, IsNumber, IsOptional, IsIn, MinLength } from 'class-validator';

// ─── Plugin Management DTOs ──────────────────────────────

export class InstallModrinthDto {
    @IsString()
    @MinLength(1)
    projectId: string;

    @IsString()
    @MinLength(1)
    versionId: string;
}

export class InstallSpigetDto {
    @IsNumber()
    resourceId: number;
}

export class InstallSpigetVersionDto {
    @IsNumber()
    resourceId: number;

    @IsNumber()
    versionId: number;
}

export class UpdatePluginDto {
    @IsString()
    @MinLength(1)
    fileName: string;
}

export class UpdateAllPluginsDto {
    @IsString()
    @IsOptional()
    @IsIn(['modrinth', 'spiget'])
    source?: 'modrinth' | 'spiget';
}
