import http from 'http';

const req = http.request('http://localhost:4321/api/admin/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);
    console.log('Body:', body);
  });
});

req.write(JSON.stringify({ email: 'admin@vinsho.com', password: 'VinshoDevAdminPass2026!' }));
req.end();
