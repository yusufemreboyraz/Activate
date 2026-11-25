import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/auth';
import { accessibleWorkspaceIds } from '@/lib/access';

// Only the workspaces the signed-in person is a member of.
export async function GET() {
  const user = await requireUser();
  if (user instanceof Response) return user;

  const ids = await accessibleWorkspaceIds(user.email);
  const workspaces = await prisma.workspace.findMany({
    where: { id: { in: ids }, status: 'active' },
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
