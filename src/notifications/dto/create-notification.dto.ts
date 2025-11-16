import { IsString, IsNotEmpty, IsOptional, IsObject, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'Notification type',
    enum: NotificationType,
    example: 'in_app',
  })
  @IsEnum(NotificationType)
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
