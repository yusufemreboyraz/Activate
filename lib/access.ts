// Who may see which workspace. Server-only (Prisma).
//
// A signed-in person may see a connected workspace when their verified Slack
// email belongs to a current, non-guest member of it. Membership comes from
// the presence sync (users.list), so leaving a workspace removes access within
// one polling interval. App admins (ADMIN_EMAILS) follow the same rule for
// viewing; being an admin only adds the right to connect workspaces.
import { prisma } from '@/lib/prisma';

export async function accessibleWorkspaceIds(email: string | null | undefined): Promise<string[]> {
  if (!email) return [];
  const rows = await prisma.userStatus.findMany({
    where: {
      email: email.toLowerCase(),
      isMember: true,
      isGuest: false,
      workspace: { status: 'active' },
    },
    select: { workspaceId: true },
    distinct: ['workspaceId'],
  });
  return rows.map((r) => r.workspaceId);
}

export async function canAccessWorkspace(email: string | null | undefined, workspaceId: string): Promise<boolean> {
  return (await accessibleWorkspaceIds(email)).includes(workspaceId);
}
