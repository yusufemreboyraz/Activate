import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateActivityForDate } from '@/lib/activityService';
import { formatDateToYYYYMMDD, formatDuration } from '@/lib/activityUtils';

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get('workspaceId');
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
  }

  const statuses = await prisma.userStatus.findMany({ where: { workspaceId } });
  const todayString = formatDateToYYYYMMDD(new Date());

  const data = await Promise.all(
    statuses.map(async (status) => {
      let totalActiveToday = '0s';
      try {
        const activity = await calculateActivityForDate(status.userId, workspaceId, todayString);
        totalActiveToday = formatDuration(activity.totalActiveMs);
      } catch (err) {
        console.error(`Error calculating today's activity for user ${status.userId}:`, err);
        totalActiveToday = 'Error';
      }

      return {
        id: status.userId,
        user_id: status.userId,
        workspace_id: status.workspaceId,
        name: status.name,
        status_text: status.statusText ?? undefined,
        status_emoji: status.statusEmoji ?? undefined,
        status_expiration: status.statusExpiration ?? undefined,
        real_name: status.realName ?? undefined,
        display_name: status.displayName ?? undefined,
        image_original: status.imageOriginal ?? undefined,
        updated_at: status.updatedAt.toISOString(),
        presence: status.presence ?? undefined,
        totalActiveToday,
      };
    })
  );

  return NextResponse.json(data);
}
