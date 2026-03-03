import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UsersModule } from '../users/users.module';
import { ServersModule } from '../servers/servers.module';
import { BillingModule } from '../billing/billing.module';
import { PlansModule } from '../plans/plans.module';
import { PterodactylModule } from '../pterodactyl/pterodactyl.module';
import { VpsModule } from '../vps/vps.module';

@Module({
    imports: [UsersModule, ServersModule, BillingModule, PlansModule, PterodactylModule, VpsModule],
    controllers: [AdminController],
    providers: [AdminService],
})
export class AdminModule { }
