const http = require('http');

async function test() {
  const loginRes = await fetch('http://localhost:3003/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test3@test.com', password: 'password123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  const postRes = await fetch('http://localhost:3003/api/requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      mode: 'social',
      title: 'Test request',
      description: 'Hi',
      category: 'explore',
      location: 'Test location',
      radius: 5,
      time: '',
      verifiedOnly: false,
      checkIn: false
    })
  });
  console.log('Status:', postRes.status);
  console.log('Body:', await postRes.text());
}
test();
