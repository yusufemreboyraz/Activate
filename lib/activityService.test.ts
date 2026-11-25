import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma, resetDatabase } from '@/test/db';
import {
  calculateActivityForDate,
  calculateActivityForRange,
  calculateActivityForYear,
  calculateWorkspaceTotalsForDate,
} from './activityService';

const WS = 'T_TEST';
const USER = 'U1';
const H = 3600_000;

async function session(startIso: string, endIso: string | null, userId = USER) {
  await prisma.activitySession.create({
    data: {
      userId,
      workspaceId: WS,
      startTime: new Date(startIso),
      endTime: endIso ? new Date(endIso) : null,
      lastSeen: new Date(endIso ?? startIso),
    },
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

describe('calculateActivityForDate (Europe/Istanbul days)', () => {
  it('counts a session fully inside the local day, with local times', async () => {
    await session('2026-03-10T06:00:00Z', '2026-03-10T08:00:00Z'); // 09:00–11:00 Istanbul
    const result = await calculateActivityForDate(USER, WS, '2026-03-10', new Date('2026-03-11T00:00:00Z'));
    expect(result.totalActiveMs).toBe(2 * H);
    expect(result.workSessions[0]).toMatchObject({ startTime: '09:00', endTime: '11:00', duration: '2h' });
  });

  it('puts a 01:00 Istanbul session on the local day, not the UTC day', async () => {
    await session('2026-03-09T22:00:00Z', '2026-03-09T23:00:00Z'); // 01:00–02:00 on 10 March Istanbul
    const now = new Date('2026-03-12T00:00:00Z');
    expect((await calculateActivityForDate(USER, WS, '2026-03-10', now)).totalActiveMs).toBe(H);
    expect((await calculateActivityForDate(USER, WS, '2026-03-09', now)).totalActiveMs).toBe(0);
  });

  it('splits a session that crosses local midnight', async () => {
    await session('2026-03-10T20:00:00Z', '2026-03-10T22:00:00Z'); // 23:00–01:00 Istanbul
    const now = new Date('2026-03-12T00:00:00Z');
    expect((await calculateActivityForDate(USER, WS, '2026-03-10', now)).totalActiveMs).toBe(H);
    expect((await calculateActivityForDate(USER, WS, '2026-03-11', now)).totalActiveMs).toBe(H);
  });

  it('counts an open session up to now and labels it', async () => {
    await session('2026-03-10T06:00:00Z', null);
    const result = await calculateActivityForDate(USER, WS, '2026-03-10', new Date('2026-03-10T07:30:00Z'));
    expect(result.totalActiveMs).toBe(1.5 * H);
    expect(result.workSessions[0].endTime).toBe('şu an');
  });

  it('ignores other users and workspaces', async () => {
    await session('2026-03-10T06:00:00Z', '2026-03-10T07:00:00Z', 'U2');
    expect((await calculateActivityForDate(USER, WS, '2026-03-10', new Date('2026-03-11T00:00:00Z'))).totalActiveMs).toBe(0);
  });
});

describe('ranges and totals', () => {
  it('sums a week range', async () => {
    await session('2026-11-23T06:00:00Z', '2026-11-23T08:00:00Z');
    await session('2026-11-25T06:00:00Z', '2026-11-25T07:00:00Z');
    const now = new Date('2026-11-26T00:00:00Z');
    expect((await calculateActivityForRange(USER, WS, '2026-11-23', '2026-11-29', now)).totalActiveMs).toBe(3 * H);
  });

  it('totals every user of a workspace in one call', async () => {
    await session('2026-03-10T06:00:00Z', '2026-03-10T07:00:00Z', 'U1');
    await session('2026-03-10T06:00:00Z', '2026-03-10T09:00:00Z', 'U2');
    const totals = await calculateWorkspaceTotalsForDate(WS, '2026-03-10', new Date('2026-03-11T00:00:00Z'));
    expect(totals.get('U1')).toBe(H);
    expect(totals.get('U2')).toBe(3 * H);
  });

  it('returns 365 heatmap days with totals on the right local day', async () => {
    await session('2026-03-09T22:00:00Z', '2026-03-09T23:00:00Z');
    const days = await calculateActivityForYear(USER, WS, 2026, new Date('2027-01-01T00:00:00Z'));
    expect(days).toHaveLength(365);
    expect(days.find((d) => d.date === '2026-03-10')?.totalActiveMs).toBe(H);
    expect(days.find((d) => d.date === '2026-03-09')?.totalActiveMs).toBe(0);
  });
});
