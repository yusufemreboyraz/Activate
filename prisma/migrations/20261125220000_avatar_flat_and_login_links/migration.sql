-- AlterTable
ALTER TABLE "user_statuses" ADD COLUMN     "avatarFlat" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "login_links" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "login_links_token_hash_key" ON "login_links"("token_hash");


-- Same defence in depth as the other tables (see 20261125170000_enable_rls).
ALTER TABLE "login_links" ENABLE ROW LEVEL SECURITY;
