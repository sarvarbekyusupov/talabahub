export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum TransactionState {
  // Payme transaction states
  STATE_CREATED = 1,
  STATE_COMPLETED = 2,
  STATE_CANCELLED = -1,
  STATE_CANCELLED_AFTER_COMPLETE = -2,
}

export enum PaymeErrorCode {
  INVALID_AMOUNT = -31001,
  TRANSACTION_NOT_FOUND = -31003,
  INVALID_ACCOUNT = -31050,
  UNABLE_TO_PERFORM = -31008,
  TRANSACTION_CANCELLED = -31007,
}

export enum ClickErrorCode {
  SUCCESS = 0,
  SIGN_CHECK_FAILED = -1,
  INVALID_AMOUNT = -2,
  ACTION_NOT_FOUND = -3,
  ALREADY_PAID = -4,
  USER_NOT_FOUND = -5,
  TRANSACTION_NOT_FOUND = -6,
  FAILED_TO_UPDATE = -7,
  UNKNOWN_ERROR = -8,
  TRANSACTION_CANCELLED = -9,
}
