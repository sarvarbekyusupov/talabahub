import { Module } from '@nestjs/common';
import { EducationPartnersService } from './education-partners.service';
import { EducationPartnersController } from './education-partners.controller';

@Module({
  controllers: [EducationPartnersController],
  providers: [EducationPartnersService],
})
export class EducationPartnersModule {}
