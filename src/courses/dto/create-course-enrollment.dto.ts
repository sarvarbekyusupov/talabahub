import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDecimal,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class CreateCourseEnrollmentDto {
  @ApiProperty({
    example: '99.99',
    description: 'Amount paid for the enrollment',
  })
  @IsDecimal()
  amountPaid: string;

  @ApiProperty({
    example: '8.50',
    description: 'Commission earned from the enrollment',
    required: false,
  })
  @IsOptional()
  @IsDecimal()
  commissionEarned?: string;

  @ApiProperty({
    example: 'credit_card',
    description: 'Payment method (credit_card, bank_transfer, etc.)',
    required: false,
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({
    example: 'TXN123456789',
    description: 'Transaction ID from payment provider',
    required: false,
  })
  @IsOptional()
  @IsString()
  transactionId?: string;
}

export class UpdateEnrollmentProgressDto {
  @ApiProperty({
    example: 45,
    description: 'Progress percentage (0-100)',
  })
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercentage: number;
}

export class CompleteEnrollmentDto {
  @ApiProperty({
    example: 'https://example.com/certificate.pdf',
    description: 'Certificate URL',
    required: false,
  })
  @IsOptional()
  @IsString()
  certificateUrl?: string;
}
