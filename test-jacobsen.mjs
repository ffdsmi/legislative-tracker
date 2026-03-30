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
    const count = await prisma.legislator.count();
    console.log('Global Legislators:', count);

    const legs = await prisma.legislator.findMany({
      select: { workspaceId: true, name: true, state: true, imageUrl: true }
    });
    console.log('Jacobson:', legs.filter(l => l.name.toLowerCase().includes('jacobs')));
  } catch(e) {
    console.error('Error:', e);
  } finally {
    prisma.$disconnect();
  }
}
main();
