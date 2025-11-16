import { IsString, IsNotEmpty, IsOptional, IsObject, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum NotificationType {
  JOB_ALERT = 'job_alert',
  JOB_APPLICATION_STATUS = 'job_application_status',
  COURSE_ENROLLMENT = 'course_enrollment',
  EVENT_REGISTRATION = 'event_registration',
  DISCOUNT_ALERT = 'discount_alert',
  SYSTEM = 'system',
}

export class CreateNotificationDto {
  @ApiProperty({
    description: 'Notification type',
    enum: NotificationType,
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
