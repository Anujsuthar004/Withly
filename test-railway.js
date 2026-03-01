const http = require('http');

async function test() {
  const loginRes = await fetch('https://tag-along-production.up.railway.app/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test3@test.com', password: 'password123' })
  });
  if (!loginRes.ok) {
     console.log('Login failed:', await loginRes.text());
     return;
  }
  const token = (await loginRes.json()).token;

  const postRes = await fetch('https://tag-along-production.up.railway.app/api/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      mode: 'social', title: 'Railway direct post', description: 'test', location: 'loc', radius: 8, time: '', verifiedOnly: false, checkIn: false,
      tags: []
    })
  });
  console.log('Post Status:', postRes.status);
  console.log('Post Body:', await postRes.text());
}
test();
