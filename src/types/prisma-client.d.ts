// Temporary type definitions for Prisma Client enums
// These will be replaced when Prisma Client is properly generated

export enum UserRole {
  student = 'student',
  admin = 'admin',
  partner = 'partner',
}

export enum UserVerificationStatus {
  unverified = 'unverified',
  email_verified = 'email_verified',
  pending_verification = 'pending_verification',
  verified = 'verified',
  verification_expired = 'verification_expired',
  rejected = 'rejected',
  suspended = 'suspended',
  graduated = 'graduated',
}

export enum StudentVerificationMethod {
  university_email = 'university_email',
  student_id_upload = 'student_id_upload',
  university_api = 'university_api',
  manual_review = 'manual_review',
}

export enum VerificationRequestStatus {
  pending = 'pending',
  approved = 'approved',
  rejected = 'rejected',
  more_info_needed = 'more_info_needed',
  cancelled = 'cancelled',
}

export enum VerificationRequestType {
  initial = 'initial',
  reverification = 'reverification',
  appeal = 'appeal',
}

export enum VerificationDocumentType {
  student_id_front = 'student_id_front',
  student_id_back = 'student_id_back',
  enrollment_certificate = 'enrollment_certificate',
  payment_receipt = 'payment_receipt',
  other = 'other',
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
    StudentVerificationMethod,
    VerificationRequestStatus,
    VerificationRequestType,
    VerificationDocumentType,
    DiscountType,
    JobType,
    JobApplicationStatus,
    CourseLevel,
    NotificationType,
    NotificationStatus,
    PaymentStatus,
  };
}
