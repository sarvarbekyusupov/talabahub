import { Module } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { VerifiedUserGuard, EmailVerifiedGuard } from './guards/verified-user.guard';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [VerificationController],
  providers: [
    VerificationService,
    VerifiedUserGuard,
    EmailVerifiedGuard,
  ],
  exports: [
    VerificationService,
    VerifiedUserGuard,
    EmailVerifiedGuard,
  ],
})
export class VerificationModule {}
