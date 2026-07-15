import { NextRequest, NextResponse } from 'next/server';
import { calculateActivityForYear } from '@/lib/activityService';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  const workspaceId = request.nextUrl.searchParams.get('workspaceId');
  const yearParam = request.nextUrl.searchParams.get('year');

  if (!userId || !workspaceId || !yearParam) {
    return NextResponse.json(
      { error: 'userId, workspaceId and year are required' },
      { status: 400 }
    );
  }

  const year = parseInt(yearParam, 10);
  if (Number.isNaN(year)) {
    return NextResponse.json({ error: 'year must be a number' }, { status: 400 });
  }

  const days = await calculateActivityForYear(userId, workspaceId, year);
  return NextResponse.json(days);
}
