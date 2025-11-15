import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private readonly configService: ConfigService) {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * Upload image to Cloudinary
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'talabahub',
  ): Promise<UploadApiResponse> {
    this.validateImageFile(file);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 1920, height: 1080, crop: 'limit' }, // Max dimensions
            { quality: 'auto:good' }, // Auto quality optimization
            { fetch_format: 'auto' }, // Auto format (webp, avif, etc)
          ],
        },
        (error: UploadApiErrorResponse, result: UploadApiResponse) => {
          if (error) {
            this.logger.error('Cloudinary upload failed', error);
            return reject(new BadRequestException('Failed to upload image'));
          }
          this.logger.log(`Image uploaded successfully: ${result.public_id}`);
          resolve(result);
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Upload avatar/profile picture (smaller size)
   */
  async uploadAvatar(file: Express.Multer.File, userId: string): Promise<string> {
    this.validateImageFile(file);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'talabahub/avatars',
          public_id: `avatar_${userId}`,
          overwrite: true,
          resource_type: 'image',
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
          ],
        },
        (error: UploadApiErrorResponse, result: UploadApiResponse) => {
          if (error) {
            this.logger.error('Avatar upload failed', error);
            return reject(new BadRequestException('Failed to upload avatar'));
          }
          this.logger.log(`Avatar uploaded: ${result.public_id}`);
          resolve(result.secure_url);
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Upload document (PDF, DOCX, etc.)
   */
  async uploadDocument(
    file: Express.Multer.File,
    folder: string = 'talabahub/documents',
  ): Promise<string> {
    this.validateDocumentFile(file);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'raw',
          format: file.mimetype.split('/')[1],
        },
        (error: UploadApiErrorResponse, result: UploadApiResponse) => {
          if (error) {
            this.logger.error('Document upload failed', error);
            return reject(new BadRequestException('Failed to upload document'));
          }
          this.logger.log(`Document uploaded: ${result.public_id}`);
          resolve(result.secure_url);
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Upload logo (company, brand, etc.)
   */
  async uploadLogo(file: Express.Multer.File, entityId: string, type: string): Promise<string> {
    this.validateImageFile(file);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `talabahub/logos/${type}`,
          public_id: `logo_${entityId}`,
          overwrite: true,
          resource_type: 'image',
          transformation: [
            { width: 800, height: 800, crop: 'limit' },
            { quality: 'auto:best' },
            { fetch_format: 'auto' },
          ],
        },
        (error: UploadApiErrorResponse, result: UploadApiResponse) => {
          if (error) {
            this.logger.error('Logo upload failed', error);
            return reject(new BadRequestException('Failed to upload logo'));
          }
          this.logger.log(`Logo uploaded: ${result.public_id}`);
          resolve(result.secure_url);
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Upload banner/cover image
   */
  async uploadBanner(file: Express.Multer.File, folder: string): Promise<string> {
    this.validateImageFile(file);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 1920, height: 600, crop: 'fill' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
          ],
        },
        (error: UploadApiErrorResponse, result: UploadApiResponse) => {
          if (error) {
            this.logger.error('Banner upload failed', error);
            return reject(new BadRequestException('Failed to upload banner'));
          }
          this.logger.log(`Banner uploaded: ${result.public_id}`);
          resolve(result.secure_url);
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Delete file from Cloudinary
   */
  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
      this.logger.log(`File deleted: ${publicId}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${publicId}`, error);
      throw new BadRequestException('Failed to delete file');
    }
  }

  /**
   * Validate image file
   */
  private validateImageFile(file: Express.Multer.File): void {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, and WebP images are allowed',
      );
    }

    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }
  }

  /**
   * Validate document file
   */
  private validateDocumentFile(file: Express.Multer.File): void {
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only PDF and Word documents are allowed',
      );
    }

    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }
  }
}
