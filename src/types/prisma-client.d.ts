// Temporary type definitions for Prisma Client enums
// These will be replaced when Prisma Client is properly generated

export enum UserRole {
  student = 'student',
  admin = 'admin',
  partner = 'partner',
}

export enum UserVerificationStatus {
  pending = 'pending',
  verified = 'verified',
  rejected = 'rejected',
}

export enum DiscountType {
  percentage = 'percentage',
  fixed_amount = 'fixed_amount',
  promo_code = 'promo_code',
}

export enum JobType {
  internship = 'internship',
  part_time = 'part_time',
  full_time = 'full_time',
  freelance = 'freelance',
}

export enum JobApplicationStatus {
  pending = 'pending',
  reviewed = 'reviewed',
  interview = 'interview',
  accepted = 'accepted',
  rejected = 'rejected',
}

export enum CourseLevel {
  beginner = 'beginner',
  intermediate = 'intermediate',
  advanced = 'advanced',
}

export enum NotificationType {
  email = 'email',
  sms = 'sms',
  push = 'push',
  in_app = 'in_app',
}

export enum NotificationStatus {
  pending = 'pending',
  sent = 'sent',
  failed = 'failed',
  read = 'read',
}

export enum PaymentStatus {
  pending = 'pending',
  completed = 'completed',
  failed = 'failed',
  refunded = 'refunded',
}

// Re-export from @prisma/client module
declare module '@prisma/client' {
  export {
    UserRole,
    UserVerificationStatus,
    DiscountType,
    JobType,
    JobApplicationStatus,
    CourseLevel,
    NotificationType,
    NotificationStatus,
    PaymentStatus,
  };
}
