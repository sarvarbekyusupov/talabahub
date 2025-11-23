import { PartialType } from '@nestjs/swagger';
import {
  CreateResumeDto,
  CreateResumeEducationDto,
  CreateResumeExperienceDto,
} from './create-resume.dto';

export class UpdateResumeDto extends PartialType(CreateResumeDto) {}

export class UpdateResumeEducationDto extends PartialType(CreateResumeEducationDto) {}

export class UpdateResumeExperienceDto extends PartialType(CreateResumeExperienceDto) {}
