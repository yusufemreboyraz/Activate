import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decryptToken, safeEqual } from '@/lib/tokenCrypto';
import { createSlackPresenceApi, syncWorkspacePresence, withCronLease, type SyncResult } from '@/lib/presenceSync';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Called by Cloud Scheduler every 2 minutes. Accepts the secret either as
// "Authorization: Bearer <CRON_SECRET>" or "X-Cron-Secret: <CRON_SECRET>".
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const bearer = request.headers.get('authorization');
  const header = request.headers.get('x-cron-secret');
  if (bearer && safeEqual(bearer, `Bearer ${secret}`)) return true;
  if (header && safeEqual(header, secret)) return true;
  return false;
}

async function run(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    console.error('CRON_SECRET is not set');
    return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const outcome = await withCronLease(prisma, 'check-presence', 4 * 60 * 1000, async () => {
    const workspaces = await prisma.workspace.findMany({
      where: { status: 'active' },
      select: { id: true, botToken: true },
    });

    const results: (SyncResult | { workspaceId: string; error: string })[] = [];
    for (const ws of workspaces) {
      try {
        const slack = createSlackPresenceApi(decryptToken(ws.botToken));
        results.push(await syncWorkspacePresence(prisma, ws.id, slack));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Presence sync failed for workspace ${ws.id}:`, message);
        results.push({ workspaceId: ws.id, error: message });
      }
    }
    return results;
  });

  if (!outcome.acquired) {
    return NextResponse.json({ skipped: 'another run is in progress' });
  }

  const failed = outcome.value.filter((r) => 'error' in r);
  const body = { durationMs: Date.now() - startedAt, workspaces: outcome.value };
  console.log(JSON.stringify({ event: 'presence_sync', ...body }));
  // A non-2xx makes Cloud Scheduler record the run as failed.
  return NextResponse.json(body, { status: failed.length > 0 && failed.length === outcome.value.length ? 502 : 200 });
}

export const GET = run;
export const POST = run;
