async function runTests() {
  console.log('=== Step 1: Login with initial admin credentials ===');
  const login1 = await fetch('http://localhost:4321/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'vinvks@gmail.com', password: 'VinshoDevAdminPass2026!' })
  });
  console.log('Initial login status:', login1.status);
  const cookie1 = login1.headers.get('set-cookie')?.split(';')[0];
  console.log('Cookie 1 received:', Boolean(cookie1));

  console.log('\n=== Step 2: Change password with WRONG current password ===');
  const wrongCurrent = await fetch('http://localhost:4321/api/admin/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: cookie1 || '' },
    body: JSON.stringify({
      currentPassword: 'WrongPassword123!',
      newPassword: 'VinshoNewPass2026!',
      confirmPassword: 'VinshoNewPass2026!'
    })
  });
  const wrongCurrentJson = await wrongCurrent.json();
  console.log('Wrong current status:', wrongCurrent.status, wrongCurrentJson);

  console.log('\n=== Step 3: Change password with WEAK new password ===');
  const weakNew = await fetch('http://localhost:4321/api/admin/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: cookie1 || '' },
    body: JSON.stringify({
      currentPassword: 'VinshoDevAdminPass2026!',
      newPassword: 'weak',
      confirmPassword: 'weak'
    })
  });
  const weakNewJson = await weakNew.json();
  console.log('Weak new status:', weakNew.status, weakNewJson);

  console.log('\n=== Step 4: Change password with MISMATCHED confirm password ===');
  const mismatch = await fetch('http://localhost:4321/api/admin/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: cookie1 || '' },
    body: JSON.stringify({
      currentPassword: 'VinshoDevAdminPass2026!',
      newPassword: 'VinshoNewPass2026!',
      confirmPassword: 'DifferentPass123!'
    })
  });
  const mismatchJson = await mismatch.json();
  console.log('Mismatch status:', mismatch.status, mismatchJson);

  console.log('\n=== Step 5: Change password to SAME old password ===');
  const sameOld = await fetch('http://localhost:4321/api/admin/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: cookie1 || '' },
    body: JSON.stringify({
      currentPassword: 'VinshoDevAdminPass2026!',
      newPassword: 'VinshoDevAdminPass2026!',
      confirmPassword: 'VinshoDevAdminPass2026!'
    })
  });
  const sameOldJson = await sameOld.json();
  console.log('Same old status:', sameOld.status, sameOldJson);

  console.log('\n=== Step 6: Change password to VALID NEW PASSWORD ===');
  const changeSuccess = await fetch('http://localhost:4321/api/admin/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: cookie1 || '' },
    body: JSON.stringify({
      currentPassword: 'VinshoDevAdminPass2026!',
      newPassword: 'VinshoNewPass2026!',
      confirmPassword: 'VinshoNewPass2026!'
    })
  });
  const changeSuccessJson = await changeSuccess.json();
  const cookie2 = changeSuccess.headers.get('set-cookie')?.split(';')[0];
  console.log('Change success status:', changeSuccess.status, changeSuccessJson);
  console.log('Rotated cookie 2 received:', Boolean(cookie2));

  console.log('\n=== Step 7: Try logging in with OLD password ===');
  const oldLogin = await fetch('http://localhost:4321/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'vinvks@gmail.com', password: 'VinshoDevAdminPass2026!' })
  });
  const oldLoginJson = await oldLogin.json();
  console.log('Old password login status:', oldLogin.status, oldLoginJson);

  console.log('\n=== Step 8: Try logging in with NEW password ===');
  const newLogin = await fetch('http://localhost:4321/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'vinvks@gmail.com', password: 'VinshoNewPass2026!' })
  });
  const newLoginJson = await newLogin.json();
  const cookie3 = newLogin.headers.get('set-cookie')?.split(';')[0];
  console.log('New password login status:', newLogin.status, newLoginJson);

  console.log('\n=== Step 9: Revert password back to VinshoDevAdminPass2026! ===');
  const revertRes = await fetch('http://localhost:4321/api/admin/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: cookie3 || '' },
    body: JSON.stringify({
      currentPassword: 'VinshoNewPass2026!',
      newPassword: 'VinshoDevAdminPass2026!',
      confirmPassword: 'VinshoDevAdminPass2026!'
    })
  });
  const revertJson = await revertRes.json();
  console.log('Revert status:', revertRes.status, revertJson);
}

runTests().catch(console.error);
