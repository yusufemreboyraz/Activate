import { prisma } from '@/lib/prisma';

export async function resetDatabase() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE activity_sessions, user_statuses, slack_workspaces, cron_locks RESTART IDENTITY CASCADE'
  );
}

export { prisma };
