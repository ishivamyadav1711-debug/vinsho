// Using global fetch built into Node 22

async function run() {
  const loginRes = await fetch('http://localhost:4321/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'vinvks@gmail.com', password: 'VinshoDevAdminPass2026!' })
  });
  
  const cookieHeader = loginRes.headers.get('set-cookie');
  console.log('Login Status:', loginRes.status);
  console.log('Cookie received:', cookieHeader ? cookieHeader.split(';')[0] : 'None');

  const routes = [
    '/crm',
    '/crm/dashboard',
    '/crm/leads',
    '/crm/customers',
    '/crm/products',
    '/crm/analytics',
    '/crm/settings',
    '/',
    '/cart',
    '/products'
  ];

  for (const r of routes) {
    const res = await fetch('http://localhost:4321' + r, {
      headers: { cookie: cookieHeader ? cookieHeader.split(';')[0] : '' },
      redirect: 'manual'
    });
    const loc = res.headers.get('location');
    console.log(`Route ${r.padEnd(20)} => Status: ${res.status}${loc ? ' Redirect: ' + loc : ''}`);
  }
}

run().catch(console.error);
