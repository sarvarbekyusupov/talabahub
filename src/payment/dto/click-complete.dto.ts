import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ClickCompleteDto {
  @ApiProperty({ description: 'Click transaction ID' })
  @IsNumber()
  @IsNotEmpty()
  click_trans_id: number;

  @ApiProperty({ description: 'Service ID' })
  @IsNumber()
  @IsNotEmpty()
  service_id: number;

  @ApiProperty({ description: 'Click payment ID' })
  @IsNumber()
  @IsNotEmpty()
  click_paydoc_id: number;

  @ApiProperty({ description: 'Merchant transaction ID (order ID)' })
  @IsString()
  @IsNotEmpty()
  merchant_trans_id: string;

  @ApiProperty({ description: 'Merchant prepare ID' })
  @IsString()
  merchant_prepare_id: string;

  @ApiProperty({ description: 'Payment amount' })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ description: 'Action (0 = prepare, 1 = complete)' })
  @IsNumber()
  @IsNotEmpty()
  action: number;

  @ApiProperty({ description: 'Error code' })
  @IsNumber()
  @IsNotEmpty()
  error: number;

  @ApiProperty({ description: 'Error note' })
  @IsString()
  error_note: string;

  @ApiProperty({ description: 'Sign time (timestamp)' })
  @IsString()
  @IsNotEmpty()
  sign_time: string;

  @ApiProperty({ description: 'Sign string (MD5 hash)' })
  @IsString()
  @IsNotEmpty()
  sign_string: string;
}
