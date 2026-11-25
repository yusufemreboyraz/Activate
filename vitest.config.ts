import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Tests run against a throwaway local Postgres, never the production database.
// Start one with: pnpm db:test:up
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:54329/activate_test';

const host = new URL(TEST_DATABASE_URL).hostname;
if (!['localhost', '127.0.0.1', 'postgres'].includes(host) && process.env.ALLOW_REMOTE_TEST_DB !== '1') {
  throw new Error(`Refusing to run tests against non-local database host "${host}"`);
}

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    globalSetup: './test/global-setup.ts',
    fileParallelism: false,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      APP_TIMEZONE: 'Europe/Istanbul',
      TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
      ADMIN_EMAILS: 'admin@example.com, Second@Example.com',
    },
  },
});
