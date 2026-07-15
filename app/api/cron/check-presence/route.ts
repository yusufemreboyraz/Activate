import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { determineSessionAction } from '@/lib/presenceSession';

interface SlackUser {
  id: string;
  name: string;
  is_bot: boolean;
  deleted: boolean;
  team_id?: string;
  profile?: {
    real_name?: string;
    display_name?: string;
    status_text?: string;
    status_emoji?: string;
    status_expiration?: number;
    image_original?: string;
    image_512?: string;
  };
}

interface SlackUsersListResponse {
  ok: boolean;
  members: SlackUser[];
  response_metadata?: {
    next_cursor?: string;
  };
  error?: string;
  needed?: string;
  provided?: string;
}

interface ActiveWorkspace {
  id: string;
  name: string;
  botToken: string;
}

async function getActiveWorkspaces(): Promise<ActiveWorkspace[]> {
  try {
    const workspaces = await prisma.workspace.findMany({
      where: { status: 'active' },
      select: { id: true, name: true, botToken: true },
    });
    console.log(`Found ${workspaces.length} active Slack workspaces.`);
    return workspaces;
  } catch (error) {
    console.error('Error fetching active Slack workspaces:', error);
    return [];
  }
}

async function getAllUsers(botToken: string): Promise<SlackUser[]> {
  if (!botToken) throw new Error('botToken is not provided to getAllUsers');
  let users: SlackUser[] = [];
  let cursor: string | undefined = undefined;
  console.log(`Fetching users with a provided bot token...`);
  try {
    do {
      const response: Response = await fetch(
        `https://slack.com/api/users.list?limit=200${cursor ? `&cursor=${cursor}` : ''}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${botToken}` },
        }
      );
      const data: SlackUsersListResponse = await response.json();
      if (!data.ok) {
        console.error(`Slack API Error (users.list): ${data.error} - Needed: ${data.needed}, Provided: ${data.provided}.`);
        throw new Error(`Slack API Error (users.list): ${data.error}`);
      }

      const activeUsers = data.members
        .filter((user: SlackUser) => !user.is_bot && !user.deleted)
        .map((user: SlackUser) => {
          const resolvedName = user.profile?.real_name || user.profile?.display_name || user.name;
          return { ...user, name: resolvedName };
        });

      users = users.concat(activeUsers);
      cursor = data.response_metadata?.next_cursor;
    } while (cursor);
    console.log(`Fetched ${users.length} users for the current workspace.`);
    return users;
  } catch (error) {
    console.error('Error fetching users from Slack:', error);
    return [];
  }
}

async function getUserPresence(userId: string, botToken: string): Promise<string | null> {
  if (!botToken) throw new Error('botToken is not provided to getUserPresence');
  try {
    const response = await fetch(`https://slack.com/api/users.getPresence?user=${userId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${botToken}` },
    });
    const data = await response.json();
    if (!data.ok) {
      console.error(`Slack API Error (users.getPresence for ${userId}): ${data.error} - Needed: ${data.needed}, Provided: ${data.provided}`);
      return null;
    }
    return data.presence;
  } catch (error) {
    console.error(`Error fetching presence for user ${userId}:`, error);
    return null;
  }
}

async function processWorkspace(workspace: ActiveWorkspace) {
  const { id: workspaceId, name: workspaceName, botToken } = workspace;

  console.log(`[${workspaceId}] Processing workspace: ${workspaceName}`);

  if (!botToken) {
    console.error(`[${workspaceId}] Bot token is missing for workspace ${workspaceName}. Skipping.`);
    return;
  }

  try {
    const users = await getAllUsers(botToken);
    if (!users || users.length === 0) {
      console.log(`[${workspaceId}] No users found for workspace ${workspaceName}.`);
      return;
    }
    console.log(`[${workspaceId}] Fetched ${users.length} users.`);

    for (const user of users) {
      if (!user.id || user.is_bot || user.deleted) {
        continue;
      }

      const newPresence = await getUserPresence(user.id, botToken);
      if (newPresence === null) {
        console.log(`[${workspaceId}] Could not get presence for user ${user.id} (${user.name}). Skipping.`);
        continue;
      }

      const lastStatus = await prisma.userStatus.findUnique({ where: { userId: user.id } });
      const lastPresence = lastStatus?.presence || 'away';
      const now = new Date();

      const action = determineSessionAction({
        newPresence,
        lastPresence,
        activeSessionId: lastStatus?.activeSessionId,
      });

      let activeSessionId: string | null = lastStatus?.activeSessionId ?? null;

      if (action.type === 'start') {
        console.log(`[${workspaceId}] User ${user.id} changed status to 'active'. Starting new session.`);
        const session = await prisma.activitySession.create({
          data: { userId: user.id, workspaceId, startTime: now, endTime: null, lastSeen: now },
        });
        activeSessionId = session.id;
      } else if (action.type === 'continue') {
        console.log(`[${workspaceId}] User ${user.id} is still 'active'. Updating last_seen.`);
        await prisma.activitySession.update({
          where: { id: action.sessionId },
          data: { lastSeen: now },
        });
      } else if (action.type === 'end') {
        console.log(`[${workspaceId}] User ${user.id} changed status to 'away'. Ending session.`);
        await prisma.activitySession.update({
          where: { id: action.sessionId },
          data: { endTime: now, lastSeen: now },
        });
        activeSessionId = null;
      }

      await prisma.userStatus.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          workspaceId,
          name: user.name || '',
          presence: newPresence,
          lastPresence,
          activeSessionId,
          statusText: user.profile?.status_text || '',
          statusEmoji: user.profile?.status_emoji || '',
          statusExpiration: user.profile?.status_expiration || 0,
          realName: user.profile?.real_name || '',
          displayName: user.profile?.display_name || '',
          imageOriginal: user.profile?.image_original || user.profile?.image_512 || '',
          updatedAt: now,
        },
        update: {
          workspaceId,
          name: user.name || '',
          presence: newPresence,
          lastPresence,
          activeSessionId,
          statusText: user.profile?.status_text || '',
          statusEmoji: user.profile?.status_emoji || '',
          statusExpiration: user.profile?.status_expiration || 0,
          realName: user.profile?.real_name || '',
          displayName: user.profile?.display_name || '',
          imageOriginal: user.profile?.image_original || user.profile?.image_512 || '',
          updatedAt: now,
        },
      });
    }
    console.log(`[${workspaceId}] Finished presence check for workspace: ${workspaceName}`);
  } catch (error) {
    console.error(`[${workspaceId}] Error processing workspace ${workspaceName}:`, error);
  }
}

async function runCron() {
  const activeWorkspaces = await getActiveWorkspaces();
  if (!activeWorkspaces || activeWorkspaces.length === 0) {
    console.log('No active workspaces found. Cron job ending.');
    return NextResponse.json({ message: 'No active workspaces found.' });
  }

  for (const workspace of activeWorkspaces) {
    await processWorkspace(workspace);
  }

  console.log('Cron job finished successfully for all workspaces.');
  return NextResponse.json({ message: 'Presence check completed for all workspaces.' });
}

function checkAuth(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get('authorization');
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET) {
    console.error('CRON_SECRET environment variable is not set.');
    return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
  }

  if (authHeader !== expectedToken) {
    console.warn('Unauthorized cron job access attempt.');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

export async function GET(request: NextRequest) {
  const authError = checkAuth(request);
  if (authError) return authError;

  console.log('Cron job started (GET): Checking user presences for all active workspaces...');
  try {
    return await runCron();
  } catch (error) {
    console.error('Error in cron job execution:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Cron job failed', details: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = checkAuth(request);
  if (authError) return authError;

  console.log('Cron job started (POST): Checking user presences for all active workspaces...');
  try {
    return await runCron();
  } catch (error) {
    console.error('Error in cron job execution (POST):', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Cron job failed (POST)', details: errorMessage }, { status: 500 });
  }
}
