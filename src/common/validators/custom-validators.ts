import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Validates phone numbers for Uzbekistan (+998XXXXXXXXX)
 */
@ValidatorConstraint({ name: 'isUzbekPhone', async: false })
export class IsUzbekPhoneConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (typeof value !== 'string') return false;
    // Uzbekistan phone format: +998XXXXXXXXX (9 digits after +998)
    const phoneRegex = /^\+998[0-9]{9}$/;
    return phoneRegex.test(value);
  }

  defaultMessage(args: ValidationArguments) {
    return 'Phone number must be in Uzbekistan format: +998XXXXXXXXX';
  }
}

export function IsUzbekPhone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsUzbekPhoneConstraint,
    });
  };
}

/**
 * Validates strong passwords
 * Requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
 */
@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (typeof value !== 'string') return false;

    const minLength = value.length >= 8;
    const hasUppercase = /[A-Z]/.test(value);
    const hasLowercase = /[a-z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

    return minLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character';
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}

/**
 * Validates student ID format (STU + 6 digits)
 */
@ValidatorConstraint({ name: 'isStudentId', async: false })
export class IsStudentIdConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (typeof value !== 'string') return false;
    // Student ID format: STU123456 (STU followed by 6 digits)
    const studentIdRegex = /^STU[0-9]{6}$/;
    return studentIdRegex.test(value);
  }

  defaultMessage(args: ValidationArguments) {
    return 'Student ID must be in format: STU123456 (STU followed by 6 digits)';
  }
}

export function IsStudentId(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStudentIdConstraint,
    });
  };
}

/**
 * Validates that a date is in the future
 */
@ValidatorConstraint({ name: 'isFutureDate', async: false })
export class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (!(value instanceof Date) && typeof value !== 'string') return false;
    const date = value instanceof Date ? value : new Date(value);
    return date > new Date();
  }

  defaultMessage(args: ValidationArguments) {
    return 'Date must be in the future';
  }
}

export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsFutureDateConstraint,
    });
  };
}

/**
 * Validates that a date is in the past
 */
@ValidatorConstraint({ name: 'isPastDate', async: false })
export class IsPastDateConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (!(value instanceof Date) && typeof value !== 'string') return false;
    const date = value instanceof Date ? value : new Date(value);
    return date < new Date();
  }

  defaultMessage(args: ValidationArguments) {
    return 'Date must be in the past';
  }
}

export function IsPastDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPastDateConstraint,
    });
  };
}

/**
 * Validates age range (for date of birth)
 */
@ValidatorConstraint({ name: 'isAgeInRange', async: false })
export class IsAgeInRangeConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (!(value instanceof Date) && typeof value !== 'string') return false;

    const date = value instanceof Date ? value : new Date(value);
    const today = new Date();
    const age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();

    let actualAge = age;
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      actualAge--;
    }

    const [min, max] = args.constraints as [number, number];
    return actualAge >= min && actualAge <= max;
  }

  defaultMessage(args: ValidationArguments) {
    const [min, max] = args.constraints as [number, number];
    return `Age must be between ${min} and ${max} years`;
  }
}

export function IsAgeInRange(min: number, max: number, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [min, max],
      validator: IsAgeInRangeConstraint,
    });
  };
}

/**
 * Validates Uzbekistan postal code (6 digits)
 */
@ValidatorConstraint({ name: 'isUzbekPostalCode', async: false })
export class IsUzbekPostalCodeConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (typeof value !== 'string') return false;
    // Uzbekistan postal code: 6 digits
    const postalCodeRegex = /^[0-9]{6}$/;
    return postalCodeRegex.test(value);
  }

  defaultMessage(args: ValidationArguments) {
    return 'Postal code must be 6 digits';
  }
}

export function IsUzbekPostalCode(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsUzbekPostalCodeConstraint,
    });
  };
}

/**
 * Validates URL with custom protocols
 */
@ValidatorConstraint({ name: 'isValidUrl', async: false })
export class IsValidUrlConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (typeof value !== 'string') return false;
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    return 'Must be a valid URL (http:// or https://)';
  }
}

export function IsValidUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidUrlConstraint,
    });
  };
}

/**
 * Validates file size (in bytes)
 */
export function IsFileSize(maxSize: number, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [maxSize],
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value || !value.size) return false;
          const [maxSizeConstraint] = args.constraints as [number];
          return value.size <= maxSizeConstraint;
        },
        defaultMessage(args: ValidationArguments) {
          const [maxSizeConstraint] = args.constraints as [number];
          const maxSizeMB = (maxSizeConstraint / (1024 * 1024)).toFixed(2);
          return `File size must not exceed ${maxSizeMB}MB`;
        },
      },
    });
  };
}

/**
 * Validates that a string contains only Uzbek/Cyrillic/Latin characters
 */
@ValidatorConstraint({ name: 'isUzbekName', async: false })
export class IsUzbekNameConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (typeof value !== 'string') return false;
    // Allows Latin, Cyrillic, and common Uzbek characters
    const nameRegex = /^[a-zA-ZА-Яа-яЎўҚқҒғҲҳ\s'-]+$/;
    return nameRegex.test(value) && value.trim().length > 0;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Name must contain only letters (Latin or Cyrillic)';
  }
}

export function IsUzbekName(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsUzbekNameConstraint,
    });
  };
}
