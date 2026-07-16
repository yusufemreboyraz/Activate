import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;

export async function POST(request: Request) {
  if (!SLACK_SIGNING_SECRET) {
    console.error("SLACK_SIGNING_SECRET is not defined in environment variables.");
    return new Response("Internal Server Error: Slack signing secret not configured.", { status: 500 });
  }

  const signature = request.headers.get('x-slack-signature');
  const timestamp = request.headers.get('x-slack-request-timestamp');

  const rawBody = await request.clone().text(); // Klonla, çünkü body bir kez okunabilir

  if (!signature || !timestamp) {
    console.warn("Warning: Slack signature or timestamp missing from request headers.");
    return new Response("Forbidden: Missing Slack signature or timestamp.", { status: 403 });
  }

  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - (60 * 5);
  if (parseInt(timestamp, 10) < fiveMinutesAgo) {
    console.warn("Warning: Slack request timestamp is too old.");
    return new Response("Forbidden: Slack request timestamp too old.", { status: 403 });
  }

  const sigBasestring = `v0:${timestamp}:${rawBody}`;
  const mySignature = 'v0=' +
    crypto.createHmac('sha256', SLACK_SIGNING_SECRET)
      .update(sigBasestring, 'utf8')
      .digest('hex');

  try {
    if (!crypto.timingSafeEqual(Buffer.from(mySignature, 'utf8'), Buffer.from(signature, 'utf8'))) {
      console.warn("Warning: Invalid Slack signature.");
      return new Response("Forbidden: Invalid Slack signature.", { status: 403 });
    }
  } catch {
    console.error("Error during timingSafeEqual (signatures might have different lengths or other issue):");
    return new Response("Forbidden: Signature comparison failed.", { status: 403 });
  }

  console.log("Slack request signature verified successfully.");

  // Önce URL verification kontrolü (genellikle JSON formatında gelir)
  try {
    const jsonData = JSON.parse(rawBody); // rawBody'yi direkt kullan
    if (jsonData && jsonData.type === "url_verification" && jsonData.challenge) {
      console.log("Responding to Slack URL verification challenge.");
      return NextResponse.json({ challenge: jsonData.challenge });
    }
  } catch {
    // JSON parse hatası, muhtemelen slash command (x-www-form-urlencoded)
    console.log("Not a JSON body or not a URL verification, proceeding to parse as form data.");
  }

  // Slash komutları için x-www-form-urlencoded parse et
  let formPayload: URLSearchParams;
    try {
    formPayload = new URLSearchParams(rawBody);
  } catch (e) {
    console.error("Failed to parse Slack request body as x-www-form-urlencoded:", e);
    // response_url burada henüz bilinmiyor olabilir, genel hata dön
    return new Response("Bad Request: Could not parse body.", { status: 400 });
  }

  const teamId = formPayload.get('team_id');
  const command = formPayload.get('command');
  const slackResponseUrl = formPayload.get('response_url');

  if (!teamId) {
    console.error("team_id missing from Slack request body.");
    if (slackResponseUrl) {
        try {
            await fetch(slackResponseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: 'Error: Missing team_id in request.' }),
            });
        } catch (fetchError) {
            console.error("Error sending error via response_url for missing team_id:", fetchError);
        }
    }
    return new Response(null, { status: 200 });
  }

  // Veritabanından workspace için bot_token al
  let workspaceBotToken: string | null = null;
  try {
    const workspace = await prisma.workspace.findUnique({ where: { id: teamId } });

    if (workspace) {
      if (workspace.status === 'active' && workspace.botToken) {
        workspaceBotToken = workspace.botToken;
        console.log(`Retrieved bot token for workspace ${teamId}`);
      } else {
        console.warn(`Workspace ${teamId} is not active, bot_token is missing, or data is malformed. Data:`, workspace);
      }
    } else {
      console.warn(`Workspace ${teamId} not found in the database.`);
    }
  } catch (dbError) {
    console.error(`Error fetching workspace ${teamId} from the database:`, dbError);
    if (slackResponseUrl) {
        try {
            await fetch(slackResponseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: 'Error: Could not retrieve workspace configuration.' }),
            });
        } catch (fetchError) {
            console.error("Error sending error via response_url for dbError:", fetchError);
        }
    }
    return new Response(null, { status: 200 });
  }

  if (!workspaceBotToken) {
    console.error(`Bot token not found or workspace not active for team_id: ${teamId}`);
          if (slackResponseUrl) {
        try {
            await fetch(slackResponseUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: 'Error: This Slack workspace is not configured correctly, is inactive, or bot token is missing.' }),
            });
        } catch (fetchError) {
            console.error("Error sending error via response_url for missing bot token:", fetchError);
        }
    }
    return new Response(null, { status: 200 });
  }

  // Şimdi komutları işle
  if (command) {
    console.log(`Received unknown command: ${command} for team_id: ${teamId}`);
    if (slackResponseUrl) {
        try {
            await fetch(slackResponseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: `Bilinmeyen komut: ${command}` }),
            });
        } catch (fetchError) {
            console.error("Error sending unknown command error via response_url:", fetchError);
        }
    }
    return new Response(null, { status: 200 });
  }

  // Komut yoksa, event olabilir (bu örnekte sadece slash command handle ediliyor)
  console.log(`Received Slack request without a command for team_id: ${teamId}. Body keys: ${Array.from(formPayload.keys()).join(', ')}`);
  return new Response(null, { status: 200 }); // Genel OK
}
