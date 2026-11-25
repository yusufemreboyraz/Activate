import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySlackSignature } from '@/lib/slackSignature';
import { calculateActivityForRange } from '@/lib/activityService';
import { durationTr } from '@/lib/format';
import { dateStringInZone, startOfWeek } from '@/lib/time';

export const dynamic = 'force-dynamic';

const ephemeral = (text: string) => NextResponse.json({ response_type: 'ephemeral', text });

// Slack slash commands (and Events API URL verification). Every request must
// carry a valid Slack signature.
export async function POST(request: Request) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    console.error('SLACK_SIGNING_SECRET is not set');
    return new Response('Server misconfigured', { status: 500 });
  }

  const rawBody = await request.text();
  const valid = verifySlackSignature({
    signingSecret,
    signature: request.headers.get('x-slack-signature'),
    timestamp: request.headers.get('x-slack-request-timestamp'),
    rawBody,
  });
  if (!valid) return new Response('Invalid signature', { status: 401 });

  if (request.headers.get('content-type')?.includes('application/json')) {
    try {
      const json = JSON.parse(rawBody);
      if (json?.type === 'url_verification' && typeof json.challenge === 'string') {
        return NextResponse.json({ challenge: json.challenge });
      }
    } catch {
      return new Response('Bad request', { status: 400 });
    }
    return new Response(null, { status: 200 });
  }

  const form = new URLSearchParams(rawBody);
  const command = form.get('command');
  const teamId = form.get('team_id');
  const userId = form.get('user_id');

  if (command !== '/activate') {
    return ephemeral(`Bilinmeyen komut: ${command ?? '-'}`);
  }
  if (!teamId || !userId) return ephemeral('Slack isteği eksik geldi, tekrar dener misin?');

  const workspace = await prisma.workspace.findUnique({ where: { id: teamId }, select: { status: true } });
  if (!workspace || workspace.status !== 'active') {
    return ephemeral('Bu Slack workspace’i henüz Activate’e bağlı değil.');
  }

  const today = dateStringInZone(new Date());
  const weekStart = startOfWeek(today);
  const [todayActivity, weekActivity, status] = await Promise.all([
    calculateActivityForRange(userId, teamId, today, today),
    calculateActivityForRange(userId, teamId, weekStart, today),
    prisma.userStatus.findUnique({ where: { userId }, select: { presence: true } }),
  ]);

  if (!status) {
    return ephemeral('Henüz senin için kayıt yok. Activate seni 2 dakika içinde görmeye başlar.');
  }

  const lines = [
    `*Bugün* ${durationTr(todayActivity.totalActiveMs)} · ${todayActivity.activityChanges} oturum`,
    `*Bu hafta* ${durationTr(weekActivity.totalActiveMs)}`,
    `_Slack’te aktif göründüğün süre. 2 dakikada bir okunur; çalışma süresi değildir._`,
  ];
  return ephemeral(lines.join('\n'));
}
