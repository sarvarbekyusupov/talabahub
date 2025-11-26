import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { VerificationSchedulerService } from './services/verification-scheduler.service';
import { UniversityDomainService } from './services/university-domain.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { VerifiedUserGuard, EmailVerifiedGuard } from './guards/verified-user.guard';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    MailModule
  ],
  controllers: [VerificationController],
  providers: [
    VerificationService,
    VerificationSchedulerService,
    UniversityDomainService,
    VerifiedUserGuard,
    EmailVerifiedGuard,
  ],
  exports: [
    VerificationService,
    UniversityDomainService,
    VerifiedUserGuard,
    EmailVerifiedGuard,
  ],
})
export class VerificationModule {}
