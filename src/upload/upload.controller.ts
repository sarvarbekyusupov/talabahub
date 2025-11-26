import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload image file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Image file (JPEG, PNG, WebP - max 5MB)',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          description: 'Optional folder name',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Image uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    const result = await this.uploadService.uploadImage(file, folder);
    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
    };
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Avatar image (JPEG, PNG, WebP - max 5MB)',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Avatar uploaded successfully' })
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    const url = await this.uploadService.uploadAvatar(file, user.id);
    return { url };
  }

  @Post('document')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload document (CV, certificate, etc.)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Document file (PDF, DOC, DOCX - max 10MB)',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          description: 'Optional folder name',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    const url = await this.uploadService.uploadDocument(file, folder);
    return { url };
  }

  @Post('logo')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload logo (company, brand, university)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Logo image (JPEG, PNG, WebP - max 5MB)',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        entityId: {
          type: 'string',
          description: 'ID of the entity (company, brand, etc.)',
        },
        type: {
          type: 'string',
          description: 'Type: company, brand, university, partner',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Logo uploaded successfully' })
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File,
    @Body('entityId') entityId: string,
    @Body('type') type: string,
  ) {
    const url = await this.uploadService.uploadLogo(file, entityId, type);
    return { url };
  }

  @Post('banner')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload banner/cover image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Banner image (JPEG, PNG, WebP - max 5MB)',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          description: 'Folder name (events, courses, etc.)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Banner uploaded successfully' })
  async uploadBanner(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder: string,
  ) {
    const url = await this.uploadService.uploadBanner(file, `talabahub/${folder}`);
    return { url };
  }

  @Post('verification-document')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload verification document (student ID, certificate, etc.)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Verification document (Image or PDF - max 10MB)',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        documentType: {
          type: 'string',
          enum: ['student_id_front', 'student_id_back', 'enrollment_certificate', 'payment_receipt', 'other'],
          description: 'Type of verification document',
        },
        requestId: {
          type: 'string',
          format: 'uuid',
          description: 'Verification request ID (optional, creates temporary upload if not provided)',
        },
      },
      required: ['file', 'documentType'],
    },
  })
  @ApiResponse({ status: 201, description: 'Verification document uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  async uploadVerificationDocument(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
    @Body('documentType') documentType: string,
    @Body('requestId') requestId?: string,
  ) {
    // Enhanced validation for verification documents
    this.validateVerificationDocument(file);

    // Store in verification-specific folder with user ID for organization
    const folder = `talabahub/verification/${user.id}/${requestId || 'temp'}`;
    const url = await this.uploadService.uploadDocument(file, folder);

    return {
      url,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      documentType,
      uploadedAt: new Date().toISOString(),
    };
  }

  @Post('verification-image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload verification image (optimized for ID photos)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Verification image (JPEG, PNG, WebP - max 5MB)',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        documentType: {
          type: 'string',
          enum: ['student_id_front', 'student_id_back', 'enrollment_certificate', 'payment_receipt', 'other'],
          description: 'Type of verification document',
        },
        requestId: {
          type: 'string',
          format: 'uuid',
          description: 'Verification request ID (optional)',
        },
      },
      required: ['file', 'documentType'],
    },
  })
  @ApiResponse({ status: 201, description: 'Verification image uploaded and optimized successfully' })
  async uploadVerificationImage(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
    @Body('documentType') documentType: string,
    @Body('requestId') requestId?: string,
  ) {
    // Enhanced validation for verification images
    this.validateVerificationImage(file);

    // Store in verification-specific folder with user ID for organization
    const folder = `talabahub/verification/${user.id}/${requestId || 'temp'}`;

    // Optimize for ID photos with specific settings
    const result = await this.uploadService.uploadOptimizedImage(file, folder, {
      width: 2000, // Higher resolution for ID verification
      height: 1500,
      quality: 85, // Good quality for ID verification
      format: 'jpeg', // Consistent format
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      originalFilename: file.originalname,
      mimeType: 'image/jpeg',
      fileSize: result.bytes || file.size,
      documentType,
      uploadedAt: new Date().toISOString(),
      dimensions: {
        width: result.width,
        height: result.height,
      },
    };
  }

  private validateVerificationDocument(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Accept both images and PDFs for verification documents
    const allowedMimeTypes = [
      // Image formats
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      // Document formats
      'application/pdf',
    ];

    const maxSize = 10 * 1024 * 1024; // 10MB for verification docs

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, WebP images and PDF documents are allowed for verification',
      );
    }

    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit for verification documents');
    }
  }

  private validateVerificationImage(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB for images

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, and WebP images are allowed for verification',
      );
    }

    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 5MB limit for verification images');
    }

    // Note: File dimensions will be validated during upload optimization
    // Express.Multer.File doesn't include dimensions by default
  }
}
