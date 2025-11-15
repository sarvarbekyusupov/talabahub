import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailProducer } from './email.producer';
import { EmailConsumer } from './email.consumer';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    // Configure Bull with Redis or in-memory
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: config.get('REDIS_HOST')
          ? {
              host: config.get('REDIS_HOST') || 'localhost',
              port: config.get('REDIS_PORT') || 6379,
              password: config.get('REDIS_PASSWORD'),
            }
          : undefined, // Falls back to in-memory if no Redis configured
      }),
    }),
    // Register email queue
    BullModule.registerQueue({
      name: 'email',
    }),
    MailModule,
  ],
  providers: [EmailProducer, EmailConsumer],
  exports: [EmailProducer],
})
export class QueueModule {}
