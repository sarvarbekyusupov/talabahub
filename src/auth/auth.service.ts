import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { UserVerificationStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, referredByCode, ...userData } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Check phone uniqueness if provided
    if (userData.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: userData.phone },
      });
      if (existingPhone) {
        throw new ConflictException('User with this phone already exists');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate referral code for new user
    const referralCode = this.generateReferralCode();

    // Generate email verification token
    const emailVerificationToken = this.generateToken();

    // Find referrer if code provided
    let referrerId: string | undefined;
    if (referredByCode) {
      const referrer = await this.prisma.user.findUnique({
        where: { referralCode: referredByCode },
      });
      if (referrer) {
        referrerId = referrer.id;
      }
    }

    // Create user with unverified status
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        ...userData,
        referralCode,
        emailVerificationToken,
        referredBy: referrerId,
        verificationStatus: 'pending',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        verificationStatus: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    // Generate JWT token
    const token = this.generateJwtToken(user.id, user.email, user.role);

    // Send verification email
    try {
      await this.mailService.sendEmailVerification(
        user.email,
        emailVerificationToken,
        user.firstName,
      );
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Don't fail registration if email fails
    }

    return {
      user,
      token,
      message: 'Registration successful. Please check your email to verify your account.',
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        university: {
          select: {
            id: true,
            nameUz: true,
            nameEn: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Your account has been deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT token
    const token = this.generateJwtToken(user.id, user.email, user.role);

    // Remove sensitive data
    const { passwordHash, emailVerificationToken, passwordResetToken, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
      },
    });

    return { message: 'Email verified successfully' };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return { message: 'Password changed successfully' };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists
      return { message: 'If an account exists with this email, a password reset link has been sent' };
    }

    // Generate reset token
    const resetToken = this.generateToken();
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1); // Token expires in 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    // Send password reset email
    try {
      await this.mailService.sendPasswordReset(
        user.email,
        resetToken,
        user.firstName,
      );
    } catch (error) {
      console.error('Failed to send password reset email:', error);
    }

    return { message: 'If an account exists with this email, a password reset link has been sent' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return { message: 'Password reset successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        university: true,
        referrer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            referrals: true,
            discountUsages: true,
            jobApplications: true,
            courseEnrollments: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash, emailVerificationToken, passwordResetToken, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  private generateJwtToken(userId: string, email: string, role: string): string {
    const payload = { sub: userId, email, role };
    return this.jwtService.sign(payload);
  }

  private generateReferralCode(): string {
    return randomBytes(6).toString('hex').toUpperCase();
  }

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        universityId: true,
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  }
}
