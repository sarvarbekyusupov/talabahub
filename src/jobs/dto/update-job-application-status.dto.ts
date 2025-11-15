import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
} from 'class-validator';

export class UpdateJobApplicationStatusDto {
  @ApiProperty({
    enum: ['pending', 'reviewed', 'interview', 'accepted', 'rejected'],
    example: 'interview',
    description: 'Application status',
  })
  @IsString()
  @IsEnum(['pending', 'reviewed', 'interview', 'accepted', 'rejected'])
  status: 'pending' | 'reviewed' | 'interview' | 'accepted' | 'rejected';

  @ApiProperty({
    example: 'Great candidate, scheduling interview',
    required: false,
    description: 'Status notes',
  })
  @IsOptional()
  @IsString()
  statusNotes?: string;

  @ApiProperty({
    example: '2024-12-20T10:00:00Z',
    required: false,
    description: 'Interview date',
  })
  @IsOptional()
  @IsDateString()
  interviewDate?: string;

  @ApiProperty({
    example: 'Conference Room A, 5th Floor',
    required: false,
    description: 'Interview location',
  })
  @IsOptional()
  @IsString()
  interviewLocation?: string;

  @ApiProperty({
    example: 'Video call via Google Meet link: ...',
    required: false,
    description: 'Interview notes',
  })
  @IsOptional()
  @IsString()
  interviewNotes?: string;
}
