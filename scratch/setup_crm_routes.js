import fs from 'fs';
import path from 'path';

const srcPages = path.resolve('src/pages');
const adminDir = path.join(srcPages, 'admin');
const crmDir = path.join(srcPages, 'crm');

console.log('--- Step 1: Updating AdminLayout.astro ---');
const layoutPath = path.resolve('src/layouts/AdminLayout.astro');
let layoutContent = fs.readFileSync(layoutPath, 'utf8');

// Replace navigation and redirect paths
layoutContent = layoutContent
  .replaceAll("'/admin/login'", "'/crm/login'")
  .replaceAll('"/admin/login"', '"/crm/login"')
  .replaceAll("'/admin/crm'", "'/crm/dashboard'")
  .replaceAll('"/admin/crm"', '"/crm/dashboard"')
  .replaceAll("'/admin/leads'", "'/crm/leads'")
  .replaceAll('"/admin/leads"', '"/crm/leads"')
  .replaceAll("'/admin/customers'", "'/crm/customers'")
  .replaceAll('"/admin/customers"', '"/crm/customers"')
  .replaceAll("'/admin/products'", "'/crm/products'")
  .replaceAll('"/admin/products"', '"/crm/products"')
  .replaceAll("'/admin/analytics'", "'/crm/analytics'")
  .replaceAll('"/admin/analytics"', '"/crm/analytics"')
  .replaceAll("'/admin/settings'", "'/crm/settings'")
  .replaceAll('"/admin/settings"', '"/crm/settings"');

fs.writeFileSync(layoutPath, layoutContent, 'utf8');
console.log('AdminLayout.astro updated!');

// Helper function to process file contents replacing /admin/ with /crm/ in client links & redirects
function transformContent(content) {
  let res = content;
  // Redirects
  res = res.replaceAll("Astro.redirect('/admin/login')", "Astro.redirect('/crm/login')");
  res = res.replaceAll("Astro.redirect('/admin/crm')", "Astro.redirect('/crm/dashboard')");
  res = res.replaceAll("Astro.redirect('/admin/leads')", "Astro.redirect('/crm/leads')");
  res = res.replaceAll("Astro.redirect('/admin/customers')", "Astro.redirect('/crm/customers')");
  res = res.replaceAll("Astro.redirect('/admin/products')", "Astro.redirect('/crm/products')");

  // Location / navigation URLs in JS & HTML
  res = res.replaceAll("window.location.href = '/admin/login'", "window.location.href = '/crm/login'");
  res = res.replaceAll("window.location.href = '/admin/crm'", "window.location.href = '/crm/dashboard'");
  res = res.replaceAll("window.location.href = '/admin/leads'", "window.location.href = '/crm/leads'");
  res = res.replaceAll("href=\"/admin/crm\"", "href=\"/crm/dashboard\"");
  res = res.replaceAll("href=\"/admin/login\"", "href=\"/crm/login\"");
  res = res.replaceAll("href=\"/admin/leads\"", "href=\"/crm/leads\"");
  res = res.replaceAll("href=\"/admin/customers\"", "href=\"/crm/customers\"");
  res = res.replaceAll("href=\"/admin/products\"", "href=\"/crm/products\"");
  res = res.replaceAll("href=\"/admin/analytics\"", "href=\"/crm/analytics\"");
  res = res.replaceAll("href=\"/admin/settings\"", "href=\"/crm/settings\"");
  res = res.replaceAll("href={`/admin/leads/", "href={`/crm/leads/");
  res = res.replaceAll("href={`/admin/customers/", "href={`/crm/customers/");
  res = res.replaceAll("href={`/admin/products/", "href={`/crm/products/");

  return res;
}

// Function recursively copies directory or file from src/pages/admin to src/pages/crm
function copyAndTransform(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const children = fs.readdirSync(src);
    for (const child of children) {
      copyAndTransform(path.join(src, child), path.join(dest, child));
    }
  } else if (stat.isFile() && src.endsWith('.astro')) {
    const raw = fs.readFileSync(src, 'utf8');
    const transformed = transformContent(raw);
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(dest, transformed, 'utf8');
    console.log(`Created CRM page: ${path.relative(srcPages, dest)}`);
  }
}

console.log('\n--- Step 2: Creating CRM route files under src/pages/crm ---');
copyAndTransform(adminDir, crmDir);

// Now create src/pages/crm/dashboard.astro by copying crm.astro if needed
const crmDashboardFile = path.join(crmDir, 'dashboard.astro');
if (fs.existsSync(path.join(crmDir, 'crm.astro'))) {
  fs.copyFileSync(path.join(crmDir, 'crm.astro'), crmDashboardFile);
  console.log('Created src/pages/crm/dashboard.astro');
}

// Update src/pages/crm/index.astro to handle root /crm access:
const crmIndexContent = `---
import { getSessionUser } from '../../lib/auth';

const user = getSessionUser(Astro.request);
if (!user) {
  return Astro.redirect('/crm/login');
}
return Astro.redirect('/crm/dashboard');
---
`;
fs.writeFileSync(path.join(crmDir, 'index.astro'), crmIndexContent, 'utf8');
console.log('Updated src/pages/crm/index.astro!');

// Update src/pages/admin/index.astro and crm.astro to redirect to /crm
const adminIndexContent = `---
return Astro.redirect('/crm');
---
`;
fs.writeFileSync(path.join(adminDir, 'index.astro'), adminIndexContent, 'utf8');
if (fs.existsSync(path.join(adminDir, 'crm.astro'))) {
  fs.writeFileSync(path.join(adminDir, 'crm.astro'), `---
return Astro.redirect('/crm/dashboard');
---
`, 'utf8');
}
console.log('Updated src/pages/admin/ index & crm redirects!');
console.log('\n--- Route Setup Complete ---');
