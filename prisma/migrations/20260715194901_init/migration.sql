-- CreateTable
CREATE TABLE "slack_workspaces" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "botToken" TEXT NOT NULL,
    "appId" TEXT,
    "botUserId" TEXT,
    "scopes" TEXT,
    "installationDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active'
);

-- CreateTable
CREATE TABLE "user_statuses" (
    "userId" TEXT NOT NULL PRIMARY KEY,
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_statuses_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "slack_workspaces" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "activity_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "lastSeen" DATETIME NOT NULL,
    CONSTRAINT "activity_sessions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "slack_workspaces" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "user_statuses_workspaceId_idx" ON "user_statuses"("workspaceId");

-- CreateIndex
CREATE INDEX "activity_sessions_userId_workspaceId_startTime_idx" ON "activity_sessions"("userId", "workspaceId", "startTime");
