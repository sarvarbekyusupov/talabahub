import { IsString, IsNotEmpty, IsObject, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum SavedSearchType {
  JOB = 'job',
  EVENT = 'event',
  COURSE = 'course',
  DISCOUNT = 'discount',
}

export class CreateSavedSearchDto {
  @ApiProperty({
    description: 'Name of the saved search',
    example: 'High Paying Tech Jobs',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Type of saved search',
    enum: SavedSearchType,
    example: SavedSearchType.JOB,
  })
  @IsEnum(SavedSearchType)
  type: SavedSearchType;

  @ApiProperty({
    description: 'Filter criteria as JSON object',
    example: {
      minSalary: 5000000,
      maxSalary: 10000000,
      location: 'Tashkent',
      jobType: 'full_time',
      isRemote: true,
    },
  })
  @IsObject()
  filters: Record<string, any>;
}
