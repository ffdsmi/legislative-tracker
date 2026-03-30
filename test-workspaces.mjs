import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.POSTGRES_PRISMA_URL.split('?')[0],
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const ws = await prisma.workspace.findMany();
    console.log('Workspaces:', ws.map(w => w.id));
    
    const byWorkspace = await prisma.legislator.groupBy({
      by: ['workspaceId'],
      _count: { id: true }
    });
    console.log('Legislators per workspace:', byWorkspace);
  } catch(e) {
    console.error('Error:', e);
  } finally {
    prisma.$disconnect();
  }
}
main();
