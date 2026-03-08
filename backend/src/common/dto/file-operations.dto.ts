import { IsString, IsArray, IsOptional, MinLength, MaxLength, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// ─── File Operations DTOs ────────────────────────────────

export class WriteFileDto {
    @IsString()
    @MinLength(1)
    file: string;

    @IsString()
    content: string;
}

export class DeleteFilesDto {
    @IsString()
    root: string;

    @IsString({ each: true })
    files: string[];
}

export class RenameFileDto {
    @IsString()
    root: string;

    @IsString()
    @MinLength(1)
    from: string;

    @IsString()
    @MinLength(1)
    to: string;
}

export class CreateDirectoryDto {
    @IsString()
    root: string;

    @IsString()
    @MinLength(1)
    @MaxLength(255)
    name: string;
}

export class CompressFilesDto {
    @IsString()
    root: string;

    @IsString({ each: true })
    files: string[];
}

export class DecompressFileDto {
    @IsString()
    root: string;

    @IsString()
    @MinLength(1)
    file: string;
}

export class CopyFileDto {
    @IsString()
    @MinLength(1)
    location: string;
}

export class ChmodFileEntry {
    @IsString()
    file: string;

    @IsString()
    mode: string;
}

export class ChmodFilesDto {
    @IsString()
    root: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ChmodFileEntry)
    files: ChmodFileEntry[];
}

export class PullFileDto {
    @IsString()
    @MinLength(1)
    url: string;

    @IsString()
    directory: string;

    @IsString()
    @IsOptional()
    filename?: string;
}
