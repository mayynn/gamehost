import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces';
import { UpdateProfileDto, ChangePasswordDto } from '../../common/dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private usersService: UsersService) { }

    @Get('profile')
    async getProfile(@CurrentUser() user: any) {
        return this.usersService.findById(user.id);
    }

    @Patch('profile')
    async updateProfile(@CurrentUser() user: any, @Body() body: UpdateProfileDto) {
        return this.usersService.updateProfile(user.id, body);
    }

    @Post('change-password')
    async changePassword(
        @CurrentUser() user: any,
        @Body() body: ChangePasswordDto,
    ) {
        return this.usersService.changePassword(user.id, body.newPassword, body.currentPassword);
    }
}
