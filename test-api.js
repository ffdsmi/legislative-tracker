const jwt = require('jsonwebtoken');
const token = jwt.sign({ userId: 'test', workspaceId: 'test', email: 'test@example.com', name: 'Test', role: 'USER' }, 'LGM_SUPER_SECRET_LOCAL_ONLY');
async function run() {
  const res = await fetch('http://localhost:3000/api/regulations', { headers: { Cookie: `token=${token}` } });
  const text = await res.text();
  console.log('GET /api/regulations:', res.status, text);

  const resStats = await fetch('http://localhost:3000/api/stats', { headers: { Cookie: `token=${token}` } });
  const statsText = await resStats.text();
  console.log('GET /api/stats:', resStats.status, statsText);
}
run();
