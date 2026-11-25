import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma, resetDatabase } from '@/test/db';
import { syncWorkspacePresence, withCronLease, type SlackMember, type SlackPresenceApi } from './presenceSync';

const WS = 'T_TEST';
const member = (id: string, name = id): SlackMember => ({
  id,
  name,
  realName: name,
  displayName: name,
  statusText: '',
  statusEmoji: '',
  statusExpiration: 0,
  image: '',
});

function fakeSlack(members: SlackMember[], presence: Record<string, 'active' | 'away' | null>): SlackPresenceApi {
  return {
    listMembers: async () => members,
    getPresence: async (id) => presence[id] ?? null,
  };
}

const at = (iso: string) => new Date(iso);

beforeEach(async () => {
  await resetDatabase();
  await prisma.workspace.create({ data: { id: WS, name: 'Test', botToken: 'enc:v1:x:y:z' } });
});

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

describe('syncWorkspacePresence', () => {
  it('opens a session when a user becomes active and keeps it going', async () => {
    const slack = fakeSlack([member('U1')], { U1: 'active' });
    await syncWorkspacePresence(prisma, WS, slack, { now: at('2026-03-10T09:00:00Z') });
    await syncWorkspacePresence(prisma, WS, slack, { now: at('2026-03-10T09:02:00Z') });

    const sessions = await prisma.activitySession.findMany();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].endTime).toBeNull();
    expect(sessions[0].lastSeen.toISOString()).toBe('2026-03-10T09:02:00.000Z');

    const status = await prisma.userStatus.findUniqueOrThrow({ where: { userId: 'U1' } });
    expect(status.activeSessionId).toBe(sessions[0].id);
    expect(status.presence).toBe('active');
  });

  it('closes the session when the user goes away', async () => {
    await syncWorkspacePresence(prisma, WS, fakeSlack([member('U1')], { U1: 'active' }), { now: at('2026-03-10T09:00:00Z') });
    const result = await syncWorkspacePresence(prisma, WS, fakeSlack([member('U1')], { U1: 'away' }), {
      now: at('2026-03-10T09:30:00Z'),
      maxGapMs: 60 * 60_000,
    });

    expect(result.ended).toBe(1);
    const [session] = await prisma.activitySession.findMany();
    expect(session.endTime?.toISOString()).toBe('2026-03-10T09:30:00.000Z');
    const status = await prisma.userStatus.findUniqueOrThrow({ where: { userId: 'U1' } });
    expect(status.activeSessionId).toBeNull();
  });

  it('does not stretch a session over a gap in polling', async () => {
    const slack = fakeSlack([member('U1')], { U1: 'active' });
    await syncWorkspacePresence(prisma, WS, slack, { now: at('2026-03-10T09:00:00Z') });
    // Scheduler missed three hours.
    await syncWorkspacePresence(prisma, WS, slack, { now: at('2026-03-10T12:00:00Z') });

    const sessions = await prisma.activitySession.findMany({ orderBy: { startTime: 'asc' } });
    expect(sessions).toHaveLength(2);
    expect(sessions[0].endTime?.toISOString()).toBe('2026-03-10T09:00:00.000Z');
    expect(sessions[1].startTime.toISOString()).toBe('2026-03-10T12:00:00.000Z');
    expect(sessions[1].endTime).toBeNull();
  });

  it('leaves state untouched when Slack presence cannot be read', async () => {
    await syncWorkspacePresence(prisma, WS, fakeSlack([member('U1')], { U1: 'active' }), { now: at('2026-03-10T09:00:00Z') });
    const result = await syncWorkspacePresence(prisma, WS, fakeSlack([member('U1')], { U1: null }), {
      now: at('2026-03-10T09:02:00Z'),
    });

    expect(result.skipped).toBe(1);
    const [session] = await prisma.activitySession.findMany();
    expect(session.endTime).toBeNull();
    expect(session.lastSeen.toISOString()).toBe('2026-03-10T09:00:00.000Z');
  });

  it('closes the open session of a member who left the workspace', async () => {
    await syncWorkspacePresence(prisma, WS, fakeSlack([member('U1'), member('U2')], { U1: 'active', U2: 'active' }), {
      now: at('2026-03-10T09:00:00Z'),
    });
    const result = await syncWorkspacePresence(prisma, WS, fakeSlack([member('U1')], { U1: 'active' }), {
      now: at('2026-03-10T09:02:00Z'),
    });

    expect(result.closedForMissingMembers).toBe(1);
    const u2Session = await prisma.activitySession.findFirstOrThrow({ where: { userId: 'U2' } });
    expect(u2Session.endTime?.toISOString()).toBe('2026-03-10T09:00:00.000Z');
    const u2 = await prisma.userStatus.findUniqueOrThrow({ where: { userId: 'U2' } });
    expect(u2.presence).toBe('away');
    expect(u2.activeSessionId).toBeNull();
  });

  it('stores profile fields from Slack', async () => {
    const m = { ...member('U1', 'Ayşe Yılmaz'), statusText: 'Toplantıda', statusEmoji: ':calendar:' };
    await syncWorkspacePresence(prisma, WS, fakeSlack([m], { U1: 'away' }), { now: at('2026-03-10T09:00:00Z') });
    const status = await prisma.userStatus.findUniqueOrThrow({ where: { userId: 'U1' } });
    expect(status).toMatchObject({ name: 'Ayşe Yılmaz', statusText: 'Toplantıda', statusEmoji: ':calendar:', presence: 'away' });
    expect(await prisma.activitySession.count()).toBe(0);
  });
});

describe('withCronLease', () => {
  it('lets only one concurrent run through and frees the lease afterwards', async () => {
    let release!: () => void;
    const blocker = new Promise<void>((r) => (release = r));

    const first = withCronLease(prisma, 'job', 60_000, () => blocker.then(() => 'first'));
    await new Promise((r) => setTimeout(r, 50));
    const second = await withCronLease(prisma, 'job', 60_000, async () => 'second');
    expect(second).toEqual({ acquired: false });

    release();
    expect(await first).toEqual({ acquired: true, value: 'first' });
    expect(await withCronLease(prisma, 'job', 60_000, async () => 'third')).toEqual({ acquired: true, value: 'third' });
  });
});
