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
    const users = await prisma.user.findMany({ select: { id: true, email: true, workspaceId: true } });
    console.log('Users:', users);
    
    // Check if b9d0 workspace has Michael Jacobson
    const jacobson = await prisma.legislator.findFirst({
      where: { name: { contains: 'Jacobson', mode: 'insensitive' } }
    });
    console.log('Jacobson in DB:', jacobson);

  } catch(e) {
    console.error('Error:', e);
  } finally {
    prisma.$disconnect();
  }
}
main();
