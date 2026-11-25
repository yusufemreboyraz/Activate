import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySlackSignature } from '@/lib/slackSignature';
import { getPersonDay } from '@/lib/dashboard';
import { createLoginLink } from '@/lib/loginLink';
import { durationTr } from '@/lib/format';
import { dateStringInZone } from '@/lib/time';

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

  const now = new Date();
  const today = dateStringInZone(now);
  const [day, status] = await Promise.all([
    getPersonDay(userId, teamId, today, now),
    prisma.userStatus.findUnique({ where: { userId }, select: { email: true, isGuest: true, isMember: true, workspaceId: true } }),
  ]);

  if (!day || !status || status.workspaceId !== teamId) {
    return ephemeral('Henüz senin için kayıt yok. Activate seni 2 dakika içinde görmeye başlar.');
  }

  const summary = [
    `*Bugün* ${durationTr(day.totalMs)} · ${day.sessions.length} aktif aralık`,
    `*Bu hafta* ${durationTr(day.weekTotalMs)}`,
  ].join('\n');
  const fine = 'Slack’te aktif göründüğün süre; 2 dakikada bir okunur, çalışma süresi değildir.';

  // A one-time sign-in link, so the dashboard opens on a phone without a
  // Slack web login. Guests and people without a synced email get none.
  const base = process.env.APP_BASE_URL?.replace(/\/+$/, '');
  if (!base || !status.email || status.isGuest || !status.isMember) {
    return ephemeral(`${summary}\n_${fine}_`);
  }
  const token = await createLoginLink(status.email, userId, now);
  const url = `${base}/signin/link?t=${token}`;

  return NextResponse.json({
    response_type: 'ephemeral',
    text: `${summary}\nActivate’e gir: ${url}`,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: summary } },
      {
        type: 'actions',
        elements: [
          { type: 'button', action_id: 'open_activate', style: 'primary', text: { type: 'plain_text', text: 'Activate’e gir' }, url },
        ],
      },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `Bağlantı yalnızca sana görünür, 10 dakika geçerli ve tek kullanımlık. ${fine}` }] },
    ],
  });
}
