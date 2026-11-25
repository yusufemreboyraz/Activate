-- AlterTable
ALTER TABLE "user_statuses" ADD COLUMN     "email" TEXT,
ADD COLUMN     "isGuest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isMember" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "user_statuses_email_idx" ON "user_statuses"("email");

