import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ResumesController } from './controllers/resumes.controller';
import { ResumesService } from './services/resumes.service';

@Module({
  imports: [PrismaModule],
  controllers: [ResumesController],
  providers: [ResumesService],
  exports: [ResumesService],
})
export class ResumesModule {}