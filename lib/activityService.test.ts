import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from './prisma';
import { calculateActivityForDate, calculateActivityForYear } from './activityService';

const WORKSPACE_ID = 'test-workspace';
const USER_ID = 'test-user';

const utc = (dateString: string) => new Date(dateString);

beforeAll(async () => {
  await prisma.workspace.upsert({
    where: { id: WORKSPACE_ID },
    create: { id: WORKSPACE_ID, name: 'Test Workspace', botToken: 'xoxb-test', status: 'active' },
    update: {},
  });
});

beforeEach(async () => {
  await prisma.activitySession.deleteMany({ where: { workspaceId: WORKSPACE_ID } });
});

afterAll(async () => {
  await prisma.activitySession.deleteMany({ where: { workspaceId: WORKSPACE_ID } });
  await prisma.workspace.deleteMany({ where: { id: WORKSPACE_ID } });
  await prisma.$disconnect();
});

describe('calculateActivityForDate', () => {
  it('counts a session fully contained in the day', async () => {
    await prisma.activitySession.create({
      data: {
        userId: USER_ID,
        workspaceId: WORKSPACE_ID,
        startTime: utc('2026-03-10T09:00:00.000Z'),
        endTime: utc('2026-03-10T11:00:00.000Z'),
        lastSeen: utc('2026-03-10T11:00:00.000Z'),
      },
    });

    const result = await calculateActivityForDate(USER_ID, WORKSPACE_ID, '2026-03-10');
    expect(result.totalActiveMs).toBe(2 * 60 * 60 * 1000);
    expect(result.workSessions).toHaveLength(1);
    expect(result.activityChanges).toBe(1);
  });

  it('clips a session that spans midnight to the queried day', async () => {
    await prisma.activitySession.create({
      data: {
        userId: USER_ID,
        workspaceId: WORKSPACE_ID,
        startTime: utc('2026-03-09T22:00:00.000Z'),
        endTime: utc('2026-03-10T02:00:00.000Z'),
        lastSeen: utc('2026-03-10T02:00:00.000Z'),
      },
    });

    const previousDay = await calculateActivityForDate(USER_ID, WORKSPACE_ID, '2026-03-09');
    const targetDay = await calculateActivityForDate(USER_ID, WORKSPACE_ID, '2026-03-10');

    // Day boundaries are [00:00:00.000, 23:59:59.999], so the split across
    // midnight is 1ms short of an even 2h on the earlier day.
    expect(previousDay.totalActiveMs).toBe(2 * 60 * 60 * 1000 - 1); // 22:00 -> 23:59:59.999
    expect(targetDay.totalActiveMs).toBe(2 * 60 * 60 * 1000); // 00:00 -> 02:00
  });

  it('counts an ongoing session (no end time) up to now', async () => {
    const now = new Date();
    const start = new Date(now.getTime() - 30 * 60 * 1000);

    await prisma.activitySession.create({
      data: {
        userId: USER_ID,
        workspaceId: WORKSPACE_ID,
        startTime: start,
        endTime: null,
        lastSeen: now,
      },
    });

    const todayString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const result = await calculateActivityForDate(USER_ID, WORKSPACE_ID, todayString);

    expect(result.totalActiveMs).toBeGreaterThanOrEqual(29 * 60 * 1000);
    expect(result.totalActiveMs).toBeLessThanOrEqual(31 * 60 * 1000);
  });

  it('excludes sessions entirely outside the requested day', async () => {
    await prisma.activitySession.create({
      data: {
        userId: USER_ID,
        workspaceId: WORKSPACE_ID,
        startTime: utc('2026-01-01T09:00:00.000Z'),
        endTime: utc('2026-01-01T11:00:00.000Z'),
        lastSeen: utc('2026-01-01T11:00:00.000Z'),
      },
    });

    const result = await calculateActivityForDate(USER_ID, WORKSPACE_ID, '2026-03-10');
    expect(result.totalActiveMs).toBe(0);
    expect(result.workSessions).toHaveLength(0);
  });

  it('sums multiple sessions on the same day', async () => {
    await prisma.activitySession.createMany({
      data: [
        {
          userId: USER_ID,
          workspaceId: WORKSPACE_ID,
          startTime: utc('2026-03-10T09:00:00.000Z'),
          endTime: utc('2026-03-10T10:00:00.000Z'),
          lastSeen: utc('2026-03-10T10:00:00.000Z'),
        },
        {
          userId: USER_ID,
          workspaceId: WORKSPACE_ID,
          startTime: utc('2026-03-10T13:00:00.000Z'),
          endTime: utc('2026-03-10T15:30:00.000Z'),
          lastSeen: utc('2026-03-10T15:30:00.000Z'),
        },
      ],
    });

    const result = await calculateActivityForDate(USER_ID, WORKSPACE_ID, '2026-03-10');
    expect(result.totalActiveMs).toBe(3.5 * 60 * 60 * 1000);
    expect(result.workSessions).toHaveLength(2);
    expect(result.activityChanges).toBe(2);
  });

  it('only counts sessions for the given user and workspace', async () => {
    await prisma.workspace.upsert({
      where: { id: 'other-workspace' },
      create: { id: 'other-workspace', name: 'Other', botToken: 'xoxb-other', status: 'active' },
      update: {},
    });

    await prisma.activitySession.create({
      data: {
        userId: 'other-user',
        workspaceId: WORKSPACE_ID,
        startTime: utc('2026-03-10T09:00:00.000Z'),
        endTime: utc('2026-03-10T10:00:00.000Z'),
        lastSeen: utc('2026-03-10T10:00:00.000Z'),
      },
    });
    await prisma.activitySession.create({
      data: {
        userId: USER_ID,
        workspaceId: 'other-workspace',
        startTime: utc('2026-03-10T09:00:00.000Z'),
        endTime: utc('2026-03-10T10:00:00.000Z'),
        lastSeen: utc('2026-03-10T10:00:00.000Z'),
      },
    });

    const result = await calculateActivityForDate(USER_ID, WORKSPACE_ID, '2026-03-10');
    expect(result.totalActiveMs).toBe(0);

    await prisma.activitySession.deleteMany({ where: { workspaceId: 'other-workspace' } });
    await prisma.workspace.deleteMany({ where: { id: 'other-workspace' } });
  });
});

describe('calculateActivityForYear', () => {
  it('buckets sessions into the correct calendar days across the year', async () => {
    await prisma.activitySession.createMany({
      data: [
        {
          userId: USER_ID,
          workspaceId: WORKSPACE_ID,
          startTime: utc('2026-01-05T09:00:00.000Z'),
          endTime: utc('2026-01-05T10:00:00.000Z'),
          lastSeen: utc('2026-01-05T10:00:00.000Z'),
        },
        {
          userId: USER_ID,
          workspaceId: WORKSPACE_ID,
          startTime: utc('2026-06-15T09:00:00.000Z'),
          endTime: utc('2026-06-15T12:00:00.000Z'),
          lastSeen: utc('2026-06-15T12:00:00.000Z'),
        },
      ],
    });

    const days = await calculateActivityForYear(USER_ID, WORKSPACE_ID, 2026);
    expect(days).toHaveLength(365);

    const jan5 = days.find((d) => d.date === '2026-01-05');
    const jun15 = days.find((d) => d.date === '2026-06-15');
    const untouched = days.find((d) => d.date === '2026-03-01');

    expect(jan5?.totalActiveMs).toBe(60 * 60 * 1000);
    expect(jun15?.totalActiveMs).toBe(3 * 60 * 60 * 1000);
    expect(untouched?.totalActiveMs).toBe(0);
  });
});
