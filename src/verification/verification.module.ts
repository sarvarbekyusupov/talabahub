import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { VerificationController } from './controllers/verification.controller';
import { VerificationService } from './services/verification.service';

@Module({
  imports: [PrismaModule],
  controllers: [VerificationController],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}