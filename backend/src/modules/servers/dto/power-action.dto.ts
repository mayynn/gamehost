import { IsString, IsIn } from 'class-validator';

export class PowerActionDto {
    @IsString()
    @IsIn(['start', 'stop', 'restart', 'kill'])
    signal: 'start' | 'stop' | 'restart' | 'kill';
}
