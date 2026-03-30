import fs from 'fs';
import path from 'path';
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

async function saveLeg(workspaceId, legislator) {
  const data = {
    name: legislator.name || '',
    firstName: legislator.firstName || null,
    lastName: legislator.lastName || null,
    party: legislator.party || null,
    role: legislator.role || null,
    district: legislator.district || null,
    state: legislator.state || null,
    imageUrl: legislator.imageUrl || null,
  };

  const saved = await prisma.legislator.upsert({
    where: { workspaceId_peopleId: { workspaceId, peopleId: Number(legislator.peopleId) } },
    update: data,
    create: { workspaceId, peopleId: Number(legislator.peopleId), ...data }
  });
  return saved;
}

async function main() {
  const workspaceId = '6bcc0297-6ddb-4bb4-93b6-7f0ce7ab3a8c'; // user's current workspace
  const billsDir = path.join(process.cwd(), '.data', 'bills');
  const files = fs.readdirSync(billsDir).filter(f => f.endsWith('.json'));
  
  let count = 0;
  for (const file of files) {
    const billData = JSON.parse(fs.readFileSync(path.join(billsDir, file), 'utf-8'));
    if (billData.sponsors && Array.isArray(billData.sponsors)) {
      for (const sp of billData.sponsors) {
        if (sp.people_id) {
          try {
            await saveLeg(workspaceId, {
              peopleId: sp.people_id,
              name: sp.name,
              firstName: sp.first_name,
              lastName: sp.last_name,
              party: sp.party_id === 1 ? 'D' : sp.party_id === 2 ? 'R' : sp.party_id === 3 ? 'I' : sp.party || 'I',
              role: sp.role,
              district: String(sp.district || ''),
              state: billData.jurisdiction || billData.state,
              imageUrl: null,
              sponsoredBillIds: [billData.id || billData.bill_id],
            });
            count++;
          } catch (e) {
            console.error('Error saving:', e);
          }
        }
      }
    }
  }
  console.log('Completed sync script loop. Saved count:', count);
}
main();
