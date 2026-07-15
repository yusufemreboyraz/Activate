// Populates the local SQLite database with a demo workspace, users and a few
// days of activity sessions so the dashboard has something to show without a
// real Slack installation. Run with `pnpm db:seed`.
import { config } from 'dotenv';
import { PrismaClient } from '../lib/generated/prisma/client';

config({ path: '.env.local' });

const prisma = new PrismaClient();

const DAY_MS = 24 * 60 * 60 * 1000;

function todayAt(hours: number, minutes: number, daysAgo = 0): Date {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return new Date(date.getTime() - daysAgo * DAY_MS);
}

async function main() {
  const workspace = await prisma.workspace.upsert({
    where: { id: 'DEMOWORKSPACE' },
    create: {
      id: 'DEMOWORKSPACE',
      name: 'Demo Workspace',
      botToken: 'xoxb-demo-not-a-real-token',
      status: 'active',
    },
    update: { status: 'active' },
  });

  const users = [
    { userId: 'U_DEMO_ADA', name: 'ada', realName: 'Ada Lovelace' },
    { userId: 'U_DEMO_GRACE', name: 'grace', realName: 'Grace Hopper' },
  ];

  for (const user of users) {
    await prisma.userStatus.upsert({
      where: { userId: user.userId },
      create: {
        userId: user.userId,
        workspaceId: workspace.id,
        name: user.name,
        realName: user.realName,
        displayName: user.realName,
        presence: 'away',
        statusText: '',
        statusEmoji: '',
        statusExpiration: 0,
        imageOriginal: '',
        updatedAt: new Date(),
      },
      update: {
        workspaceId: workspace.id,
        name: user.name,
        realName: user.realName,
      },
    });

    await prisma.activitySession.deleteMany({ where: { userId: user.userId } });
  }

  // A few work sessions today and over the past two days, per user.
  for (const [index, user] of users.entries()) {
    const offset = index * 30; // stagger the two users' schedules a bit
    for (let daysAgo = 0; daysAgo < 3; daysAgo++) {
      await prisma.activitySession.create({
        data: {
          userId: user.userId,
          workspaceId: workspace.id,
          startTime: todayAt(9, offset % 60, daysAgo),
          endTime: todayAt(11, 30 + (offset % 30), daysAgo),
          lastSeen: todayAt(11, 30 + (offset % 30), daysAgo),
        },
      });
      await prisma.activitySession.create({
        data: {
          userId: user.userId,
          workspaceId: workspace.id,
          startTime: todayAt(13, offset % 60, daysAgo),
          endTime: todayAt(17, offset % 45, daysAgo),
          lastSeen: todayAt(17, offset % 45, daysAgo),
        },
      });
    }
  }

  console.log(`Seeded workspace "${workspace.name}" (${workspace.id}) with ${users.length} users.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
