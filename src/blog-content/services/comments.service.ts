import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(blogPostId: string, userId: string, createCommentDto: { content: string; parentId?: string }) {
    const { content, parentId } = createCommentDto;

    // Verify blog post exists
    const blogPost = await this.prisma.blogPost.findUnique({
      where: { id: blogPostId },
    });

    if (!blogPost) {
      throw new NotFoundException('Blog post not found');
    }

    // If parentId is provided, verify it exists and belongs to the same blog post
    if (parentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: parentId },
      });

      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }

      if (parentComment.blogPostId !== blogPostId) {
        throw new BadRequestException('Parent comment must belong to the same blog post');
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        blogPostId,
        authorId: userId,
        content,
        parentId,
        isApproved: true, // Auto-approve comments for now
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        parent: {
          select: {
            id: true,
            authorId: true,
            content: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    return this._formatCommentResponse(comment);
  }

  async findByBlogPost(
    blogPostId: string,
    page = 1,
    limit = 20,
    filters: { approved?: boolean; parentId?: string } = {}
  ) {
    const skip = (page - 1) * limit;
    const where: any = { blogPostId };

    if (filters.approved !== undefined) {
      where.isApproved = filters.approved;
    }

    if (filters.parentId !== undefined) {
      if (filters.parentId === null) {
        where.parentId = null; // Get top-level comments
      } else {
        where.parentId = filters.parentId; // Get replies to specific comment
      }
    }

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        skip,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
            },
          },
          parent: {
            select: {
              id: true,
              authorId: true,
              content: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              replies: true,
            },
          },
        },
        orderBy: [
          { isApproved: 'desc' },
          { createdAt: 'asc' },
        ],
      }),
      this.prisma.comment.count({ where }),
    ]);

    return {
      data: comments.map((comment) => this._formatCommentResponse(comment)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        parent: {
          select: {
            id: true,
            authorId: true,
            content: true,
            createdAt: true,
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
              },
            },
            _count: {
              select: {
                replies: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return this._formatCommentResponse(comment);
  }

  async update(id: string, userId: string, updateCommentDto: { content?: string; isApproved?: boolean }) {
    const { content, isApproved } = updateCommentDto;

    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check if user is the author or admin
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const updatedComment = await this.prisma.comment.update({
      where: { id },
      data: {
        content,
        isApproved,
        updatedAt: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        parent: {
          select: {
            id: true,
            authorId: true,
            content: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    return this._formatCommentResponse(updatedComment);
  }

  async remove(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check if user is the author or admin
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    // Check if comment has replies
    const repliesCount = await this.prisma.comment.count({
      where: { parentId: id },
    });

    if (repliesCount > 0) {
      throw new BadRequestException('Cannot delete comment with replies');
    }

    await this.prisma.comment.delete({
      where: { id },
    });

    return { message: 'Comment deleted successfully' };
  }

  async approveComment(id: string) {
    const comment = await this.prisma.comment.update({
      where: { id },
      data: {
        isApproved: true,
        updatedAt: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return this._formatCommentResponse(comment);
  }

  async rejectComment(id: string, reason?: string) {
    const comment = await this.prisma.comment.update({
      where: { id },
      data: {
        isApproved: false,
        updatedAt: new Date(),
        // Could add a rejection reason field to the schema if needed
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return this._formatCommentResponse(comment);
  }

  async getCommentCount(blogPostId: string, approvedOnly = true) {
    const where: any = { blogPostId };

    if (approvedOnly) {
      where.isApproved = true;
    }

    const count = await this.prisma.comment.count({ where });

    return { blogPostId, count, approvedOnly };
  }

  private _formatCommentResponse(comment: any) {
    return {
      id: comment.id,
      content: comment.content,
      isApproved: comment.isApproved,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: comment.author,
      parentId: comment.parentId,
      parent: comment.parent || null,
      repliesCount: comment._count?.replies || 0,
      replies: comment.replies?.map((reply) => this._formatCommentResponse(reply)) || [],
    };
  }
}