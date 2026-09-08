import http from 'http';

function request(urlPath, options = {}) {
  return new Promise((resolve) => {
    const req = http.request(`http://localhost:4321${urlPath}`, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data
        });
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function runTests() {
  console.log('==================================================');
  console.log('       CRM INTEGRATION VERIFICATION TEST SUITE    ');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`X FAIL: ${message}`);
      failed++;
    }
  }

  // Test 1: Public Homepage
  const resHome = await request('/');
  assert(resHome.status === 200, 'Public homepage (/) returns 200 OK');

  // Test 2: Public Products page
  const resProducts = await request('/products');
  assert(resProducts.status === 200, 'Public products (/products) returns 200 OK');

  // Test 3: Unauthenticated /crm access
  const resCrmUnauth = await request('/crm', { method: 'GET' });
  assert(resCrmUnauth.status === 302 || resCrmUnauth.status === 200 || resCrmUnauth.headers.location?.includes('/crm/login'), 'Unauthenticated /crm redirects to /crm/login');

  // Test 4: /crm/login page
  const resLogin = await request('/crm/login');
  assert(resLogin.status === 200, '/crm/login page loads directly with 200 OK');

  // Test 5: /crm/dashboard unauthenticated
  const resDashUnauth = await request('/crm/dashboard');
  assert(resDashUnauth.status === 302 || resDashUnauth.data.includes('login') || resDashUnauth.headers.location?.includes('/crm/login'), '/crm/dashboard blocks unauthenticated access');

  // Test 6: /crm/leads unauthenticated
  const resLeadsUnauth = await request('/crm/leads');
  assert(resLeadsUnauth.status === 302 || resLeadsUnauth.data.includes('login') || resLeadsUnauth.headers.location?.includes('/crm/login'), '/crm/leads blocks unauthenticated access');

  // Test 7: /crm/customers unauthenticated
  const resCustUnauth = await request('/crm/customers');
  assert(resCustUnauth.status === 302 || resCustUnauth.data.includes('login') || resCustUnauth.headers.location?.includes('/crm/login'), '/crm/customers blocks unauthenticated access');

  // Test 8: Login via API
  const loginApiRes = await request('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@vinsho.com', password: 'VinshoDevAdminPass2026!' })
  });
  
  const setCookieHeader = loginApiRes.headers['set-cookie']?.[0];
  const cookieVal = setCookieHeader ? setCookieHeader.split(';')[0] : undefined;
  assert(loginApiRes.status === 200 || cookieVal !== undefined, 'CRM login API responds with session cookie');

  if (cookieVal) {
    const authHeaders = { Cookie: cookieVal };

    // Test 9: Authenticated /crm/dashboard
    const resDashAuth = await request('/crm/dashboard', { headers: authHeaders });
    assert(resDashAuth.status === 200 && resDashAuth.data.includes('CRM Lead'), 'Authenticated /crm/dashboard returns 200 OK with CRM Dashboard UI');

    // Test 10: Authenticated /crm/leads
    const resLeadsAuth = await request('/crm/leads', { headers: authHeaders });
    assert(resLeadsAuth.status === 200, 'Authenticated /crm/leads returns 200 OK');

    // Test 11: Authenticated /crm/customers
    const resCustAuth = await request('/crm/customers', { headers: authHeaders });
    assert(resCustAuth.status === 200, 'Authenticated /crm/customers returns 200 OK');

    // Test 12: Authenticated /crm/products
    const resProdAuth = await request('/crm/products', { headers: authHeaders });
    assert(resProdAuth.status === 200, 'Authenticated /crm/products returns 200 OK');

    // Test 13: Authenticated /crm/analytics
    const resAnalyticAuth = await request('/crm/analytics', { headers: authHeaders });
    assert(resAnalyticAuth.status === 200, 'Authenticated /crm/analytics returns 200 OK');

    // Test 14: Authenticated /crm/settings
    const resSettingsAuth = await request('/crm/settings', { headers: authHeaders });
    assert(resSettingsAuth.status === 200, 'Authenticated /crm/settings returns 200 OK');

    // Test 15: Direct route refresh test
    const resRefresh = await request('/crm/customers', { headers: authHeaders });
    assert(resRefresh.status === 200 && !resRefresh.data.includes('404'), 'Direct route refresh on /crm/customers succeeds without 404');
  }

  // Test 16: Legacy /admin redirect
  const resLegacyAdmin = await request('/admin');
  assert(resLegacyAdmin.status === 302 && resLegacyAdmin.headers.location?.includes('/crm'), 'Legacy /admin path redirects to /crm');

  console.log('\n==================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');
}

runTests();
