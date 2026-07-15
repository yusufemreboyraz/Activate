import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL; // .env.local dosyanızda tanımlı olmalı

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    console.error(`Slack OAuth Error: ${error}`);
    // Kullanıcıya bir hata sayfası göstermek daha iyi olur
    return NextResponse.redirect(`${NEXT_PUBLIC_BASE_URL}/installation-error?error=${error}`);
  }

  if (!code) {
    console.error('Slack OAuth: No code received.');
    return NextResponse.redirect(`${NEXT_PUBLIC_BASE_URL}/installation-error?error=no_code`);
  }

  if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET) {
    console.error('Slack OAuth Error: Client ID or Secret is not configured in environment variables.');
    // Bu sunucu taraflı bir yapılandırma hatası, kullanıcıya genel bir hata göster
    return NextResponse.redirect(`${NEXT_PUBLIC_BASE_URL}/installation-error?error=config_error`);
  }

  const redirectUri = `${NEXT_PUBLIC_BASE_URL}/api/auth/slack/callback`;

  try {
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: SLACK_CLIENT_ID,
        client_secret: SLACK_CLIENT_SECRET,
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json();

    if (!data.ok || !data.authed_user || !data.team) {
      console.error('Slack OAuth Error: Failed to obtain access token or team info.', data);
      let errorMessage = data.error || 'token_exchange_failed';
      if (data.needed && data.provided) { // Daha detaylı hata mesajı için
        errorMessage += ` (needed: ${data.needed}, provided: ${data.provided})`;
      }
      return NextResponse.redirect(`${NEXT_PUBLIC_BASE_URL}/installation-error?error=${errorMessage}`);
    }

    const workspaceId = data.team.id;
    const workspaceName = data.team.name;
    const botToken = data.access_token; // Slack API v2 genellikle access_token direkt olarak bot token'ıdır
    // Bazen authed_user.access_token olur, Slack dokümantasyonunu kontrol edin.
    // Ancak oauth.v2.access için dönen ana `access_token` genellikle botun token'ıdır.
    // Eğer `data.bot_user_id` ve `data.access_token` varsa, `data.access_token` bot token'ıdır.
    // Eğer `data.authed_user.access_token` varsa bu kullanıcı token'ı olabilir. Bizim bot token'ına ihtiyacımız var.
    // Slack'in oauth.v2.access dokümantasyonuna göre `data.access_token` bot için bir token OLMALI.
    // `data.token_type` "bot" ise bu kesinleşir.
    // Gelen yanıtta `data.bot_user_id` ve `data.app_id` gibi alanlar da olmalı.

    console.log(`Slack OAuth successful for workspace: ${workspaceName} (${workspaceId})`);
    // console.log('Received bot token:', botToken); // Token'ı loglamak güvenlik riski olabilir, dikkatli olun.
    // console.log('Full Slack auth data:', data);

    await prisma.workspace.upsert({
      where: { id: workspaceId },
      create: {
        id: workspaceId,
        name: workspaceName,
        botToken: botToken,
        appId: data.app_id,
        botUserId: data.bot_user_id,
        scopes: data.scope,
        status: 'active',
      },
      update: {
        name: workspaceName,
        botToken: botToken,
        appId: data.app_id,
        botUserId: data.bot_user_id,
        scopes: data.scope,
        status: 'active',
      },
    });

    console.log(`Workspace ${workspaceName} (${workspaceId}) information saved to the database.`);

    // Kullanıcıyı başarılı kurulum sayfasına veya uygulamanın ana paneline yönlendir
    return NextResponse.redirect(`${NEXT_PUBLIC_BASE_URL}/installation-success?workspace=${workspaceName}`);

  } catch (err: unknown) {
    console.error('Error during Slack OAuth token exchange or database operation:', err);
    let errorMessage = 'oauth_exception';
    if (err instanceof Error) {
        errorMessage = err.message;
    }
    return NextResponse.redirect(`${NEXT_PUBLIC_BASE_URL}/installation-error?error=${errorMessage}`);
  }
}

// Not: Geliştirme sırasında /installation-success ve /installation-error için basit sayfalar oluşturmanız gerekebilir.
// Örneğin, app/installation-success/page.tsx ve app/installation-error/page.tsx 