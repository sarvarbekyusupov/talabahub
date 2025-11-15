import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { ClickService } from './services/click.service';
import { PaymeService } from './services/payme.service';

@Module({
  imports: [ConfigModule],
  controllers: [PaymentController],
  providers: [PaymentService, ClickService, PaymeService],
  exports: [PaymentService],
})
export class PaymentModule {}
