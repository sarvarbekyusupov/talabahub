import { IsString, IsNotEmpty, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBlogPostStatusDto {
  @ApiProperty({
    description: 'Blog post status',
    enum: ['draft', 'published'],
    example: 'published',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['draft', 'published'], {
    message: 'Status must be either "draft" or "published"',
  })
  status: string;
}
