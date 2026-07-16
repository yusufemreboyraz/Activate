-- CreateTable
CREATE TABLE "slack_workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "botToken" TEXT NOT NULL,
    "appId" TEXT,
    "botUserId" TEXT,
    "scopes" TEXT,
    "installationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "slack_workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_statuses" (
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "presence" TEXT,
    "lastPresence" TEXT,
    "activeSessionId" TEXT,
    "statusText" TEXT,
    "statusEmoji" TEXT,
    "statusExpiration" INTEGER,
    "realName" TEXT,
    "displayName" TEXT,
    "imageOriginal" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_statuses_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "activity_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "lastSeen" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_statuses_workspaceId_idx" ON "user_statuses"("workspaceId");

-- CreateIndex
CREATE INDEX "activity_sessions_userId_workspaceId_startTime_idx" ON "activity_sessions"("userId", "workspaceId", "startTime");

-- AddForeignKey
ALTER TABLE "user_statuses" ADD CONSTRAINT "user_statuses_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "slack_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_sessions" ADD CONSTRAINT "activity_sessions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "slack_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
