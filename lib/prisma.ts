import fs from 'node:fs';
import { Pool, type PoolConfig } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/lib/generated/prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; pgPool?: Pool };

// TLS for hosted Postgres. DATABASE_SSL_CA_FILE points at the provider's root
// CA (prisma/supabase-root-ca-2021.crt for Supabase) so the server certificate
// is fully verified. Without it, local databases connect without TLS.
function sslConfig(): PoolConfig['ssl'] {
  const caFile = process.env.DATABASE_SSL_CA_FILE;
  if (!caFile) return undefined;
  return { ca: fs.readFileSync(caFile, 'utf8'), rejectUnauthorized: true };
}

function createPool(): Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: sslConfig(),
    max: 5,
    idleTimeoutMillis: 30_000,
  });
}

// Created once per process and reused across requests.
const pool = globalForPrisma.pgPool ?? createPool();
const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pgPool = pool;
}
