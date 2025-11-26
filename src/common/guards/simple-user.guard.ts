import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SimpleUserGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Simple check - just make sure user is active
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { isActive: true },
    });

    if (!dbUser || !dbUser.isActive) {
      throw new ForbiddenException('User account is not active');
    }

    return true;
  }
}