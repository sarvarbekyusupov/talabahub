import {
  IsString,
  IsOptional,
  IsNumber,
  IsDecimal,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterEventDto {
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
}
