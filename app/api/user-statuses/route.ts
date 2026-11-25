import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireWorkspaceAccess } from '@/auth';
import { calculateWorkspaceTotalsForDate } from '@/lib/activityService';
import { formatDuration } from '@/lib/activityUtils';
import { dateStringInZone } from '@/lib/time';

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get('workspaceId');
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
  }
  const access = await requireWorkspaceAccess(workspaceId);
  if (access instanceof Response) return access;

  const [statuses, totals] = await Promise.all([
    prisma.userStatus.findMany({ where: { workspaceId, isMember: true }, orderBy: { name: 'asc' } }),
    calculateWorkspaceTotalsForDate(workspaceId, dateStringInZone(new Date())),
  ]);

  return NextResponse.json(
    statuses.map((status) => ({
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
      totalActiveToday: formatDuration(totals.get(status.userId) ?? 0),
    }))
  );
}
