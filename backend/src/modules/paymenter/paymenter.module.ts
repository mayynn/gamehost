import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymenterService } from './paymenter.service';

@Module({
    imports: [ConfigModule],
    providers: [PaymenterService],
    exports: [PaymenterService],
})
export class PaymenterModule { }
