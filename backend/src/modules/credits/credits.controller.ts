import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CreditsService } from './credits.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('credits')
@UseGuards(JwtAuthGuard)
export class CreditsController {
    constructor(private creditsService: CreditsService) { }

    @Get()
    getCredits(@CurrentUser() user: any) {
        return this.creditsService.getCredits(user.id);
    }

    @Get('config')
    getConfig() {
        return this.creditsService.getEarnConfig();
    }

    @Post('earn')
    @Throttle({ default: { limit: 2, ttl: 60000 } })
    earnCredits(@CurrentUser() user: any) {
        return this.creditsService.earnCredits(user.id);
    }
}
