import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { UserVerificationStatus } from '@prisma/client';

export const SKIP_VERIFICATION_KEY = 'skipVerification';
export const SkipVerification = () => Reflect.metadata(SKIP_VERIFICATION_KEY, true);

@Injectable()
export class VerifiedUserGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if verification is skipped for this route
    const skipVerification = this.reflector.getAllAndOverride<boolean>(
      SKIP_VERIFICATION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipVerification) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Get fresh user data with verification status
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        verificationStatus: true,
        isEmailVerified: true,
        isActive: true,
      },
    });

    if (!dbUser) {
      throw new ForbiddenException('User not found');
    }

    if (!dbUser.isActive) {
      throw new ForbiddenException('Your account has been deactivated');
    }

    if (!dbUser.isEmailVerified) {
      throw new ForbiddenException(
        'Please verify your email address to access this feature',
      );
    }

    if (dbUser.verificationStatus !== UserVerificationStatus.verified) {
      const messages: Record<UserVerificationStatus, string> = {
        [UserVerificationStatus.pending]:
          'Your verification is under review. Please wait for approval.',
        [UserVerificationStatus.verified]: '',
        [UserVerificationStatus.rejected]:
          'Your verification was rejected. Please check the reason and re-submit.',
      };

      throw new ForbiddenException(
        messages[dbUser.verificationStatus] ||
          'Student verification required to access this feature',
      );
    }

    return true;
  }
}

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        isEmailVerified: true,
        isActive: true,
      },
    });

    if (!dbUser) {
      throw new ForbiddenException('User not found');
    }

    if (!dbUser.isActive) {
      throw new ForbiddenException('Your account has been deactivated');
    }

    if (!dbUser.isEmailVerified) {
      throw new ForbiddenException(
        'Please verify your email address to access this feature',
      );
    }

    return true;
  }
}
