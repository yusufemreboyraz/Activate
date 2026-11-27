# Activate

**Who's here?** Activate is a live presence board for Slack teams. It reads every member's Slack presence every two minutes and turns it into a dashboard people actually want to open: who is active right now, today's comings and goings, a 24-hour timeline per person, the week in bars and the whole year as a heatmap. It runs for several workspaces at once, signs people in with their Slack account, and on a phone `/activate` in Slack hands you a one-tap sign-in link.

It is built to be looked at. The interface ships in two hand-built themes that share the same markup: **Afiş**, a concert poster in stock paper, ink, hard shadows and tilted stickers, and **Sinyal**, a cobalt terminal with a blinking cursor. Every screen is in Turkish, typeset for Turkish (`İ` stays `İ`).

![Today in Afiş: 5 of 7 active, today's log, and the team as poster cards](docs/screenshots/today-afis.png)

<table>
  <tr>
    <td width="68%"><img src="docs/screenshots/person-afis.png" alt="A person's day: totals, 24-hour timeline, sessions, the week and the year as a heatmap"></td>
    <td width="32%"><img src="docs/screenshots/today-afis-mobile.png" alt="Today on a phone, Afiş theme"></td>
  </tr>
</table>

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/today-sinyal.png" alt="The same day in the Sinyal theme: a terminal-style log and team list"></td>
    <td width="50%"><img src="docs/screenshots/signin-afis.png" alt="Sign-in page: KİM BURADA?"></td>
  </tr>
</table>

<sub>Screenshots use the local demo seed (`pnpm db:seed`): made-up people, believable activity.</sub>

## What you get

- **Today, live.** A big "5/7 AKTİF" headline, the team's total for the day, and a log of the latest arrivals and departures. Active people sort first; each card shows today's total, how long they've been on, and a 24-hour strip with a "now" marker.
- **Any day in the past.** Step back day by day or pick a date; the whole board, every card and every person page follows.
- **A page per person.** Total, number of sessions, longest stretch, first and last activity, a full-day timeline, the list of sessions, the week as bars and the year as a clickable heatmap.
- **Several workspaces.** Each connected Slack workspace gets its own tab with a head count. People see only the workspaces they are a current, non-guest member of.
- **Sign in with Slack, or with one tap.** Desktop users sign in with Slack. On a phone, typing `/activate` in any Slack chat replies (only to you) with your time today and this week and an "Activate'e gir" button: a one-time link valid for 10 minutes.
- **Honest numbers.** Activate measures Slack presence, not work: someone is "active" while a Slack client is open and in use. The interface says so on every page, and nothing ranks people against each other. Tell your team their presence is recorded before you turn it on.

## How it works

- **Polling.** Cloud Scheduler calls `POST /api/cron/check-presence` every 2 minutes with the `X-Cron-Secret` header. For every connected workspace the route lists members (`users.list`) and reads each member's presence (`users.getPresence`, five at a time; `@slack/web-api` honours Slack rate limits).
- **Sessions.** `lib/presenceSession.ts` is a pure state machine: a member who turns active opens an `ActivitySession`, staying active extends it (`lastSeen`), going away closes it. If no reading arrived for more than 10 minutes (a missed scheduler run, a Slack outage), the open session is closed at the last time the member was actually seen, not stretched across the gap. Members who leave the workspace get their session closed.
- **One run at a time.** A lease row in `cron_locks` (`withCronLease` in `lib/presenceSync.ts`) stops two overlapping runs from both writing sessions.
- **Days are local.** Day boundaries and times use `APP_TIMEZONE` (default `Europe/Istanbul`), see `lib/time.ts`.
- **Rendering.** Pages are React Server Components that read the day straight from Postgres (`lib/dashboard.ts`, `lib/activityService.ts`) and refresh themselves while the day is live. Authenticated JSON routes (`/api/workspaces`, `/api/user-statuses`, `/api/activity`, `/api/activity/heatmap`) expose the same data.
- **Slash command.** `POST /api/slack/webhook` verifies Slack's request signature and answers `/activate` with the caller's active time today and this week plus a sign-in link, visible only to them.
- **Design.** Both themes are tokens over one set of components (`app/styles/tokens.css`, `app/styles/app.css`, `components/brand/`); the rules are in `DESIGN.md`. The theme is a cookie, switched from the header.

## Security model

- **Who sees what.** Anyone can sign in with Slack, but a signed-in person sees a workspace only while their verified Slack email belongs to a current, non-guest member of it (`lib/access.ts`). Membership comes from the presence sync, so someone who leaves a workspace loses access within one polling interval. Pages and API routes for a workspace answer 404 to everyone else.
- **Admins** (`ADMIN_EMAILS`) follow the same viewing rule; being an admin only adds the right to connect a workspace ("＋ Slack workspace bağla" in the user menu, `/api/slack/install`), which also requires a one-time `state` cookie that the OAuth callback checks. `SLACK_ALLOWED_TEAM_IDS`, when set, limits which Slack workspaces can be connected at all.
- **Sign-in links** from `/activate` are 256-bit random tokens stored only as SHA-256 hashes, valid for 10 minutes and usable once (`lib/loginLink.ts`). Slack's request signature is what vouches for the user.
- **Every non-public route** is gated twice: by the middleware (`auth.config.ts`, `authorized`) and inside each route handler. Public paths are listed explicitly; each one authenticates its caller itself (Slack signature, cron secret, OAuth state).
- **Bot tokens** are stored AES-256-GCM encrypted (`lib/tokenCrypto.ts`, key in `TOKEN_ENCRYPTION_KEY`).
- **Database TLS** is fully verified against the Supabase root CA pinned in `prisma/supabase-root-ca-2021.crt` (`DATABASE_SSL_CA_FILE`). Row Level Security is enabled on every table with no policies, and the Supabase Data API is turned off, so nothing is reachable through Supabase's REST endpoints.

## Stack

Next.js 15 (App Router, React 19), TypeScript, Auth.js v5 (Slack OIDC + one-time links), Prisma 6 on Postgres (Supabase), `@slack/web-api`, Vitest. Runs on Cloud Run with Cloud Scheduler; total running cost is within free tiers.

## Infrastructure

| Piece | Where | Cost |
|---|---|---|
| App | Cloud Run service `activate`, project `<gcp-project>`, region `europe-west1` | Free tier |
| Schedule | Cloud Scheduler job `check-presence`, every 2 minutes | Free (3 jobs per billing account) |
| Secrets | Secret Manager in `<gcp-project>` | Cents |
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
ADMIN_EMAILS=a@example.com,b@example.com   # may connect workspaces
SLACK_ALLOWED_TEAM_IDS=                    # optional: only these Slack team IDs can be connected

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

# Look at every screen without Slack: demo data + a local session cookie
DATABASE_URL=postgresql://postgres:postgres@localhost:54329/activate_dev SEED_VIEWER_EMAIL=dev@activate.test pnpm db:seed
node scripts/dev-session.mjs dev@activate.test   # value for the authjs.session-token cookie
pnpm dev
```

Tests never touch a hosted database: `vitest.config.ts` points `DATABASE_URL` at the local container and aborts if the host is not local.

## Deploying

```bash
# Database migrations (Linux image, strict TLS against the pinned CA)
docker build --target migrate -t activate-migrate .
docker run --rm -e DATABASE_URL="<url>?sslmode=require&sslcert=/app/prisma/supabase-root-ca-2021.crt&sslaccept=strict" activate-migrate

# App
gcloud run deploy activate --source . --project <gcp-project> --region europe-west1
```

`gcloud run deploy --source` keeps the existing environment variables and secrets of the service.

## License

MIT. See `LICENSE`.
