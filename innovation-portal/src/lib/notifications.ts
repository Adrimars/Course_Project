/**
 * Phase 7: Notification helper — creates persisted notifications.
 *
 * Import and call from any API route to notify users about events:
 *   - Status changes
 *   - Assignments
 *   - Join request decisions
 *   - Score submissions
 */
import { prisma } from '@/lib/db';

type NotificationType =
    | 'STATUS_CHANGE'
    | 'ASSIGNMENT'
    | 'JOIN_REQUEST'
    | 'SCORE_RECEIVED'
    | 'FEEDBACK'
    | 'SYSTEM';

interface CreateNotificationInput {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
}

/**
 * Create a single notification for a user.
 */
export async function createNotification(input: CreateNotificationInput) {
    return prisma.notification.create({
        data: {
            userId: input.userId,
            type: input.type,
            title: input.title,
            message: input.message,
            link: input.link ?? null,
        },
    });
}

/**
 * Create notifications for multiple users at once (same content).
 */
export async function createBulkNotifications(
    userIds: string[],
    data: Omit<CreateNotificationInput, 'userId'>
) {
    if (userIds.length === 0) return;

    return prisma.notification.createMany({
        data: userIds.map((userId) => ({
            userId,
            type: data.type,
            title: data.title,
            message: data.message,
            link: data.link ?? null,
        })),
    });
}
