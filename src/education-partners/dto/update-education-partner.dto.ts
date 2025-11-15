import { PartialType } from '@nestjs/swagger';
import { CreateEducationPartnerDto } from './create-education-partner.dto';

export class UpdateEducationPartnerDto extends PartialType(CreateEducationPartnerDto) {}
