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

async function testLeads() {
  const cookie = await login();
  http.get('http://localhost:4321/crm/leads', {
    headers: { Cookie: cookie }
  }, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Body snippet:', data.substring(0, 500));
    });
  });
}

testLeads();
