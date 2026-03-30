const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const settings = await prisma.settings.findFirst();
  console.log('API Key in DB:', settings?.regulationsApiKey ? (settings.regulationsApiKey.length + ' chars long') : 'NONE');
  await prisma.$disconnect();
}
run();
