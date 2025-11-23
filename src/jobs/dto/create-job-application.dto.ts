import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsUrl,
  IsUUID,
  IsDateString,
  IsObject,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateJobApplicationDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Resume ID to use for this application',
  })
  @IsOptional()
  @IsUUID()
  resumeId?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/resume.pdf',
    description: 'URL to CV/Resume',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cvUrl?: string;

  @ApiPropertyOptional({
    example: 'I am very interested in this position because...',
    description: 'Cover letter',
  })
  @IsOptional()
  @IsString()
  coverLetter?: string;

  @ApiPropertyOptional({
    example: 'https://github.com/user/portfolio',
    description: 'Portfolio URL',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  portfolioUrl?: string;

  @ApiPropertyOptional({
    example: 120000,
    description: 'Expected salary',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  expectedSalary?: number;

  @ApiPropertyOptional({
    example: '2024-02-01',
    description: 'Date available to start work',
  })
  @IsOptional()
  @IsDateString()
  availableStartDate?: string;

  @ApiPropertyOptional({
    example: { question1: 'Answer 1', question2: 'Answer 2' },
    description: 'Answers to custom application questions',
  })
  @IsOptional()
  @IsObject()
  answers?: Record<string, any>;
}
