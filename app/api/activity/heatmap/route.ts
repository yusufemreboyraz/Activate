import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/auth';
import { calculateActivityForYear } from '@/lib/activityService';

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const userId = request.nextUrl.searchParams.get('userId');
  const workspaceId = request.nextUrl.searchParams.get('workspaceId');
  const yearParam = request.nextUrl.searchParams.get('year');

  if (!userId || !workspaceId || !yearParam) {
    return NextResponse.json(
      { error: 'userId, workspaceId and year are required' },
      { status: 400 }
    );
  }

  const year = Number(yearParam);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: 'year must be between 2000 and 2100' }, { status: 400 });
  }

  const days = await calculateActivityForYear(userId, workspaceId, year);
  return NextResponse.json(days);
}
