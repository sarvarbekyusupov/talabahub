import { IsString, IsNotEmpty, IsOptional, IsObject, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Temporary type until Prisma migration
type NotificationType = 'email' | 'sms' | 'push' | 'in_app';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'Notification type',
    enum: ['email', 'sms', 'push', 'in_app'],
    example: 'in_app',
  })
  @IsIn(['email', 'sms', 'push', 'in_app'])
  type: NotificationType;

  @ApiProperty({
    description: 'Notification title',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Notification message',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Additional data as JSON',
    required: false,
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiProperty({
    description: 'Action URL',
    required: false,
  })
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiProperty({
    description: 'Action button label',
    required: false,
  })
  @IsOptional()
  @IsString()
  actionLabel?: string;
}
