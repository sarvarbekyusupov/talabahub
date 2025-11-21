import {
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class NotificationFilterDto {
  @ApiPropertyOptional({
    description: 'Show only unread notifications',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  unread?: boolean;

  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

export class NotificationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() type: string;
  @ApiProperty() message: string;
  @ApiProperty() isRead: boolean;
  @ApiProperty() createdAt: Date;
  @ApiPropertyOptional() actor?: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  @ApiPropertyOptional() entityType?: string;
  @ApiPropertyOptional() entityId?: string;
}

export class NotificationsListResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  notifications: NotificationResponseDto[];
  @ApiProperty() unreadCount: number;
}
