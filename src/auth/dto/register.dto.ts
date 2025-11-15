import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsInt, IsEnum, IsDateString } from 'class-validator';
import { UserRole } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'john.doe@university.uz' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: 'Michael', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  middleName?: string;

  @ApiProperty({ example: '+998901234567', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '2000-01-15', required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ example: 'male', required: false })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  universityId?: number;

  @ApiProperty({ example: 'ST12345', required: false })
  @IsOptional()
  @IsString()
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
