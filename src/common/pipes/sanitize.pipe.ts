import { Injectable, PipeTransform, ArgumentMetadata } from '@nestjs/common';
import * as sanitizeHtml from 'sanitize-html';

/**
 * Pipe to sanitize input data and prevent XSS attacks
 *
 * Usage:
 * @UsePipes(new SanitizePipe())
 * Or globally in main.ts
 */
@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: any, _metadata: ArgumentMetadata) {
    if (!value) return value;

    return this.sanitizeValue(value);
  }

  private sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      return sanitizeHtml(value, {
        allowedTags: [], // Remove all HTML tags
        allowedAttributes: {},
        disallowedTagsMode: 'discard',
      });
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeValue(item));
    }

    if (typeof value === 'object' && value !== null) {
      const sanitized: any = {};
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          sanitized[key] = this.sanitizeValue(value[key]);
        }
      }
      return sanitized;
    }

    return value;
  }
}
