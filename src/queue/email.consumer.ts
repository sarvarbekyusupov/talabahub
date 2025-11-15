import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { MailService } from '../mail/mail.service';

/**
 * Email Consumer - Processes email jobs from the queue
 *
 * Jobs are processed asynchronously in the background
 * Failed jobs will be retried automatically
 */
@Processor('email')
export class EmailConsumer {
  private readonly logger = new Logger(EmailConsumer.name);

  constructor(private readonly mailService: MailService) {}

  /**
   * Process welcome email job
   */
  @Process('welcome')
  async handleWelcomeEmail(job: Job) {
    this.logger.log(`Processing welcome email job ${job.id}`);
    try {
      await this.mailService.sendWelcomeEmail(job.data.email, job.data.name);
      this.logger.log(`Welcome email sent to ${job.data.email}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send welcome email: ${error.message}`);
      throw error; // Will trigger retry
    }
  }

  /**
   * Process verification email job
   */
  @Process('verification')
  async handleVerificationEmail(job: Job) {
    this.logger.log(`Processing verification email job ${job.id}`);
    try {
      await this.mailService.sendEmailVerification(
        job.data.email,
        job.data.verificationUrl,
        job.data.name,
      );
      this.logger.log(`Verification email sent to ${job.data.email}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send verification email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process password reset email job
   */
  @Process('password-reset')
  async handlePasswordResetEmail(job: Job) {
    this.logger.log(`Processing password reset email job ${job.id}`);
    try {
      await this.mailService.sendPasswordReset(
        job.data.email,
        job.data.resetUrl,
        job.data.name,
      );
      this.logger.log(`Password reset email sent to ${job.data.email}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send password reset email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process job application confirmation
   */
  @Process('job-application')
  async handleJobApplicationEmail(job: Job) {
    this.logger.log(`Processing job application email job ${job.id}`);
    try {
      await this.mailService.sendJobApplicationConfirmation(
        job.data.email,
        job.data.applicantName,
        job.data.jobTitle,
        job.data.companyName,
      );
      this.logger.log(`Job application email sent to ${job.data.email}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send job application email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process course enrollment confirmation
   */
  @Process('course-enrollment')
  async handleCourseEnrollmentEmail(job: Job) {
    this.logger.log(`Processing course enrollment email job ${job.id}`);
    try {
      await this.mailService.sendCourseEnrollmentConfirmation(
        job.data.email,
        job.data.studentName,
        job.data.courseName,
      );
      this.logger.log(`Course enrollment email sent to ${job.data.email}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send course enrollment email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process event registration confirmation
   */
  @Process('event-registration')
  async handleEventRegistrationEmail(job: Job) {
    this.logger.log(`Processing event registration email job ${job.id}`);
    try {
      await this.mailService.sendEventRegistrationConfirmation(
        job.data.email,
        job.data.attendeeName,
        job.data.eventName,
        job.data.eventDate,
        job.data.eventLocation,
      );
      this.logger.log(`Event registration email sent to ${job.data.email}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send event registration email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process event reminder email
   */
  @Process('event-reminder')
  async handleEventReminderEmail(job: Job) {
    this.logger.log(`Processing event reminder email job ${job.id}`);
    try {
      await this.mailService.sendEventReminder(
        job.data.email,
        job.data.attendeeName,
        job.data.eventName,
        job.data.eventDate,
        job.data.eventLocation,
      );
      this.logger.log(`Event reminder email sent to ${job.data.email}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send event reminder email: ${error.message}`);
      throw error;
    }
  }
}
