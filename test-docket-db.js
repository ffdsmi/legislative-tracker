const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const ws = await prisma.workspace.findFirst();
    if (!ws) {
      console.log('No workspace');
      return;
    }
    
    console.log('Testing docket create...');
    const d = await prisma.docket.upsert({
      where: {
        id_workspaceId: { id: 'test-123', workspaceId: ws.id }
      },
      update: {},
      create: {
        id: 'test-123',
        workspaceId: ws.id,
        agency: 'NCUA',
        title: 'Test',
        type: 'Rule',
        status: 'Open'
      }
    });
    console.log('Upsert success:', !!d);

    const activeDockets = await prisma.docket.count({
      where: { 
        workspaceId: ws.id,
        status: 'Open for Comment'
      }
    });
    console.log('Count success:', activeDockets);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
