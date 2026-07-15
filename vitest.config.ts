import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

const testDbPath = path.resolve(fileURLToPath(new URL('.', import.meta.url)), 'prisma/test.db');

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    globalSetup: ['./vitest.global-setup.ts'],
    env: {
      DATABASE_URL: `file:${testDbPath}`,
    },
  },
});
