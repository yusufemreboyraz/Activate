-- CreateTable
CREATE TABLE "cron_locks" (
    "name" TEXT NOT NULL,
    "locked_until" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cron_locks_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE INDEX "activity_sessions_workspaceId_startTime_idx" ON "activity_sessions"("workspaceId", "startTime");
