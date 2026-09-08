import http from 'http';

function login() {
  return new Promise((resolve) => {
    const req = http.request('http://localhost:4321/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      const setCookie = res.headers['set-cookie']?.[0];
      const cookie = setCookie?.split(';')[0];
      resolve(cookie);
    });
    req.write(JSON.stringify({ email: 'admin@vinsho.com', password: 'VinshoDevAdminPass2026!' }));
    req.end();
  });
}

async function testDash() {
  const cookie = await login();
  console.log('Login Cookie:', cookie);

  http.get('http://localhost:4321/crm/dashboard', {
    headers: { Cookie: cookie }
  }, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Headers:', res.headers);
      console.log('Body length:', data.length);
      console.log('Body snippet:', data.substring(0, 300));
    });
  });
}

testDash();
