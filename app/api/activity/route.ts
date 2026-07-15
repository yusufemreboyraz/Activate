import { NextRequest, NextResponse } from 'next/server';
import { calculateActivityForDate } from '@/lib/activityService';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  const workspaceId = request.nextUrl.searchParams.get('workspaceId');
  const date = request.nextUrl.searchParams.get('date');

  if (!userId || !workspaceId || !date) {
    return NextResponse.json(
      { error: 'userId, workspaceId and date are required' },
      { status: 400 }
    );
  }

  const activity = await calculateActivityForDate(userId, workspaceId, date);
  return NextResponse.json(activity);
}
