import { execSync } from 'node:child_process';

// Brings the throwaway test database up to the current schema once per run.
// Each test file clears the tables it uses (see test/db.ts).
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:54329/activate_test';
  execSync('pnpm prisma migrate deploy', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: url } });
}
