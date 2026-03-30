import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'LGM_SUPER_SECRET_LOCAL_ONLY';
const workspaceId = '6bcc0297-6ddb-4bb4-93b6-7f0ce7ab3a8c'; // user workspace
const userId = 'local-test';

const token = jwt.sign({ userId, workspaceId, role: 'admin' }, JWT_SECRET);

async function testApi() {
  const payload = {
    openStatesApiKey: 'test123'
  };

  const res = await fetch('http://localhost:3000/api/settings', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `token=${token}`
    },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Body:', text);
}
testApi();
