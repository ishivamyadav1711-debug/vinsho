import Database from 'better-sqlite3';

const BASE = 'http://localhost:4321';
const db = new Database('data/vinsho.db');

const staticPages = [
  { name: 'Home Page', path: '/' },
  { name: 'About Us', path: '/about' },
  { name: 'Contact Us', path: '/contact' },
  { name: 'Cart', path: '/cart' },
  { name: 'Grievance Officer', path: '/grievance-officer' },
  { name: 'All Products Catalog', path: '/products' },
  { name: 'All Collections Catalog', path: '/collections' },
  { name: 'Create Your Hamper (Gifting)', path: '/gifting/create-your-hamper' }
];

const policyPages = [
  { name: 'Cancellation Policy', path: '/policies/cancellation' },
  { name: 'Privacy Policy', path: '/policies/privacy' },
  { name: 'Return Policy', path: '/policies/returns' },
  { name: 'Shipping Policy', path: '/policies/shipping' },
  { name: 'Terms of Service', path: '/policies/terms' }
];

const checkoutPages = [
  { name: 'Checkout - Address', path: '/checkout/address' },
  { name: 'Checkout - Payment', path: '/checkout/payment' },
  { name: 'Checkout - Order Confirmation', path: '/checkout/confirmation' }
];

const adminPages = [
  { name: 'Admin Dashboard Overview', path: '/admin' },
  { name: 'Admin Login', path: '/admin/login' },
  { name: 'Admin Analytics', path: '/admin/analytics' },
  { name: 'Admin Audit Logs', path: '/admin/audit-logs' },
  { name: 'Admin CRM & Customers', path: '/admin/crm' },
  { name: 'Admin Returns Management', path: '/admin/returns' },
  { name: 'Admin Store Settings', path: '/admin/settings' }
];

const blogPages = [
  { name: 'Blog Index', path: '/blog' }
];

const collections = db.prepare("SELECT key, name FROM collections").all();
const collectionPages = collections.map(c => ({
  name: `Collection: ${c.name}`,
  path: `/collections/${c.key}`
}));

const subcategories = db.prepare(`
  SELECT c.key as colKey, s.key as subKey, s.name as subName, c.name as colName
  FROM subcategories s 
  JOIN collections c ON s.collection_id = c.id
`).all();

const subcategoryPages = subcategories.map(s => ({
  name: `${s.colName} -> ${s.subName}`,
  path: `/collections/${s.colKey}/${s.subKey}`
}));

const products = db.prepare("SELECT slug, name FROM products ORDER BY name ASC").all();
const productPages = products.map(p => ({
  name: p.name,
  path: `/product/${p.slug}`
}));

async function verifyGroup(title, list) {
  console.log(`\n=== ${title} ===`);
  const working = [];
  for (const item of list) {
    try {
      const res = await fetch(`${BASE}${item.path}`, { redirect: 'follow' });
      if (res.ok) {
        working.push({ name: item.name, path: item.path, status: res.status });
      } else {
        console.log(`[${res.status}] ${item.name} (${item.path})`);
      }
    } catch (e) {
      console.log(`[ERR] ${item.name} (${item.path}): ${e.message}`);
    }
  }
  console.log(`Working: ${working.length} / ${list.length}`);
  return working;
}

async function main() {
  const verified = {};
  verified.static = await verifyGroup('Static Core Pages', staticPages);
  verified.policies = await verifyGroup('Legal & Policy Pages', policyPages);
  verified.checkout = await verifyGroup('Checkout Flow Pages', checkoutPages);
  verified.admin = await verifyGroup('Admin Portal Pages', adminPages);
  verified.blog = await verifyGroup('Blog Pages', blogPages);
  verified.collections = await verifyGroup('Collections', collectionPages);
  verified.subcategories = await verifyGroup('Subcategories', subcategoryPages);
  verified.products = await verifyGroup('Products Catalog', productPages);

  console.log('\nTOTAL WORKING PAGES:', 
    verified.static.length + 
    verified.policies.length + 
    verified.checkout.length + 
    verified.admin.length + 
    verified.blog.length + 
    verified.collections.length + 
    verified.subcategories.length + 
    verified.products.length
  );
}

main();
