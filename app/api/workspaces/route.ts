import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/auth';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const workspaces = await prisma.workspace.findMany({
    where: { status: 'active' },
    select: { id: true, name: true, status: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(
    workspaces.map((w) => ({
      workspace_id: w.id,
      workspace_name: w.name,
      status: w.status,
    }))
  );
}
