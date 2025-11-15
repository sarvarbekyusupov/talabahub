import { IsNotEmpty, IsNumber, IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PaymentProvider {
  CLICK = 'click',
  PAYME = 'payme',
}

export enum PaymentType {
  COURSE = 'course',
  EVENT = 'event',
  SUBSCRIPTION = 'subscription',
}

export class CreatePaymentDto {
  @ApiProperty({ description: 'Payment provider (click or payme)' })
  @IsEnum(PaymentProvider)
  @IsNotEmpty()
  provider: PaymentProvider;

  @ApiProperty({ description: 'Payment type (course, event, subscription)' })
  @IsEnum(PaymentType)
  @IsNotEmpty()
  type: PaymentType;

  @ApiProperty({ description: 'Entity ID (course ID, event ID, etc.)' })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiProperty({ description: 'Payment amount in UZS' })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ description: 'Additional data (optional)' })
  @IsOptional()
  metadata?: Record<string, any>;
}
