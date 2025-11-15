import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsUrl,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateJobApplicationDto {
  @ApiProperty({
    example: 'https://example.com/resume.pdf',
    required: false,
    description: 'URL to CV/Resume',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cvUrl?: string;

  @ApiProperty({
    example: 'I am very interested in this position because...',
    required: false,
    description: 'Cover letter',
  })
  @IsOptional()
  @IsString()
  coverLetter?: string;

  @ApiProperty({
    example: 'https://github.com/user/portfolio',
    required: false,
    description: 'Portfolio URL',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  portfolioUrl?: string;

  @ApiProperty({
    example: 120000,
    required: false,
    description: 'Expected salary',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  expectedSalary?: number;
}
