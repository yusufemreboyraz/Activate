import { NextResponse } from 'next/server';
import { requireUser } from '@/auth';
import { isAdminEmail } from '@/auth.config';

export async function GET() {
  const user = await requireUser();
  if (user instanceof Response) return user;
  return NextResponse.json({ email: user.email, isAdmin: isAdminEmail(user.email) });
}
