import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis;

console.log('Connecting to PostgreSQL via Prisma...');

function createPrismaClient() {
  const rawUri = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;
  const connectionString = rawUri ? rawUri.split('?')[0] : '';
  const pool = new Pool({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ 
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
  });
}

export const db = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
// touch
