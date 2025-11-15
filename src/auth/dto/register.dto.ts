import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsInt, IsEnum, IsDateString } from 'class-validator';
import { UserRole } from '@prisma/client';
import {
  IsStrongPassword,
  IsUzbekName,
  IsUzbekPhone,
  IsPastDate,
  IsAgeInRange,
  IsStudentId,
} from '../../common/validators/custom-validators';

export class RegisterDto {
  @ApiProperty({ example: 'john.doe@university.uz' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @IsStrongPassword()
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsUzbekName()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsUzbekName()
  lastName: string;

  @ApiProperty({ example: 'Michael', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @IsUzbekName()
  middleName?: string;

  @ApiProperty({ example: '+998901234567', required: false })
  @IsOptional()
  @IsString()
  @IsUzbekPhone()
  phone?: string;

  @ApiProperty({ example: '2000-01-15', required: false })
  @IsOptional()
  @IsDateString()
  @IsPastDate()
  @IsAgeInRange(16, 100)
  dateOfBirth?: string;

  @ApiProperty({ example: 'male', required: false })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  universityId?: number;

  @ApiProperty({ example: 'S12345678', required: false })
  @IsOptional()
  @IsString()
  @IsStudentId()
  studentIdNumber?: string;

  @ApiProperty({ example: 'Computer Science', required: false })
  @IsOptional()
  @IsString()
  faculty?: string;

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  @IsInt()
  courseYear?: number;

  @ApiProperty({ example: 2025, required: false })
  @IsOptional()
  @IsInt()
  graduationYear?: number;

  @ApiProperty({ enum: UserRole, default: UserRole.student })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ example: 'ABC123', required: false, description: 'Referral code from another user' })
  @IsOptional()
  @IsString()
  referredByCode?: string;
}
