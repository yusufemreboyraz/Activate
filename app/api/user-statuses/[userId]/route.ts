import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/auth';
import { canAccessWorkspace } from '@/lib/access';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const user = await requireUser();
  if (user instanceof Response) return user;

  const { userId } = await params;

  const status = await prisma.userStatus.findUnique({ where: { userId } });
  // Same answer for "no such user" and "not in your workspaces".
  if (!status || !(await canAccessWorkspace(user.email, status.workspaceId))) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    user_id: status.userId,
    workspace_id: status.workspaceId,
    name: status.name,
    presence: status.presence ?? undefined,
    status_text: status.statusText ?? '',
    status_emoji: status.statusEmoji ?? '',
    status_expiration: status.statusExpiration ?? 0,
    real_name: status.realName ?? '',
    display_name: status.displayName ?? '',
    image_original: status.imageOriginal ?? '',
    updated_at: status.updatedAt.toISOString(),
  });
}
