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
    const settings = await prisma.settings.findFirst({
      where: { openStatesApiKey: { not: null, not: 'test1234' } }
    });
    
    if (!settings || !settings.openStatesApiKey) {
      console.log('No valid OpenStates API key found');
      return;
    }

    const key = settings.openStatesApiKey;
    
    console.log('Querying exact name "Michael Jacobson"...');
    let res = await fetch(`https://v3.openstates.org/people?jurisdiction=NE&name=Michael%20Jacobson`, {
      headers: { 'X-API-KEY': key }
    });
    console.log('Exact:', (await res.json()).results.length, 'results');

    console.log('Querying just "Jacobson"...');
    res = await fetch(`https://v3.openstates.org/people?jurisdiction=NE&name=Jacobson`, {
      headers: { 'X-API-KEY': key }
    });
    const data = await res.json();
    console.log('Fuzzy:', data.results.length, 'results');
    if (data.results.length > 0) {
      console.log('Found names:', data.results.map(r => r.name));
      console.log('Found images:', data.results.map(r => r.image));
    }

  } catch(e) {
    console.error('Error:', e);
  } finally {
    prisma.$disconnect();
  }
}
main();
