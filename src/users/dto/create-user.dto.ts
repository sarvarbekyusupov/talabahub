import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsInt, IsEnum, IsBoolean, IsDateString } from 'class-validator';
import { UserRole } from '@prisma/client';
import { IsStrongPassword, IsUzbekName, IsUzbekPhone } from '../../common/validators/custom-validators';

export class CreateUserDto {
  @ApiProperty({ example: 'john.doe@university.uz' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @IsStrongPassword()
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsUzbekName()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsUzbekName()
  lastName: string;

  @ApiProperty({ example: 'Michael', required: false })
  @IsOptional()
  @IsString()
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
  dateOfBirth?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  universityId?: number;

  @ApiProperty({ enum: UserRole, default: UserRole.student })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
