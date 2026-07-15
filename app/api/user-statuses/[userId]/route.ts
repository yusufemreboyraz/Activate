import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  const status = await prisma.userStatus.findUnique({ where: { userId } });
  if (!status) {
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
