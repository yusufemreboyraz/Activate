# Activate

Activate tracks when people in a Slack workspace show as **active** in Slack and turns that into daily activity reports: total active time, sessions and a yearly heatmap per person. Team members can check their own numbers with the `/activate` slash command; admins see everyone on the dashboard.

It measures Slack presence, not work. Slack marks someone active while a Slack client is open and in use, so treat the numbers as "time online in Slack". Tell your team that their presence is recorded before you turn it on.

## How it works

- **Polling.** Cloud Scheduler calls `POST /api/cron/check-presence` every 2 minutes with the `X-Cron-Secret` header. For every connected workspace the route lists members (`users.list`) and reads each member's presence (`users.getPresence`, five at a time; `@slack/web-api` honours Slack rate limits).
- **Sessions.** `lib/presenceSession.ts` is a pure state machine: a member who turns active opens an `ActivitySession`, staying active extends it (`lastSeen`), going away closes it. If no reading arrived for more than 10 minutes (a missed scheduler run, a Slack outage), the open session is closed at the last time the member was actually seen, not stretched across the gap. Members who leave the workspace get their session closed.
- **One run at a time.** A lease row in `cron_locks` (`withCronLease` in `lib/presenceSync.ts`) stops two overlapping runs from both writing sessions.
- **Days are local.** Day boundaries and times use `APP_TIMEZONE` (default `Europe/Istanbul`), see `lib/time.ts`.
- **Dashboard.** Client pages call small JSON routes (`/api/workspaces`, `/api/user-statuses`, `/api/activity`, `/api/activity/heatmap`) that run Prisma queries server-side.
- **Slash command.** `POST /api/slack/webhook` verifies Slack's request signature and answers `/activate` with the caller's active time today and this week, visible only to them.

## Security model

- **Dashboard sign-in** is "Sign in with Slack". Only emails listed in `ADMIN_EMAILS` get in, and only from the workspaces in `SLACK_ALLOWED_TEAM_IDS`. The allowlist is checked on every request, so removing someone takes effect immediately.
- **Every non-public route** is gated twice: by the middleware (`auth.config.ts`, `authorized`) and by `requireAdmin()` inside each API route handler. Public paths are listed explicitly; each one authenticates its caller itself (Slack signature, cron secret, OAuth state).
- **Connecting a workspace** ("Slack workspace bağla" in the sidebar, `/api/slack/install`) requires a signed-in admin and a one-time `state` cookie that the OAuth callback checks.
- **Bot tokens** are stored AES-256-GCM encrypted (`lib/tokenCrypto.ts`, key in `TOKEN_ENCRYPTION_KEY`).
- **Database TLS** is fully verified against the Supabase root CA pinned in `prisma/supabase-root-ca-2021.crt` (`DATABASE_SSL_CA_FILE`). Row Level Security is enabled on every table with no policies, and the Supabase Data API is turned off, so nothing is reachable through Supabase's REST endpoints.

## Infrastructure

| Piece | Where | Cost |
|---|---|---|
| App | Cloud Run service `activate`, project `klintify-activate`, region `europe-west1` | Free tier |
| Schedule | Cloud Scheduler job `check-presence`, every 2 minutes | Free (3 jobs per billing account) |
| Secrets | Secret Manager in `klintify-activate` | Cents |
| Database | Supabase project `activate` (eu-west-1), Free plan, session pooler | $0 |

Supabase pauses Free projects after a week without database activity. The two-minute poll keeps it active.

## Environment variables

```env
# Postgres (Supabase session pooler, port 5432). No sslmode in the URL; TLS comes from the CA file.
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
DATABASE_SSL_CA_FILE=/app/certs/supabase-root-ca-2021.crt   # unset for a local database

APP_BASE_URL=https://activate-75469006922.europe-west1.run.app
APP_TIMEZONE=Europe/Istanbul

# Dashboard access
AUTH_SECRET=                 # openssl rand -hex 32
AUTH_TRUST_HOST=true
ADMIN_EMAILS=a@example.com,b@example.com
SLACK_ALLOWED_TEAM_IDS=T08H56KJZCZ

# Slack app
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=

# Cron + token encryption
CRON_SECRET=                 # openssl rand -hex 32
TOKEN_ENCRYPTION_KEY=        # openssl rand -base64 32
```

## Slack app

`app.slack.manifest.json` is the app's manifest (paste it into the app's **App Manifest** page). Bot scopes are `users:read` and `commands`; user scopes `openid`, `email`, `profile` are for Sign in with Slack. Redirect URLs cover both the bot install callback (`/api/auth/slack/callback`) and the sign-in callback (`/api/auth/callback/slack`).

## Development

```bash
pnpm install
pnpm db:test:up              # local Postgres on :54329 for tests (Docker)
pnpm test                    # vitest; refuses to run against a non-local database
pnpm lint && pnpm typecheck
pnpm dev
```

Tests never touch a hosted database: `vitest.config.ts` points `DATABASE_URL` at the local container and aborts if the host is not local.

## Deploying

```bash
# Database migrations (Linux image, strict TLS against the pinned CA)
docker build --target migrate -t activate-migrate .
docker run --rm -e DATABASE_URL="<url>?sslmode=require&sslcert=/app/prisma/supabase-root-ca-2021.crt&sslaccept=strict" activate-migrate

# App
gcloud run deploy activate --source . --project klintify-activate --region europe-west1
```

`gcloud run deploy --source` keeps the existing environment variables and secrets of the service.

## License

MIT. See `LICENSE`.
