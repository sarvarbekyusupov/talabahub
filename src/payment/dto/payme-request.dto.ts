import { IsNotEmpty, IsNumber, IsObject, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PaymeRequestDto {
  @ApiProperty({ description: 'JSON-RPC version' })
  @IsString()
  @IsNotEmpty()
  jsonrpc: string;

  @ApiProperty({ description: 'Request ID' })
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @ApiProperty({ description: 'Method name' })
  @IsString()
  @IsNotEmpty()
  method: string;

  @ApiProperty({ description: 'Method parameters' })
  @IsObject()
  @IsNotEmpty()
  params: any;
}

export class CheckPerformTransactionParams {
  @ApiProperty({ description: 'Payment amount in tiyins (1 sum = 100 tiyins)' })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ description: 'Account details (order ID, user ID, etc.)' })
  @IsObject()
  @IsNotEmpty()
  account: Record<string, any>;
}

export class CreateTransactionParams {
  @ApiProperty({ description: 'Payme transaction ID' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Transaction time (milliseconds)' })
  @IsNumber()
  @IsNotEmpty()
  time: number;

  @ApiProperty({ description: 'Payment amount in tiyins' })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ description: 'Account details' })
  @IsObject()
  @IsNotEmpty()
  account: Record<string, any>;
}

export class PerformTransactionParams {
  @ApiProperty({ description: 'Payme transaction ID' })
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class CancelTransactionParams {
  @ApiProperty({ description: 'Payme transaction ID' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Cancellation reason code' })
  @IsNumber()
  @IsNotEmpty()
  reason: number;
}

export class CheckTransactionParams {
  @ApiProperty({ description: 'Payme transaction ID' })
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class GetStatementParams {
  @ApiProperty({ description: 'Start timestamp (milliseconds)' })
  @IsNumber()
  @IsNotEmpty()
  from: number;

  @ApiProperty({ description: 'End timestamp (milliseconds)' })
  @IsNumber()
  @IsNotEmpty()
  to: number;
}
