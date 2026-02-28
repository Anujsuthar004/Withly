const http = require('http');

async function test() {
  const loginRes = await fetch('http://localhost:3003/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test3@test.com', password: 'password123' })
  });
  const token = (await loginRes.json()).token;

  const postRes = await fetch('http://localhost:3003/api/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      mode: 'social', title: 'Test 2', description: 'test', location: 'loc', radius: 5, time: '', verifiedOnly: false, checkIn: false,
      tags: [] // Sending exactly what app.js sends
    })
  });
  console.log('Status:', postRes.status);
}
test();
