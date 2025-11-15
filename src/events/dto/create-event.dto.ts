import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDate,
  IsBoolean,
  IsNumber,
  IsUrl,
  MinDate,
  Min,
  Max,
  MaxLength,
  IsDecimal,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty({
    example: 'Tech Conference 2024',
    description: 'Event title',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    example: 'tech-conference-2024',
    description: 'URL-friendly slug (must be unique)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @ApiPropertyOptional({
    example: 'Annual technology conference featuring industry leaders',
    description: 'Detailed event description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/event-cover.jpg',
    description: 'Cover image URL',
  })
  @IsOptional()
  @IsUrl()
  coverImage?: string;

  @ApiPropertyOptional({
    example: 'workshop',
    description: 'Event type (e.g., workshop, conference, seminar, webinar)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  eventType?: string;

  @ApiPropertyOptional({
    example: 'Tashkent Convention Center, Hall A',
    description: 'Physical location (not required if online)',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    example: false,
    description: 'Whether the event is online',
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isOnline?: boolean;

  @ApiPropertyOptional({
    example: 'https://zoom.us/j/meeting123',
    description: 'Meeting link for online events',
  })
  @IsOptional()
  @IsUrl()
  meetingLink?: string;

  @ApiProperty({
    example: '2024-12-01T09:00:00Z',
    description: 'Event start date and time (ISO 8601 format)',
  })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiProperty({
    example: '2024-12-02T17:00:00Z',
    description: 'Event end date and time (ISO 8601 format)',
  })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @ApiPropertyOptional({
    example: '2024-11-30T09:00:00Z',
    description: 'Registration deadline (must be before event start)',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  registrationDeadline?: Date;

  @ApiPropertyOptional({
    example: 500,
    description: 'Maximum number of participants',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100000)
  maxParticipants?: number;

  @ApiProperty({
    example: true,
    description: 'Whether the event is free',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isFree?: boolean;

  @ApiPropertyOptional({
    example: '50000.00',
    description: 'Ticket price (required if not free)',
  })
  @IsOptional()
  @IsDecimal({ decimal_digits: '1,2' })
  @Type(() => Number)
  @Min(0)
  ticketPrice?: number;

  @ApiProperty({
    example: true,
    description: 'Whether the event is active',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;
}
