import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Review {
  @ApiProperty({
    description: 'Unique review ID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  id: string;

  @ApiProperty({
    description: 'User ID who wrote the review',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  userId: string;

  @ApiProperty({
    description: 'Type of reviewable item',
    enum: ['brand', 'course', 'education-partner', 'company'],
    example: 'brand',
  })
  reviewableType: string;

  @ApiProperty({
    description: 'ID of the reviewable item',
    example: '123',
  })
  reviewableId: string;

  @ApiProperty({
    description: 'Rating from 1 to 5',
    minimum: 1,
    maximum: 5,
    example: 4,
  })
  rating: number;

  @ApiPropertyOptional({
    description: 'Title of the review',
    example: 'Great experience with this brand',
  })
  title?: string;

  @ApiPropertyOptional({
    description: 'Detailed review comment',
    example: 'I had an excellent experience...',
  })
  comment?: string;

  @ApiPropertyOptional({
    description: 'Pros of the reviewed item',
    example: 'Great quality, fast delivery',
  })
  pros?: string;

  @ApiPropertyOptional({
    description: 'Cons of the reviewed item',
    example: 'Expensive compared to competitors',
  })
  cons?: string;

  @ApiProperty({
    description: 'Whether the review is from a verified buyer',
    example: true,
  })
  isVerified: boolean;

  @ApiProperty({
    description: 'Whether the review is anonymous',
    example: false,
  })
  isAnonymous: boolean;

  @ApiProperty({
    description: 'Whether the review is approved',
    example: true,
  })
  isApproved: boolean;

  @ApiPropertyOptional({
    description: 'Moderation notes from admin',
    example: 'Review approved. Meets community guidelines.',
  })
  moderationNotes?: string;

  @ApiProperty({
    description: 'Number of users who marked this as helpful',
    example: 42,
  })
  helpfulCount: number;

  @ApiProperty({
    description: 'Timestamp when review was created',
    example: '2023-11-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when review was last updated',
    example: '2023-11-15T10:30:00Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'User details (without sensitive info)',
    example: {
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      firstName: 'John',
      lastName: 'Doe',
      avatarUrl: 'https://example.com/avatar.jpg',
    },
  })
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
}
