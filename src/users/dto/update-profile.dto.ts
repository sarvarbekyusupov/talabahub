import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, IsDateString, IsJSON } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  universityId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  studentIdNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  studentIdPhoto?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  faculty?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  courseYear?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  graduationYear?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  preferredLanguage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsJSON()
  notificationPreferences?: any;
}
