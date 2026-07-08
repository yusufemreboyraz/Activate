# Activate

Activate is a Next.js web application that tracks Slack users' presence (`active` / `away`) over time and turns it into per-user activity reports: total active time, number of activity sessions, and a timeline of status changes for a given day.

It supports multiple Slack workspaces at once. Each workspace installs the Slack app via OAuth; the resulting bot token is stored in Firestore and used to poll that workspace's users.

## How it works

- A cron-triggered endpoint (`GET`/`POST /api/cron/check-presence`) reads all active workspaces from Firestore, calls the Slack Web API (`users.list`, `users.getPresence`) for each workspace's users, and diffs the new presence against the last known value.
- Transitions between `active` and `away` open or close an "activity session" document in Firestore (`activity_sessions`), which is what lets the app compute total active time and session counts per day.
- The current status of every user is kept in a `user_statuses` collection and is what the dashboard reads.
- A dashboard (`app/page.tsx` and related components) renders this data as tables, cards, and an activity heatmap, with a workspace switcher backed by a Zustand store.
- A Slack slash command handler (`POST /api/slack/webhook`) verifies the Slack request signature and implements a `/meeting` command that creates a Google Meet space (via a Google service account / OAuth refresh token) and posts the link back to the channel.
- Sign-in to the dashboard itself uses NextAuth.js with a simple credentials provider (a single configured username/password), not Slack OAuth — Slack OAuth is only used to install the bot into a workspace.

## Tech stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Firebase / Firestore (`firebase`, `firebase-admin`) as the data store
- NextAuth.js (`next-auth` v5 beta) for dashboard authentication
- `@slack/web-api` for Slack API calls
- `@google-apps/meet`, `google-auth-library`, `googleapis` for the `/meeting` slash command
- Tailwind CSS + shadcn/ui (Radix primitives) + Recharts/Tremor for the UI
- Zustand for client-side workspace state

## Project structure

```
app/
  api/auth/[...nextauth]/    NextAuth route handlers
  api/auth/slack/callback/   Slack OAuth callback — exchanges code, stores bot token in Firestore
  api/auth/google/callback/  Google OAuth callback (Meet integration setup)
  api/cron/check-presence/   Polls Slack presence for all active workspaces, writes to Firestore
  api/slack/webhook/         Slack event/slash-command endpoint (signature-verified), handles /meeting
  api/test-presence/         Manual test endpoint for a single hardcoded Slack user ID
  users/[userId]/            Per-user activity detail page
  page.tsx                   Main dashboard
components/                  Dashboard UI (sidebar, tables, cards, charts) and shadcn/ui primitives
lib/firebase.ts              Firestore client initialization
lib/activityUtils.ts         Activity/session calculation helpers used by the dashboard
stores/workspaceStore.ts     Zustand store for the selected workspace
auth.ts / auth.config.ts     NextAuth configuration (credentials provider)
middleware.ts                Route protection, delegates to auth.ts
app.slack.manifest.json      Slack app manifest (bot scopes: users:read, users:read.presence)
```

## Environment variables

These are the environment variables actually read by the code:

```env
# Firebase (client SDK config, used by lib/firebase.ts)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

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
# (the cron job instead uses per-workspace bot tokens stored in Firestore)
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

- Bot scopes: `users:read`, `users:read.presence`
- User scope: `users:read`
- Socket mode and org-wide install are disabled

To connect a workspace, create/configure a Slack app with these scopes, set its OAuth redirect URL to `<NEXT_PUBLIC_BASE_URL>/api/auth/slack/callback`, and point Slack event/slash-command requests at `<NEXT_PUBLIC_BASE_URL>/api/slack/webhook`.

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Create a `.env.local` file with the variables listed above.
3. Run the dev server:
   ```bash
   pnpm dev
   ```
   The app runs at http://localhost:3000.

Other scripts: `pnpm build`, `pnpm start`, `pnpm lint`.

## License

MIT. See `LICENSE`.
