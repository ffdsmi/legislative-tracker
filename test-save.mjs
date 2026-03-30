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
    const workspaceId = '6bcc0297-6ddb-4bb4-93b6-7f0ce7ab3a8c'; // from previous run
    const updates = { openStatesApiKey: 'test1234' };
    
    // Exact logic from saveSettings
    const current = await prisma.settings.findUnique({
      where: { workspaceId }
    });
    const merged = { ...current, ...updates };

    const data = {
      legiscanApiKey: merged.legiscanApiKey,
      congressApiKey: merged.congressApiKey,
      regulationsApiKey: merged.regulationsApiKey,
      openStatesApiKey: merged.openStatesApiKey,
      pollingInterval: parseInt(merged.pollInterval, 10) || 60,
      jurisdictions: JSON.stringify(merged.trackedJurisdictions || []),
      smtpHost: merged.smtpHost,
      smtpPort: parseInt(merged.smtpPort, 10) || 587,
      smtpUser: merged.smtpUser,
      smtpPass: merged.smtpPass,
      senderEmail: merged.digestEmail,
      digestSchedule: merged.digestFrequency,
    };

    const res = await prisma.settings.upsert({
      where: { workspaceId },
      create: { workspaceId, ...data },
      update: data
    });
    console.log('Upsert Success:', res);
  } catch(e) {
    console.error('Save Error:', e);
  } finally {
    prisma.$disconnect();
  }
}
main();
