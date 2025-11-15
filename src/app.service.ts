import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'TalabaHub Backend API v1.0 - Production Ready! 🚀';
  }
}
