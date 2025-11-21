import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class FollowsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async follow(username: string, followerId: string) {
    // Find user to follow
    const userToFollow = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { startsWith: username } },
          { firstName: { equals: username, mode: 'insensitive' } },
        ],
        role: 'student',
      },
    });
    if (!userToFollow) throw new NotFoundException('User not found');
    if (userToFollow.id === followerId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    // Check if already following
    const existing = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId: userToFollow.id },
      },
    });
    if (existing) throw new BadRequestException('Already following');

    await this.prisma.follow.create({
      data: {
        followerId,
        followingId: userToFollow.id,
      },
    });

    // Update profiles
    await Promise.all([
      this.prisma.studentProfile.upsert({
        where: { id: userToFollow.id },
        update: { totalFollowers: { increment: 1 } },
        create: { id: userToFollow.id, totalFollowers: 1 },
      }),
      this.prisma.studentProfile.upsert({
        where: { id: followerId },
        update: { totalFollowing: { increment: 1 } },
        create: { id: followerId, totalFollowing: 1 },
      }),
    ]);

    // Send notification
    await this.notificationsService.createFollowNotification(
      userToFollow.id,
      followerId,
    );

    const profile = await this.prisma.studentProfile.findUnique({
      where: { id: userToFollow.id },
    });

    return {
      following: true,
      totalFollowers: profile?.totalFollowers || 1,
    };
  }

  async unfollow(username: string, followerId: string) {
    const userToUnfollow = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { startsWith: username } },
          { firstName: { equals: username, mode: 'insensitive' } },
        ],
      },
    });
    if (!userToUnfollow) throw new NotFoundException('User not found');

    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId: userToUnfollow.id },
      },
    });
    if (!follow) throw new BadRequestException('Not following');

    await this.prisma.follow.delete({
      where: {
        followerId_followingId: { followerId, followingId: userToUnfollow.id },
      },
    });

    // Update profiles
    await Promise.all([
      this.prisma.studentProfile.update({
        where: { id: userToUnfollow.id },
        data: { totalFollowers: { decrement: 1 } },
      }),
      this.prisma.studentProfile.update({
        where: { id: followerId },
        data: { totalFollowing: { decrement: 1 } },
      }),
    ]);

    return { following: false };
  }

  async getFollowers(username: string, page = 1, limit = 20) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { startsWith: username } },
          { firstName: { equals: username, mode: 'insensitive' } },
        ],
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const [followers, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followingId: user.id },
        include: {
          follower: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              studentProfile: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.follow.count({ where: { followingId: user.id } }),
    ]);

    return {
      data: followers.map(f => f.follower),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getFollowing(username: string, page = 1, limit = 20) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { startsWith: username } },
          { firstName: { equals: username, mode: 'insensitive' } },
        ],
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const [following, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followerId: user.id },
        include: {
          following: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              studentProfile: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.follow.count({ where: { followerId: user.id } }),
    ]);

    return {
      data: following.map(f => f.following),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    return !!follow;
  }
}
