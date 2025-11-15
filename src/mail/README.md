# Mail Module

Professional email service with Handlebars templates for TalabaHub backend.

## Overview

The Mail module provides email functionality using @nestjs-modules/mailer with Handlebars template engine.

### Features

✅ SMTP email delivery
✅ 11 professional HTML email templates
✅ Handlebars template engine
✅ Dynamic content injection
✅ Responsive email design
✅ Error handling and logging

## Installation

Already included in the project. Dependencies:
- `@nestjs-modules/mailer`
- `nodemailer`
- `handlebars`

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
# Email Configuration
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=noreply@talabahub.uz
```

### Gmail Setup

1. Enable 2-factor authentication
2. Generate App Password:
   - Go to Google Account → Security
   - 2-Step Verification → App passwords
   - Select "Mail" and generate password
3. Use generated password in `MAIL_PASSWORD`

## Usage

### Inject MailService

```typescript
import { MailService } from './mail/mail.service';

@Injectable()
export class YourService {
  constructor(private readonly mailService: MailService) {}
}
```

## Email Templates

### 1. Email Verification

Send verification email after registration:

```typescript
await this.mailService.sendEmailVerification(
  user.email,
  user.name,
  'https://talabahub.uz/verify?token=abc123'
);
```

**Template**: `verification.hbs`

### 2. Welcome Email

Send welcome email after email verification:

```typescript
await this.mailService.sendWelcomeEmail(
  user.email,
  user.name
);
```

**Template**: `welcome.hbs`

### 3. Password Reset

Send password reset link:

```typescript
await this.mailService.sendPasswordReset(
  user.email,
  user.name,
  'https://talabahub.uz/reset-password?token=xyz789'
);
```

**Template**: `password-reset.hbs`

### 4. Job Application Confirmation

Notify student that application was received:

```typescript
await this.mailService.sendJobApplicationConfirmation(
  student.email,
  student.name,
  job.title,
  company.name
);
```

**Template**: `job-application.hbs`

### 5. Application Status Update

Notify when application status changes:

```typescript
await this.mailService.sendApplicationStatusUpdate(
  student.email,
  student.name,
  job.title,
  company.name,
  'shortlisted',  // or 'rejected', 'accepted'
  'You have been selected for interview'
);
```

**Template**: `application-status.hbs`

### 6. Course Enrollment Confirmation

Notify student of successful enrollment:

```typescript
await this.mailService.sendCourseEnrollmentConfirmation(
  student.email,
  student.name,
  course.title,
  partner.name,
  new Date('2025-12-01'),  // Start date
  'https://talabahub.uz/courses/course-123'
);
```

**Template**: `course-enrollment.hbs`

### 7. Course Completion Certificate

Send certificate download link:

```typescript
await this.mailService.sendCourseCompletionCertificate(
  student.email,
  student.name,
  course.title,
  'https://talabahub.uz/certificates/cert-123.pdf'
);
```

**Template**: `course-completion.hbs`

### 8. Event Registration Confirmation

Confirm event registration:

```typescript
await this.mailService.sendEventRegistrationConfirmation(
  student.email,
  student.name,
  event.title,
  new Date(event.startDate),
  event.location,
  'https://talabahub.uz/events/event-123'
);
```

**Template**: `event-registration.hbs`

### 9. Event Reminder

Send reminder 1 day before event:

```typescript
await this.mailService.sendEventReminder(
  student.email,
  student.name,
  event.title,
  new Date(event.startDate),
  event.location
);
```

**Template**: `event-reminder.hbs`

### 10. Interview Invitation

Invite candidate for interview:

```typescript
await this.mailService.sendInterviewInvitation(
  student.email,
  student.name,
  job.title,
  company.name,
  new Date('2025-11-20T10:00:00'),
  'Microsoft Teams',
  'https://teams.microsoft.com/join/abc123'
);
```

**Template**: `interview-invitation.hbs`

### 11. New Discount Notification

Notify students of new discounts:

```typescript
await this.mailService.sendNewDiscountNotification(
  student.email,
  student.name,
  discount.title,
  brand.name,
  discount.percentage,  // or null for fixed amount
  discount.fixedAmount, // or null for percentage
  new Date(discount.expiresAt),
  'https://talabahub.uz/discounts/discount-123'
);
```

**Template**: `new-discount.hbs`

## Template Structure

All templates follow this structure:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
  <style>
    /* Inline CSS for email compatibility */
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>TalabaHub</h1>
    </div>

    <div class="content">
      <!-- Dynamic content here -->
    </div>

    <div class="footer">
      <p>&copy; 2025 TalabaHub. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
```

## Customizing Templates

Templates are located in `src/mail/templates/`. To customize:

1. Edit the `.hbs` file
2. Use Handlebars syntax for dynamic content:
   ```handlebars
   <p>Hello {{name}},</p>
   <p>Your verification code is: {{code}}</p>
   ```

## Error Handling

All email methods include error handling:

```typescript
try {
  await this.mailService.sendWelcomeEmail(email, name);
  this.logger.log(`Welcome email sent to ${email}`);
} catch (error) {
  this.logger.error(`Failed to send email to ${email}`, error.stack);
  // Email failure doesn't block the operation
}
```

## Testing Emails

### Development Testing

Use a service like [Mailtrap](https://mailtrap.io/):

```bash
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USER=your-mailtrap-username
MAIL_PASSWORD=your-mailtrap-password
```

### Preview Templates

To preview templates locally:

```typescript
// In a test file
const template = fs.readFileSync(
  './src/mail/templates/welcome.hbs',
  'utf-8'
);

const compiled = handlebars.compile(template);
const html = compiled({ name: 'Test User' });

console.log(html);
```

## Best Practices

### 1. Async/Await Pattern

Always use async/await:

```typescript
try {
  await this.mailService.sendWelcomeEmail(user.email, user.name);
} catch (error) {
  this.logger.error('Email failed', error.stack);
}
```

### 2. Don't Block Operations

Email sending should not block critical operations:

```typescript
// ✅ Good - Fire and forget
this.mailService.sendWelcomeEmail(user.email, user.name)
  .catch(err => this.logger.error('Email failed', err));

// Continue with user registration
return user;
```

### 3. Validate Email Addresses

Before sending, validate email:

```typescript
import { IsEmail } from 'class-validator';

if (!email || !email.includes('@')) {
  this.logger.warn(`Invalid email: ${email}`);
  return;
}
```

### 4. Rate Limiting

Be mindful of SMTP rate limits:
- Gmail: 500 emails/day for free accounts
- Consider using a service like SendGrid for production

### 5. Unsubscribe Links

Add unsubscribe links for marketing emails:

```handlebars
<p>
  Don't want to receive these emails?
  <a href="{{unsubscribeUrl}}">Unsubscribe</a>
</p>
```

## Production Setup

### Using SendGrid

```bash
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USER=apikey
MAIL_PASSWORD=your-sendgrid-api-key
```

### Using AWS SES

```bash
MAIL_HOST=email-smtp.us-east-1.amazonaws.com
MAIL_PORT=587
MAIL_USER=your-smtp-username
MAIL_PASSWORD=your-smtp-password
```

### Using Custom SMTP

```bash
MAIL_HOST=mail.yourdomain.com
MAIL_PORT=587
MAIL_USER=noreply@yourdomain.com
MAIL_PASSWORD=your-password
```

## Monitoring

### Email Delivery Tracking

```typescript
await this.mailService.sendWelcomeEmail(email, name);

// Log successful send
this.logger.logEmailSent(email, 'Welcome Email', true);
```

### Failed Emails

```typescript
try {
  await this.mailService.sendEmail(...);
} catch (error) {
  this.logger.logEmailSent(email, 'Welcome Email', false);

  // Store failed email for retry
  await this.saveFailedEmail({
    to: email,
    subject: 'Welcome Email',
    error: error.message
  });
}
```

## Troubleshooting

### Emails Not Sending

**Issue**: Emails not being sent

**Solutions**:
1. Check SMTP credentials in `.env`
2. Verify SMTP server is reachable
3. Check spam folder
4. Review logs for errors
5. Test with Mailtrap first

### Gmail "Less Secure App" Error

**Issue**: Gmail rejects connection

**Solution**: Use App Password (see Configuration section)

### Template Not Found

**Issue**: Template file not found error

**Solution**:
Verify template path in `mail.module.ts`:

```typescript
template: {
  dir: join(__dirname, 'templates'),
  adapter: new HandlebarsAdapter(),
  options: {
    strict: true,
  },
},
```

## API Reference

### MailService Methods

All methods return `Promise<void>` and may throw errors.

```typescript
class MailService {
  sendEmailVerification(email: string, name: string, verificationLink: string): Promise<void>

  sendWelcomeEmail(email: string, name: string): Promise<void>

  sendPasswordReset(email: string, name: string, resetLink: string): Promise<void>

  sendJobApplicationConfirmation(email: string, name: string, jobTitle: string, companyName: string): Promise<void>

  sendApplicationStatusUpdate(email: string, name: string, jobTitle: string, companyName: string, status: string, notes?: string): Promise<void>

  sendCourseEnrollmentConfirmation(email: string, name: string, courseTitle: string, partner: string, startDate: Date, courseLink: string): Promise<void>

  sendCourseCompletionCertificate(email: string, name: string, courseTitle: string, certificateLink: string): Promise<void>

  sendEventRegistrationConfirmation(email: string, name: string, eventTitle: string, eventDate: Date, location: string, eventLink: string): Promise<void>

  sendEventReminder(email: string, name: string, eventTitle: string, eventDate: Date, location: string): Promise<void>

  sendInterviewInvitation(email: string, name: string, jobTitle: string, companyName: string, interviewDate: Date, location: string, meetingLink?: string): Promise<void>

  sendNewDiscountNotification(email: string, name: string, discountTitle: string, brandName: string, percentage: number | null, fixedAmount: number | null, expiresAt: Date, discountLink: string): Promise<void>
}
```

## Related Documentation

- [Email Templates](./templates/) - Template files
- [Nodemailer Docs](https://nodemailer.com/) - SMTP client
- [Handlebars Docs](https://handlebarsjs.com/) - Template engine

---

**Module**: Mail
**Version**: 1.0.0
**Last Updated**: November 15, 2025
