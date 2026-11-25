// Polls Slack presence for every member of a workspace and turns transitions
// into ActivitySession rows. Server-only. The Slack calls go through the small
// `SlackPresenceApi` interface so tests can substitute a fake.
import { WebClient } from '@slack/web-api';
import type { PrismaClient } from '@/lib/generated/prisma/client';
import { determineSessionAction, DEFAULT_MAX_GAP_MS } from '@/lib/presenceSession';

export interface SlackMember {
  id: string;
  name: string;
  realName: string;
  displayName: string;
  statusText: string;
  statusEmoji: string;
  statusExpiration: number;
  image: string;
  email: string | null; // needs the users:read.email scope
  isGuest: boolean;
}

export interface SlackPresenceApi {
  listMembers(): Promise<SlackMember[]>;
  getPresence(userId: string): Promise<'active' | 'away' | null>;
  // True when an uploaded Slack image is a flat colour square, not a photo.
  isFlatImage?(url: string): Promise<boolean>;
}

// A 512–1024 px JPEG of one flat colour weighs a few KB; any real photo at
// that size is several times larger.
const FLAT_IMAGE_MAX_BYTES = 12_000;

async function imageBytes(url: string): Promise<number | null> {
  try {
    const head = await fetch(url, { method: 'HEAD' });
    const len = Number(head.headers.get('content-length'));
    if (head.ok && len > 0) return len;
    const res = await fetch(url);
    return res.ok ? (await res.arrayBuffer()).byteLength : null;
  } catch {
    return null;
  }
}

export function createSlackPresenceApi(botToken: string): SlackPresenceApi {
  // WebClient retries and honours Slack's Retry-After on 429s on its own.
  const client = new WebClient(botToken, { retryConfig: { retries: 3 } });
  return {
    async listMembers() {
      const members: SlackMember[] = [];
      let cursor: string | undefined;
      do {
        const res = await client.users.list({ limit: 200, cursor });
        for (const m of res.members ?? []) {
          if (!m.id || m.deleted || m.is_bot || m.id === 'USLACKBOT' || m.is_app_user) continue;
          const p = m.profile ?? {};
          members.push({
            id: m.id,
            name: p.real_name || p.display_name || m.name || m.id,
            realName: p.real_name ?? '',
            displayName: p.display_name ?? '',
            statusText: p.status_text ?? '',
            statusEmoji: p.status_emoji ?? '',
            statusExpiration: p.status_expiration ?? 0,
            // Slack's generated default avatar is a flat colour square; only a
            // photo the person uploaded is worth printing, otherwise initials show.
            image: p.is_custom_image ? p.image_original || p.image_512 || p.image_192 || '' : '',
            email: p.email ? p.email.toLowerCase() : null,
            isGuest: Boolean(m.is_restricted || m.is_ultra_restricted),
          });
        }
        cursor = res.response_metadata?.next_cursor || undefined;
      } while (cursor);
      return members;
    },
    async isFlatImage(url) {
      const bytes = await imageBytes(url);
      return bytes != null && bytes < FLAT_IMAGE_MAX_BYTES;
    },
    async getPresence(userId) {
      try {
        const res = await client.users.getPresence({ user: userId });
        return res.presence === 'active' ? 'active' : res.presence === 'away' ? 'away' : null;
      } catch (err) {
        console.error(`users.getPresence failed for ${userId}:`, (err as Error).message);
        return null;
      }
    },
  };
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

export interface SyncResult {
  workspaceId: string;
  members: number;
  active: number;
  started: number;
  ended: number;
  skipped: number;
  closedForMissingMembers: number;
}

export async function syncWorkspacePresence(
  db: PrismaClient,
  workspaceId: string,
  slack: SlackPresenceApi,
  options: { now?: Date; maxGapMs?: number; concurrency?: number } = {}
): Promise<SyncResult> {
  const now = options.now ?? new Date();
  const maxGapMs = options.maxGapMs ?? DEFAULT_MAX_GAP_MS;

  const members = await slack.listMembers();
  const presences = await mapWithConcurrency(members, options.concurrency ?? 5, (m) => slack.getPresence(m.id));

  const statuses = await db.userStatus.findMany({ where: { workspaceId } });
  const statusByUser = new Map(statuses.map((s) => [s.userId, s]));
  const openSessionIds = statuses.map((s) => s.activeSessionId).filter((id): id is string => !!id);
  const openSessions = await db.activitySession.findMany({
    where: { id: { in: openSessionIds }, endTime: null },
    select: { id: true, lastSeen: true },
  });
  const openById = new Map(openSessions.map((s) => [s.id, s]));

  const result: SyncResult = {
    workspaceId,
    members: members.length,
    active: 0,
    started: 0,
    ended: 0,
    skipped: 0,
    closedForMissingMembers: 0,
  };

  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    const presence = presences[i];
    if (presence === null) {
      result.skipped++;
      continue;
    }
    if (presence === 'active') result.active++;

    const previous = statusByUser.get(member.id);
    // Only look at an avatar again when its URL changes.
    const avatarFlat =
      !member.image
        ? false
        : previous && previous.imageOriginal === member.image
          ? previous.avatarFlat
          : (await slack.isFlatImage?.(member.image)) ?? false;
    const open = previous?.activeSessionId ? openById.get(previous.activeSessionId) ?? null : null;
    const action = determineSessionAction({ newPresence: presence, openSession: open, now, maxGapMs });

    await db.$transaction(async (tx) => {
      let activeSessionId: string | null = open?.id ?? null;

      if (action.type === 'end' || action.type === 'restart') {
        await tx.activitySession.update({
          where: { id: action.sessionId },
          data: { endTime: action.endAt, lastSeen: action.endAt },
        });
        activeSessionId = null;
        result.ended++;
      }
      if (action.type === 'start' || action.type === 'restart') {
        const session = await tx.activitySession.create({
          data: { userId: member.id, workspaceId, startTime: now, lastSeen: now },
        });
        activeSessionId = session.id;
        result.started++;
      }
      if (action.type === 'continue') {
        await tx.activitySession.update({ where: { id: action.sessionId }, data: { lastSeen: now } });
      }

      const fields = {
        workspaceId,
        name: member.name,
        presence,
        lastPresence: previous?.presence ?? null,
        activeSessionId,
        statusText: member.statusText,
        statusEmoji: member.statusEmoji,
        statusExpiration: member.statusExpiration,
        realName: member.realName,
        displayName: member.displayName,
        imageOriginal: member.image,
        avatarFlat,
        email: member.email,
        isGuest: member.isGuest,
        isMember: true,
        updatedAt: now,
      };
      await tx.userStatus.upsert({
        where: { userId: member.id },
        create: { userId: member.id, ...fields },
        update: fields,
      });
    });
  }

  // Members that left the workspace (or were deactivated) lose dashboard
  // access and keep no open session.
  const memberIds = new Set(members.map((m) => m.id));
  for (const status of statuses) {
    if (memberIds.has(status.userId) || (!status.isMember && !status.activeSessionId)) continue;
    const open = status.activeSessionId ? openById.get(status.activeSessionId) : undefined;
    await db.$transaction(async (tx) => {
      if (open) {
        await tx.activitySession.update({
          where: { id: open.id },
          data: { endTime: open.lastSeen },
        });
      }
      await tx.userStatus.update({
        where: { userId: status.userId },
        data: { presence: 'away', activeSessionId: null, isMember: false, updatedAt: now },
      });
    });
    result.closedForMissingMembers++;
  }

  return result;
}

// A lease row so two overlapping scheduler runs cannot both write sessions.
// Works through any Postgres pooler (no session-level advisory locks).
export async function withCronLease<T>(
  db: PrismaClient,
  name: string,
  leaseMs: number,
  fn: () => Promise<T>
): Promise<{ acquired: true; value: T } | { acquired: false }> {
  // Timestamps are passed from Node rather than using SQL now(): Prisma stores
  // DateTime as UTC "timestamp without time zone", so mixing in now() would
  // depend on the server's TimeZone setting.
  const startedAt = new Date();
  const until = new Date(startedAt.getTime() + leaseMs);
  const rows = await db.$queryRaw<{ name: string }[]>`
    INSERT INTO cron_locks (name, locked_until) VALUES (${name}, ${until})
    ON CONFLICT (name) DO UPDATE SET locked_until = EXCLUDED.locked_until
    WHERE cron_locks.locked_until < ${startedAt}
    RETURNING name`;
  if (rows.length === 0) return { acquired: false };
  try {
    return { acquired: true, value: await fn() };
  } finally {
    await db.$executeRaw`UPDATE cron_locks SET locked_until = ${new Date()} WHERE name = ${name}`;
  }
}
