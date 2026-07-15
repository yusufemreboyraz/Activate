// Runs once for the whole test run (not per test file/worker) so the schema is
// only pushed a single time — running `prisma db push` concurrently from every
// worker against the same SQLite file races and fails.
import { execSync } from 'node:child_process';
import { existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

export const TEST_DB_PATH = resolve(__dirname, 'prisma/test.db');

export default function setup() {
  if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH);

  execSync('pnpm exec prisma db push --skip-generate --accept-data-loss', {
    cwd: __dirname,
    env: { ...process.env, DATABASE_URL: `file:${TEST_DB_PATH}` },
    stdio: 'inherit',
  });
}
