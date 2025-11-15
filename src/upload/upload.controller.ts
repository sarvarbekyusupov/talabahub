import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Body,
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
}
