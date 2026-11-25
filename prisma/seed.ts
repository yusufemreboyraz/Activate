// Fills a LOCAL database with two example workspaces, fifteen people and 90 days
// of believable Slack activity, including people active right now, so every
// screen and state can be looked at without a Slack installation.
//
//   DATABASE_URL=postgresql://postgres:postgres@localhost:54329/activate_dev pnpm db:seed
//
// SEED_VIEWER_EMAIL (optional) is added as a member of both workspaces so a
// local session with that email can see them.
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma/client';

const url = process.env.DATABASE_URL ?? '';
const host = (() => { try { return new URL(url).hostname; } catch { return ''; } })();
if (!['localhost', '127.0.0.1'].includes(host)) {
  throw new Error(`Refusing to seed non-local database host "${host}"`);
}

const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: url })) });

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const TZ_OFFSET_MIN = 180; // Europe/Istanbul, no DST

// Deterministic randomness, so screenshots are comparable between runs.
let seed = 42;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

function localMidnight(daysAgo: number): number {
  const now = Date.now();
  const localNow = now + TZ_OFFSET_MIN * MIN;
  const localMidnightUtc = Math.floor(localNow / DAY) * DAY - TZ_OFFSET_MIN * MIN;
  return localMidnightUtc - daysAgo * DAY;
}

type Person = { id: string; name: string; email: string; rhythm: 'early' | 'normal' | 'late' | 'light'; guest?: boolean };

const WORKSPACES: { id: string; name: string; people: Person[] }[] = [
  {
    id: 'T_DEV_KLINTIFY',
    name: 'Klintify AI',
    people: [
      { id: 'U_DEV_AYSE', name: 'Ayşe Yılmaz', email: 'ayse@example.com', rhythm: 'early' },
      { id: 'U_DEV_MERT', name: 'Mert Kaya', email: 'mert@example.com', rhythm: 'normal' },
      { id: 'U_DEV_DENIZ', name: 'Deniz Er', email: 'deniz@example.com', rhythm: 'late' },
      { id: 'U_DEV_CAN', name: 'Can Şen', email: 'can@example.com', rhythm: 'light' },
      { id: 'U_DEV_IREM', name: 'İrem Güneş', email: 'irem@example.com', rhythm: 'normal' },
      { id: 'U_DEV_ONUR', name: 'Onur Çelik', email: 'onur@example.com', rhythm: 'late', guest: true },
    ],
  },
  {
    id: 'T_DEV_W3K',
    name: 'Web3Koleji',
    people: [
      { id: 'U_DEV_ZEYNEP', name: 'Zeynep Arslan', email: 'zeynep@example.com', rhythm: 'normal' },
      { id: 'U_DEV_BURAK', name: 'Burak Öztürk', email: 'burak@example.com', rhythm: 'late' },
      { id: 'U_DEV_ELIF', name: 'Elif Kurt', email: 'elif@example.com', rhythm: 'early' },
      { id: 'U_DEV_KEREM', name: 'Kerem Aydın', email: 'kerem@example.com', rhythm: 'light' },
      { id: 'U_DEV_SELIN', name: 'Selin Doğan', email: 'selin@example.com', rhythm: 'normal' },
      { id: 'U_DEV_EMRE', name: 'Emre Yıldız', email: 'emre@example.com', rhythm: 'late' },
      { id: 'U_DEV_NAZ', name: 'Naz Koç', email: 'naz@example.com', rhythm: 'normal' },
      { id: 'U_DEV_UMUT', name: 'Umut Şahin', email: 'umut@example.com', rhythm: 'light' },
    ],
  },
];

const START: Record<Person['rhythm'], number> = { early: 7.5, normal: 9.2, late: 11, light: 10 };
const LENGTH: Record<Person['rhythm'], number> = { early: 8, normal: 8.5, late: 9, light: 4 };

function sessionsFor(p: Person, daysAgo: number, nowMs: number): { start: number; end: number | null }[] {
  const weekday = new Date(localMidnight(daysAgo) + 12 * 3_600_000).getUTCDay();
  const weekend = weekday === 0 || weekday === 6;
  if (weekend && rand() < 0.75) return [];
  if (!weekend && rand() < 0.07) return []; // a day off
  const midnight = localMidnight(daysAgo);
  let t = midnight + (START[p.rhythm] + (rand() - 0.5) * 1.6) * 3_600_000;
  const stop = t + LENGTH[p.rhythm] * (weekend ? 0.3 : 0.75 + rand() * 0.4) * 3_600_000;
  const out: { start: number; end: number | null }[] = [];
  while (t < stop) {
    const len = (20 + rand() * 140) * MIN;
    const start = t;
    const end = Math.min(t + len, stop);
    if (start >= nowMs) break;
    if (end >= nowMs) { out.push({ start, end: null }); break; }
    out.push({ start, end });
    t = end + (6 + rand() * 50) * MIN;
  }
  return out;
}

async function main() {
  const nowMs = Date.now();
  await prisma.$executeRawUnsafe('TRUNCATE TABLE activity_sessions, user_statuses, slack_workspaces, cron_locks RESTART IDENTITY CASCADE');

  const viewer = process.env.SEED_VIEWER_EMAIL?.toLowerCase();

  for (const ws of WORKSPACES) {
    await prisma.workspace.create({ data: { id: ws.id, name: ws.name, botToken: 'enc:v1:dev:dev:dev', status: 'active' } });
    const people = viewer
      ? [...ws.people, { id: `U_DEV_VIEWER_${ws.id.slice(6)}`, name: 'Yusuf Emre Boyraz', email: viewer, rhythm: 'normal' as const }]
      : ws.people;

    for (const p of people) {
      let open: string | null = null;
      let lastEnd: number | null = null;
      // A few people are active right now, so the live states can be seen.
      const activeNow = ['U_DEV_AYSE', 'U_DEV_MERT', 'U_DEV_IREM', 'U_DEV_ZEYNEP', 'U_DEV_BURAK', 'U_DEV_NAZ'].includes(p.id);
      for (let d = 90; d >= 0; d--) {
        const list = sessionsFor(p, d, nowMs).filter((s) => !(activeNow && d === 0 && s.end === null));
        if (activeNow && d === 0) list.push({ start: nowMs - (20 + Math.floor(rand() * 90)) * MIN, end: null });
        if (activeNow && d === 0) for (const s of list) if (s.end !== null && s.end > list[list.length - 1]!.start) s.end = list[list.length - 1]!.start - 5 * MIN;
        for (const s of list.filter((x) => x.end === null || x.end > x.start)) {
          const row = await prisma.activitySession.create({
            data: {
              userId: p.id,
              workspaceId: ws.id,
              startTime: new Date(s.start),
              endTime: s.end ? new Date(s.end) : null,
              lastSeen: new Date(s.end ?? nowMs),
            },
          });
          if (s.end === null) open = row.id; else lastEnd = s.end;
        }
      }
      await prisma.userStatus.create({
        data: {
          userId: p.id,
          workspaceId: ws.id,
          name: p.name,
          realName: p.name,
          displayName: p.name.split(' ')[0],
          email: p.email,
          isGuest: Boolean(p.guest),
          presence: open ? 'active' : 'away',
          activeSessionId: open,
          statusText: p.rhythm === 'light' ? 'Yarı zamanlı' : '',
          statusEmoji: '',
          imageOriginal: '',
          updatedAt: new Date(nowMs - 40_000),
        },
      });
      void lastEnd;
    }
  }
  console.log('Seeded', WORKSPACES.map((w) => `${w.name} (${w.people.length})`).join(', '));
}

main().finally(() => prisma.$disconnect());
