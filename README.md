# Activate

Activate is a Next.js web application that tracks Slack users' presence (`active` / `away`) over time and turns it into per-user activity reports: total active time, number of activity sessions, and a timeline of status changes for a given day.

It supports multiple Slack workspaces at once. Each workspace installs the Slack app via OAuth; the resulting bot token is stored in the database and used to poll that workspace's users.

## How it works

- A cron-triggered endpoint (`GET`/`POST /api/cron/check-presence`) reads all active workspaces from the database, calls the Slack Web API (`users.list`, `users.getPresence`) for each workspace's users, and diffs the new presence against the last known value.
- Transitions between `active` and `away` open or close an `ActivitySession` row, which is what lets the app compute total active time and session counts per day. The start/continue/end decision is a pure function (`lib/presenceSession.ts`), unit tested independently of Slack or the database.
- The current status of every user is kept in a `UserStatus` row and is what the dashboard reads.
- The dashboard itself never talks to the database directly — client components (`app/page.tsx`, `app/users/[userId]/page.tsx`, `stores/workspaceStore.ts`) fetch from small JSON API routes (`/api/workspaces`, `/api/user-statuses`, `/api/activity`, `/api/activity/heatmap`), which run the Prisma queries server-side.
- A dashboard (`app/page.tsx` and related components) renders this data as tables, cards, and an activity heatmap, with a workspace switcher backed by a Zustand store.
- A Slack slash command handler (`POST /api/slack/webhook`) verifies the Slack request signature and implements a `/meeting` command that creates a Google Meet space (via a Google service account / OAuth refresh token) and posts the link back to the channel.
- Sign-in to the dashboard itself uses NextAuth.js with a simple credentials provider (a single configured username/password), not Slack OAuth — Slack OAuth is only used to install the bot into a workspace.

## Tech stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Prisma + SQLite (local file database) as the data store — see [Database](#database) below
- NextAuth.js (`next-auth` v5 beta) for dashboard authentication
- `@slack/web-api` for Slack API calls
- `@google-apps/meet`, `google-auth-library`, `googleapis` for the `/meeting` slash command
- Tailwind CSS + shadcn/ui (Radix primitives) + Recharts/Tremor for the UI
- Zustand for client-side workspace state
- Vitest for unit tests

## Project structure

```
app/
  api/auth/[...nextauth]/    NextAuth route handlers
  api/auth/slack/callback/   Slack OAuth callback — exchanges code, upserts the workspace + bot token
  api/auth/google/callback/  Google OAuth callback (Meet integration setup)
  api/cron/check-presence/   Polls Slack presence for all active workspaces, writes sessions/status
  api/slack/webhook/         Slack event/slash-command endpoint (signature-verified), handles /meeting
  api/test-presence/         Manual test endpoint for a single hardcoded Slack user ID
  api/workspaces/            List active workspaces (used by the workspace switcher)
  api/user-statuses/         List/get user statuses for a workspace
  api/activity/              Per-day activity (work sessions, total active time)
  api/activity/heatmap/      A full year of daily activity totals in one query
  users/[userId]/            Per-user activity detail page
  page.tsx                   Main dashboard
components/                  Dashboard UI (sidebar, tables, cards, charts) and shadcn/ui primitives
prisma/schema.prisma          Database schema (Workspace, UserStatus, ActivitySession)
lib/prisma.ts                 Prisma client singleton (server-only)
lib/activityService.ts        Session/activity calculations that hit the database (server-only)
lib/activityUtils.ts          Pure formatting helpers + shared types, safe to import from client components
lib/presenceSession.ts        Pure active/away session state machine used by the cron job
stores/workspaceStore.ts      Zustand store for the selected workspace (fetches /api/workspaces)
auth.ts / auth.config.ts      NextAuth configuration (credentials provider)
middleware.ts                 Route protection, delegates to auth.ts
app.slack.manifest.json       Slack app manifest (bot scopes: users:read)
```

## Database

Local development uses SQLite through Prisma — no external service or account needed. The database file lives at `prisma/dev.db` and is gitignored.

```bash
pnpm prisma migrate dev   # apply schema changes, creates prisma/dev.db on first run
pnpm prisma studio        # browse/edit the local database in a GUI
```

To move to a hosted Postgres database later (Supabase, Google Cloud SQL, Neon, etc.), change `provider` in `prisma/schema.prisma` from `sqlite` to `postgresql` and point `DATABASE_URL` at the hosted connection string — the application code (`lib/prisma.ts` and everything built on top of it) doesn't change.

## Environment variables

These are the environment variables actually read by the code:

```env
# Local SQLite database (used by lib/prisma.ts and the Prisma CLI).
# Must be an absolute path: the Prisma CLI resolves relative "file:" URLs relative
# to prisma/schema.prisma, while the Prisma Client at runtime resolves them relative
# to the process cwd — those disagree on a relative path, so use an absolute one,
# e.g. DATABASE_URL="file:/absolute/path/to/repo/prisma/dev.db"
DATABASE_URL="file:/absolute/path/to/repo/prisma/dev.db"

# Base URL used to build OAuth redirect/callback URLs
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Dashboard login (NextAuth credentials provider)
AUTH_USERNAME=
AUTH_PASSWORD=
AUTH_SECRET=            # openssl rand -hex 32

# Slack app OAuth (installing the bot into a workspace)
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=

# Slack request verification (for /api/slack/webhook)
SLACK_SIGNING_SECRET=

# Slack bot token, only used by the manual /api/test-presence endpoint
# (the cron job instead uses per-workspace bot tokens stored in the database)
SLACK_BOT_TOKEN=

# Cron job authorization for /api/cron/check-presence (Authorization: Bearer <CRON_SECRET>)
CRON_SECRET=

# Google OAuth (for the /meeting slash command, creates Google Meet spaces)
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
```

Note: what triggers `/api/cron/check-presence` on a schedule (Vercel Cron, GitHub Actions, or something else) is not part of this repository — you need to set that up yourself and send `Authorization: Bearer <CRON_SECRET>` with the request.

## Slack app configuration

`app.slack.manifest.json` defines the Slack app used by this project:

- Bot scopes: `users:read`
- User scope: `users:read`
- Socket mode and org-wide install are disabled

To connect a workspace, create/configure a Slack app with these scopes, set its OAuth redirect URL to `<NEXT_PUBLIC_BASE_URL>/api/auth/slack/callback`, and point Slack event/slash-command requests at `<NEXT_PUBLIC_BASE_URL>/api/slack/webhook`.

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Create a `.env.local` file with the variables listed above.
3. Apply the database schema (creates `prisma/dev.db`):
   ```bash
   pnpm prisma migrate dev
   ```
4. Run the dev server:
   ```bash
   pnpm dev
   ```
   The app runs at http://localhost:3000.

Other scripts: `pnpm build`, `pnpm start`, `pnpm lint`, `pnpm test`.

## License

MIT. See `LICENSE`.
