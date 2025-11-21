import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateStudentProfileDto {
  @ApiPropertyOptional({
    description: 'Bio (max 160 characters)',
    maxLength: 160,
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  bio?: string;

  @ApiPropertyOptional({
    description: 'Field of study',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fieldOfStudy?: string;

  @ApiPropertyOptional({
    description: 'Social links',
    example: { telegram: '@username', github: 'username', linkedin: 'profile-url' },
  })
  @IsOptional()
  @IsObject()
  socialLinks?: Record<string, string>;
}

export class FollowersFilterDto {
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

export class StudentProfileResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() username: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiPropertyOptional() avatarUrl?: string;
  @ApiPropertyOptional() bio?: string;
  @ApiPropertyOptional() fieldOfStudy?: string;
  @ApiPropertyOptional() socialLinks?: Record<string, string>;
  @ApiProperty() totalArticles: number;
  @ApiProperty() totalClapsReceived: number;
  @ApiProperty() totalFollowers: number;
  @ApiProperty() totalFollowing: number;
  @ApiProperty() reputationScore: number;
}

export class StudentStatsResponseDto {
  @ApiProperty() totalViews: number;
  @ApiProperty() totalClaps: number;
  @ApiProperty() totalArticles: number;
  @ApiProperty() avgClapPerArticle: number;
  @ApiPropertyOptional() topPerformingArticle?: any;
  @ApiProperty() growthOverTime: any[];
}
