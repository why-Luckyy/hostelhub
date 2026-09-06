import { prisma } from '../config/db';
import { AppError } from '../utils/appError';
import { HTTP_STATUS } from '../constants/httpStatus';
import { AudienceType, NoticeCategory, NotificationType, UserRole } from '@prisma/client';
import {
  CreateNoticeInput,
  UpdateNoticeInput,
  QueryNoticesInput,
} from '../validators/noticeValidation';

export const getNotices = async (
  userRole: UserRole,
  userId: string,
  query: QueryNoticesInput
) => {
  const where: any = {};

  if (query.category) {
    where.category = query.category;
  }
  if (query.isPinned !== undefined) {
    where.isPinned = query.isPinned;
  }

  // Student audience filtering: only notices intended for ALL or student's residency type
  if (userRole === UserRole.STUDENT) {
    const student = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (student) {
      const allowedAudiences: AudienceType[] = [AudienceType.ALL];
      if (student.studentType === 'HOSTELER') {
        allowedAudiences.push(AudienceType.HOSTELERS);
      } else {
        allowedAudiences.push(AudienceType.DAY_SCHOLARS);
      }
      where.targetAudience = { in: allowedAudiences };
    }
  } else if (query.targetAudience) {
    where.targetAudience = query.targetAudience;
  }

  const [total, notices] = await Promise.all([
    prisma.notice.count({ where }),
    prisma.notice.findMany({
      where,
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        publishedBy: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        targetHostel: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    }),
  ]);

  return {
    notices,
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

export const getNoticeById = async (id: string) => {
  const notice = await prisma.notice.findUnique({
    where: { id },
    include: {
      publishedBy: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
      targetHostel: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  if (!notice) {
    throw new AppError('Notice not found.', HTTP_STATUS.NOT_FOUND);
  }

  return notice;
};

export const createNotice = async (wardenUserId: string, input: CreateNoticeInput) => {
  const notice = await prisma.notice.create({
    data: {
      title: input.title,
      content: input.content,
      category: input.category,
      targetAudience: input.targetAudience,
      targetHostelId: input.targetHostelId || null,
      isPinned: input.isPinned,
      publishedByAdminId: wardenUserId,
    },
    include: {
      publishedBy: {
        select: { id: true, email: true, role: true },
      },
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: wardenUserId,
      action: 'NOTICE_CREATED',
      entityType: 'Notice',
      entityId: notice.id,
      details: JSON.stringify({
        title: notice.title,
        category: notice.category,
        isPinned: notice.isPinned,
        targetAudience: notice.targetAudience,
      }),
    },
  });

  // Optional: notify students if URGENT or PINNED notice
  if (notice.isPinned || notice.category === NoticeCategory.URGENT) {
    try {
      const targetUsers = await prisma.studentProfile.findMany({
        select: { userId: true },
        take: 100, // Safe batch limit
      });

      if (targetUsers.length > 0) {
        await prisma.notification.createMany({
          data: targetUsers.map((u) => ({
            userId: u.userId,
            type: NotificationType.NOTICE,
            title: `Announcement: ${notice.title}`,
            message: notice.content.slice(0, 150),
            data: JSON.stringify({ noticeId: notice.id }),
          })),
        });
      }
    } catch (err) {
      console.log('Notice notification batch notice:', err);
    }
  }

  return notice;
};

export const updateNotice = async (wardenUserId: string, id: string, input: UpdateNoticeInput) => {
  const existing = await prisma.notice.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Notice not found.', HTTP_STATUS.NOT_FOUND);
  }

  const updatedNotice = await prisma.notice.update({
    where: { id },
    data: {
      title: input.title,
      content: input.content,
      category: input.category,
      targetAudience: input.targetAudience,
      targetHostelId: input.targetHostelId,
      isPinned: input.isPinned,
    },
    include: {
      publishedBy: {
        select: { id: true, email: true, role: true },
      },
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: wardenUserId,
      action: 'NOTICE_UPDATED',
      entityType: 'Notice',
      entityId: updatedNotice.id,
      details: JSON.stringify({
        title: updatedNotice.title,
        isPinned: updatedNotice.isPinned,
      }),
    },
  });

  return updatedNotice;
};

export const deleteNotice = async (wardenUserId: string, id: string) => {
  const existing = await prisma.notice.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Notice not found.', HTTP_STATUS.NOT_FOUND);
  }

  await prisma.notice.delete({ where: { id } });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: wardenUserId,
      action: 'NOTICE_DELETED',
      entityType: 'Notice',
      entityId: id,
      details: JSON.stringify({ title: existing.title }),
    },
  });

  return { message: 'Notice deleted successfully' };
};
