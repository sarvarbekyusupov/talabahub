import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

/**
 * Email Producer - Adds email jobs to the queue
 *
 * Usage:
 * - Inject EmailProducer into your service
 * - Call methods to queue email jobs
 * - Jobs will be processed asynchronously by EmailConsumer
 */
@Injectable()
export class EmailProducer {
  private readonly logger = new Logger(EmailProducer.name);

  constructor(@InjectQueue('email') private emailQueue: Queue) {}

  /**
   * Queue welcome email
   */
  async sendWelcomeEmail(data: { email: string; name: string }) {
    try {
      await this.emailQueue.add('welcome', data, {
        attempts: 3, // Retry 3 times on failure
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2s delay
        },
        removeOnComplete: true,
        removeOnFail: false,
      });
      this.logger.log(`Welcome email queued for ${data.email}`);
    } catch (error) {
      this.logger.error(`Failed to queue welcome email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Queue verification email
   */
  async sendVerificationEmail(data: {
    email: string;
    name: string;
    verificationUrl: string;
  }) {
    try {
      await this.emailQueue.add('verification', data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      });
      this.logger.log(`Verification email queued for ${data.email}`);
    } catch (error) {
      this.logger.error(`Failed to queue verification email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Queue password reset email
   */
  async sendPasswordResetEmail(data: {
    email: string;
    name: string;
    resetUrl: string;
  }) {
    try {
      await this.emailQueue.add('password-reset', data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      });
      this.logger.log(`Password reset email queued for ${data.email}`);
    } catch (error) {
      this.logger.error(`Failed to queue password reset email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Queue job application confirmation
   */
  async sendJobApplicationConfirmation(data: {
    email: string;
    applicantName: string;
    jobTitle: string;
    companyName: string;
  }) {
    try {
      await this.emailQueue.add('job-application', data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      });
      this.logger.log(`Job application email queued for ${data.email}`);
    } catch (error) {
      this.logger.error(`Failed to queue job application email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Queue course enrollment confirmation
   */
  async sendCourseEnrollmentConfirmation(data: {
    email: string;
    studentName: string;
    courseName: string;
    courseUrl: string;
  }) {
    try {
      await this.emailQueue.add('course-enrollment', data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      });
      this.logger.log(`Course enrollment email queued for ${data.email}`);
    } catch (error) {
      this.logger.error(`Failed to queue course enrollment email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Queue event registration confirmation
   */
  async sendEventRegistrationConfirmation(data: {
    email: string;
    attendeeName: string;
    eventName: string;
    eventDate: string;
    eventLocation: string;
  }) {
    try {
      await this.emailQueue.add('event-registration', data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      });
      this.logger.log(`Event registration email queued for ${data.email}`);
    } catch (error) {
      this.logger.error(`Failed to queue event registration email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Queue event reminder email
   */
  async sendEventReminder(data: {
    email: string;
    attendeeName: string;
    eventName: string;
    eventDate: string;
    eventLocation: string;
  }) {
    try {
      await this.emailQueue.add(
        'event-reminder',
        data,
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
          delay: this.calculateEventReminderDelay(data.eventDate), // Send 1 day before
        }
      );
      this.logger.log(`Event reminder scheduled for ${data.email}`);
    } catch (error) {
      this.logger.error(`Failed to queue event reminder: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate delay for event reminder (1 day before event)
   */
  private calculateEventReminderDelay(eventDate: string): number {
    const event = new Date(eventDate);
    const oneDayBefore = new Date(event.getTime() - 24 * 60 * 60 * 1000);
    const now = new Date();
    const delay = oneDayBefore.getTime() - now.getTime();
    return delay > 0 ? delay : 0;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const waiting = await this.emailQueue.getWaitingCount();
    const active = await this.emailQueue.getActiveCount();
    const completed = await this.emailQueue.getCompletedCount();
    const failed = await this.emailQueue.getFailedCount();
    const delayed = await this.emailQueue.getDelayedCount();

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }
}
