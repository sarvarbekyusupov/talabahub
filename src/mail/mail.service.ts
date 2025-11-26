import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Send email verification link
   */
  async sendEmailVerification(email: string, token: string, name: string) {
    const verificationUrl = `${this.configService.get('FRONTEND_URL')}/verify-email/${token}`;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'TalabaHub - Email Verification',
        template: './verification',
        context: {
          name,
          verificationUrl,
        },
      });
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error.stack);
      throw error;
    }
  }

  /**
   * Send welcome email after successful registration
   */
  async sendWelcomeEmail(email: string, name: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Welcome to TalabaHub!',
        template: './welcome',
        context: {
          name,
          loginUrl: `${this.configService.get('FRONTEND_URL')}/login`,
        },
      });
      this.logger.log(`Welcome email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}`, error.stack);
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email: string, token: string, name: string) {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password/${token}`;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'TalabaHub - Password Reset Request',
        template: './password-reset',
        context: {
          name,
          resetUrl,
        },
      });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}`, error.stack);
      throw error;
    }
  }

  /**
   * Send job application confirmation
   */
  async sendJobApplicationConfirmation(
    email: string,
    name: string,
    jobTitle: string,
    companyName: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Application Received - ${jobTitle}`,
        template: './job-application',
        context: {
          name,
          jobTitle,
          companyName,
          dashboardUrl: `${this.configService.get('FRONTEND_URL')}/dashboard/applications`,
        },
      });
      this.logger.log(`Job application confirmation sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send job application email to ${email}`, error.stack);
    }
  }

  /**
   * Send job application status update
   */
  async sendApplicationStatusUpdate(
    email: string,
    name: string,
    jobTitle: string,
    status: string,
    notes?: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Application Update - ${jobTitle}`,
        template: './application-status',
        context: {
          name,
          jobTitle,
          status,
          notes,
          dashboardUrl: `${this.configService.get('FRONTEND_URL')}/dashboard/applications`,
        },
      });
      this.logger.log(`Application status email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send application status email to ${email}`, error.stack);
    }
  }

  /**
   * Send course enrollment confirmation
   */
  async sendCourseEnrollmentConfirmation(
    email: string,
    name: string,
    courseTitle: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Enrollment Confirmed - ${courseTitle}`,
        template: './course-enrollment',
        context: {
          name,
          courseTitle,
          coursesUrl: `${this.configService.get('FRONTEND_URL')}/dashboard/courses`,
        },
      });
      this.logger.log(`Course enrollment confirmation sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send course enrollment email to ${email}`, error.stack);
    }
  }

  /**
   * Send course completion certificate
   */
  async sendCourseCompletionCertificate(
    email: string,
    name: string,
    courseTitle: string,
    certificateUrl: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Certificate - ${courseTitle}`,
        template: './course-completion',
        context: {
          name,
          courseTitle,
          certificateUrl,
        },
      });
      this.logger.log(`Course completion certificate sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send course completion email to ${email}`, error.stack);
    }
  }

  /**
   * Send event registration confirmation
   */
  async sendEventRegistrationConfirmation(
    email: string,
    name: string,
    eventTitle: string,
    eventDate: Date,
    location?: string,
    meetingLink?: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Event Registration - ${eventTitle}`,
        template: './event-registration',
        context: {
          name,
          eventTitle,
          eventDate: eventDate.toLocaleDateString(),
          eventTime: eventDate.toLocaleTimeString(),
          location,
          meetingLink,
          eventsUrl: `${this.configService.get('FRONTEND_URL')}/dashboard/events`,
        },
      });
      this.logger.log(`Event registration confirmation sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send event registration email to ${email}`, error.stack);
    }
  }

  /**
   * Send event reminder (1 day before)
   */
  async sendEventReminder(
    email: string,
    name: string,
    eventTitle: string,
    eventDate: Date,
    location?: string,
    meetingLink?: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Reminder: ${eventTitle} Tomorrow!`,
        template: './event-reminder',
        context: {
          name,
          eventTitle,
          eventDate: eventDate.toLocaleDateString(),
          eventTime: eventDate.toLocaleTimeString(),
          location,
          meetingLink,
        },
      });
      this.logger.log(`Event reminder sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send event reminder to ${email}`, error.stack);
    }
  }

  /**
   * Send interview invitation
   */
  async sendInterviewInvitation(
    email: string,
    name: string,
    jobTitle: string,
    companyName: string,
    interviewDate: Date,
    location?: string,
    notes?: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Interview Invitation - ${jobTitle}`,
        template: './interview-invitation',
        context: {
          name,
          jobTitle,
          companyName,
          interviewDate: interviewDate.toLocaleDateString(),
          interviewTime: interviewDate.toLocaleTimeString(),
          location,
          notes,
        },
      });
      this.logger.log(`Interview invitation sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send interview invitation to ${email}`, error.stack);
    }
  }

  /**
   * Send new discount notification
   */
  async sendNewDiscountNotification(
    email: string,
    name: string,
    discountTitle: string,
    brandName: string,
    discountValue: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `New Discount Available - ${brandName}`,
        template: './new-discount',
        context: {
          name,
          discountTitle,
          brandName,
          discountValue,
          discountsUrl: `${this.configService.get('FRONTEND_URL')}/discounts`,
        },
      });
      this.logger.log(`New discount notification sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send discount notification to ${email}`, error.stack);
    }
  }

  /**
   * Send verification approval email
   */
  async sendVerificationApproved(
    email: string,
    name: string,
    validUntil?: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: '🎉 Your Student Verification Has Been Approved!',
        template: './verification-approved',
        context: {
          name,
          dashboardUrl: `${this.configService.get('FRONTEND_URL')}/dashboard`,
          validUntil: validUntil || 'Your graduation date',
        },
      });
      this.logger.log(`Verification approval email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification approval email to ${email}`, error.stack);
    }
  }

  /**
   * Send verification rejection email
   */
  async sendVerificationRejected(
    email: string,
    name: string,
    rejectionReason: string,
    additionalNotes?: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Update on Your Student Verification',
        template: './verification-rejected',
        context: {
          name,
          rejectionReason,
          additionalNotes,
          resubmitUrl: `${this.configService.get('FRONTEND_URL')}/verification`,
          supportUrl: `${this.configService.get('FRONTEND_URL')}/support`,
        },
      });
      this.logger.log(`Verification rejection email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification rejection email to ${email}`, error.stack);
    }
  }

  /**
   * Send verification - more info needed email
   */
  async sendVerificationMoreInfo(
    email: string,
    name: string,
    message: string,
    specificRequirements?: string[],
  ) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Action Required: Additional Information for Verification',
        template: './verification-more-info',
        context: {
          name,
          message,
          specificRequirements,
          dashboardUrl: `${this.configService.get('FRONTEND_URL')}/verification`,
          supportUrl: `${this.configService.get('FRONTEND_URL')}/support`,
        },
      });
      this.logger.log(`Verification more info email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification more info email to ${email}`, error.stack);
    }
  }

  /**
   * Send re-verification required email
   */
  async sendReverificationRequired(
    email: string,
    name: string,
    reason: string,
    dueDate: Date,
  ) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Re-verification Required - Student Status',
        template: './verification-more-info',
        context: {
          name,
          message: `Your student verification requires renewal. Reason: ${reason}`,
          specificRequirements: [
            'Upload a current student ID',
            'Provide proof of current enrollment',
            'Update your expected graduation date'
          ],
          dashboardUrl: `${this.configService.get('FRONTEND_URL')}/verification`,
          supportUrl: `${this.configService.get('FRONTEND_URL')}/support`,
        },
      });
      this.logger.log(`Re-verification required email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send re-verification email to ${email}`, error.stack);
    }
  }

  /**
   * Send verification expired notification
   */
  async sendVerificationExpired(email: string, name: string, message: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Your Student Verification Has Expired - TalabaHub',
        template: './verification-expired',
        context: {
          name,
          message,
          dashboardUrl: `${this.configService.get('FRONTEND_URL')}/verification`,
          supportUrl: `${this.configService.get('FRONTEND_URL')}/support`,
          currentYear: new Date().getFullYear(),
        },
      });
      this.logger.log(`Verification expired email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification expired email to ${email}`, error.stack);
    }
  }

  /**
   * Send verification expiring soon reminder
   */
  async sendVerificationExpiringSoon(
    email: string,
    name: string,
    expirationDate: string,
    message: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Your Student Verification Is Expiring Soon - TalabaHub',
        template: './verification-expiring-soon',
        context: {
          name,
          expirationDate,
          message,
          dashboardUrl: `${this.configService.get('FRONTEND_URL')}/verification`,
          supportUrl: `${this.configService.get('FRONTEND_URL')}/support`,
          currentYear: new Date().getFullYear(),
        },
      });
      this.logger.log(`Verification expiring soon email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification expiring soon email to ${email}`, error.stack);
    }
  }

  /**
   * Send grace period started notification
   */
  async sendGracePeriodStarted(
    email: string,
    name: string,
    gracePeriodEnds: string,
    reason: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Grace Period Granted - TalabaHub',
        template: './grace-period-started',
        context: {
          name,
          gracePeriodEnds,
          reason,
          dashboardUrl: `${this.configService.get('FRONTEND_URL')}/verification`,
          supportUrl: `${this.configService.get('FRONTEND_URL')}/support`,
          currentYear: new Date().getFullYear(),
        },
      });
      this.logger.log(`Grace period started email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send grace period started email to ${email}`, error.stack);
    }
  }

  /**
   * Send grace period extended notification
   */
  async sendGracePeriodExtended(
    email: string,
    name: string,
    newGracePeriodEnds: string,
    reason: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Grace Period Extended - TalabaHub',
        template: './grace-period-extended',
        context: {
          name,
          newGracePeriodEnds,
          reason,
          dashboardUrl: `${this.configService.get('FRONTEND_URL')}/verification`,
          supportUrl: `${this.configService.get('FRONTEND_URL')}/support`,
          currentYear: new Date().getFullYear(),
        },
      });
      this.logger.log(`Grace period extended email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send grace period extended email to ${email}`, error.stack);
    }
  }
}
