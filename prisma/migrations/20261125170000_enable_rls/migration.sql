-- Defence in depth for hosted Postgres (Supabase): with RLS enabled and no
-- policies, API roles such as anon/authenticated can read nothing. The app
-- connects as the table owner, which RLS does not restrict.
ALTER TABLE "slack_workspaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_statuses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activity_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cron_locks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
