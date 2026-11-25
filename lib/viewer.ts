// The signed-in person and the workspaces they may see. Server-only.
import { auth } from '@/auth';
import { isAdminEmail } from '@/auth.config';
import { accessibleWorkspaceIds } from '@/lib/access';
import { prisma } from '@/lib/prisma';

export interface Viewer {
  email: string;
  name: string;
  image: string | null;
  isAdmin: boolean;
  workspaces: { id: string; name: string; members: number }[];
}

export async function getViewer(): Promise<Viewer | null> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return null;
  const ids = await accessibleWorkspaceIds(email);
  const rows = ids.length
    ? await prisma.workspace.findMany({
        where: { id: { in: ids }, status: 'active' },
        select: { id: true, name: true, _count: { select: { userStatuses: { where: { isMember: true } } } } },
        orderBy: { name: 'asc' },
      })
    : [];
  return {
    email,
    name: session?.user?.name || email,
    image: session?.user?.image ?? null,
    isAdmin: isAdminEmail(email),
    workspaces: rows.map((w) => ({ id: w.id, name: w.name, members: w._count.userStatuses })),
  };
}

export function pickWorkspace(viewer: Viewer, requested: string | undefined): string | null {
  if (requested && viewer.workspaces.some((w) => w.id === requested)) return requested;
  return viewer.workspaces[0]?.id ?? null;
}
