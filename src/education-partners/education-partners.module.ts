import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EducationPartnersService } from './education-partners.service';
import { EducationPartnersController } from './education-partners.controller';

@Module({
  imports: [PrismaModule],
  controllers: [EducationPartnersController],
  providers: [EducationPartnersService],
  exports: [EducationPartnersService],
})
export class EducationPartnersModule {}
