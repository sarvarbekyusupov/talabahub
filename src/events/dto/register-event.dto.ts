import {
  IsString,
  IsOptional,
  IsNumber,
  IsDecimal,
  IsUUID,
  IsObject,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterEventDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Ticket type ID for paid events with multiple ticket options',
  })
  @IsOptional()
  @IsUUID()
  ticketTypeId?: string;

  @ApiPropertyOptional({
    example: 'credit_card',
    description: 'Payment method (e.g., credit_card, paypal, bank_transfer)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentMethod?: string;

  @ApiPropertyOptional({
    example: '50000.00',
    description: 'Amount paid for the event',
  })
  @IsOptional()
  @IsDecimal({ decimal_digits: '1,2' })
  @Type(() => Number)
  @Min(0)
  amountPaid?: number;

  @ApiPropertyOptional({
    example: { dietary: 'vegetarian', tshirtSize: 'L' },
    description: 'Answers to custom registration questions',
  })
  @IsOptional()
  @IsObject()
  answers?: Record<string, any>;
}

export class SubmitFeedbackDto {
  @ApiProperty({
    example: 5,
    description: 'Rating from 1 to 5',
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({
    example: 'Great event! Very informative.',
    description: 'Optional feedback comment',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class SelfCheckInDto {
  @ApiPropertyOptional({
    example: 41.2995,
    description: 'User latitude for geo-fenced check-in',
  })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({
    example: 69.2401,
    description: 'User longitude for geo-fenced check-in',
  })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class CheckInByQRDto {
  @ApiProperty({
    example: 'abc123xyz789',
    description: 'QR code from user registration',
  })
  @IsString()
  qrCode: string;
}

export class CancelEventDto {
  @ApiPropertyOptional({
    example: 'Event cancelled due to unforeseen circumstances',
    description: 'Reason for cancellation',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
