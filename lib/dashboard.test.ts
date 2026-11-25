import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma, resetDatabase } from '@/test/db';
import { getPersonDay, getWorkspaceToday } from './dashboard';

const WS = 'T_DASH';
const at = (iso: string) => new Date(iso);
// 2026-03-10 is a Tuesday; Istanbul is UTC+3.
const NOW = at('2026-03-10T12:00:00Z'); // 15:00 local

async function person(userId: string, name: string, presence: string, extra: object = {}) {
  await prisma.userStatus.create({ data: { userId, workspaceId: WS, name, realName: name, presence, updatedAt: at('2026-03-10T11:59:00Z'), ...extra } });
}
async function session(userId: string, start: string, end: string | null) {
  return prisma.activitySession.create({
    data: { userId, workspaceId: WS, startTime: at(start), endTime: end ? at(end) : null, lastSeen: at(end ?? '2026-03-10T11:58:00Z') },
  });
}

beforeEach(async () => {
  await resetDatabase();
  await prisma.workspace.create({ data: { id: WS, name: 'Test', botToken: 'enc:v1:x:y:z' } });
});
afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

describe('getWorkspaceToday', () => {
  it('builds people, events and totals for the local day', async () => {
    await person('U1', 'Ayşe', 'away');
    await person('U2', 'Mert', 'active');
    await session('U1', '2026-03-10T06:00:00Z', '2026-03-10T08:00:00Z'); // 09:00–11:00
    const open = await session('U2', '2026-03-10T11:00:00Z', null); // 14:00–now
    await prisma.userStatus.update({ where: { userId: 'U2' }, data: { activeSessionId: open.id } });
    await session('U2', '2026-03-09T06:00:00Z', '2026-03-09T07:00:00Z'); // yesterday

    const today = await getWorkspaceToday(WS, NOW);

    expect(today.date).toBe('2026-03-10');
    expect(today.activeCount).toBe(1);
    expect(today.people.map((p) => p.name)).toEqual(['Mert', 'Ayşe']); // active first
    expect(today.totalMs).toBe(3 * 3_600_000);
    const mert = today.people[0]!;
    expect(mert.activeSince?.toISOString()).toBe('2026-03-10T11:00:00.000Z');
    expect(mert.sessions).toEqual([expect.objectContaining({ startMin: 14 * 60, endMin: 15 * 60, end: null })]);
    const ayse = today.people[1]!;
    expect(ayse.lastSeen?.toISOString()).toBe('2026-03-10T08:00:00.000Z');
    expect(today.events.map((e) => `${e.name}:${e.kind}`)).toEqual(['Mert:active', 'Ayşe:away', 'Ayşe:active']);
    expect(today.syncedAt?.toISOString()).toBe('2026-03-10T11:59:00.000Z');
  });

  it('leaves out people who left the workspace', async () => {
    await person('U1', 'Ayşe', 'away');
    await person('U3', 'Gone', 'away', { isMember: false });
    const today = await getWorkspaceToday(WS, NOW);
    expect(today.people.map((p) => p.userId)).toEqual(['U1']);
  });
});

describe('getPersonDay', () => {
  it('returns the day, its week and the year', async () => {
    await person('U1', 'Ayşe', 'away');
    await session('U1', '2026-03-10T06:00:00Z', '2026-03-10T08:30:00Z');
    await session('U1', '2026-03-10T09:00:00Z', '2026-03-10T09:30:00Z');
    await session('U1', '2026-03-09T06:00:00Z', '2026-03-09T07:00:00Z');

    const day = await getPersonDay('U1', WS, '2026-03-10', NOW);
    expect(day).not.toBeNull();
    expect(day!.isToday).toBe(true);
    expect(day!.sessions).toHaveLength(2);
    expect(day!.totalMs).toBe(3 * 3_600_000);
    expect(day!.longestMs).toBe(2.5 * 3_600_000);
    expect(day!.week.map((d) => d.date)[0]).toBe('2026-03-09'); // Monday
    expect(day!.week[0]!.totalMs).toBe(3_600_000);
    expect(day!.weekTotalMs).toBe(4 * 3_600_000);
    expect(day!.year).toHaveLength(365);
  });

  it('refuses a person from another workspace', async () => {
    await person('U1', 'Ayşe', 'away');
    expect(await getPersonDay('U1', 'T_OTHER', '2026-03-10', NOW)).toBeNull();
  });
});
