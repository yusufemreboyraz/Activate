import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/auth';
import { calculateActivityForDate } from '@/lib/activityService';
import { isDateString } from '@/lib/time';

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const userId = request.nextUrl.searchParams.get('userId');
  const workspaceId = request.nextUrl.searchParams.get('workspaceId');
  const date = request.nextUrl.searchParams.get('date');

  if (!userId || !workspaceId || !date || !isDateString(date)) {
    return NextResponse.json(
      { error: 'userId, workspaceId and date (YYYY-MM-DD) are required' },
      { status: 400 }
    );
  }

  const activity = await calculateActivityForDate(userId, workspaceId, date);
  return NextResponse.json(activity);
}
