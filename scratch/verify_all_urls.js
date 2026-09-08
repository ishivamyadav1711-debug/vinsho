import Database from 'better-sqlite3';

const BASE = 'http://localhost:4321';

const db = new Database('data/vinsho.db');

const staticRoutes = [
  '/',
  '/about',
  '/contact',
  '/cart',
  '/grievance-officer',
  '/products',
  '/collections',
  '/gifting/create-your-hamper',
  '/policies/cancellation',
  '/policies/privacy',
  '/policies/returns',
  '/policies/shipping',
  '/policies/terms',
  '/admin',
  '/admin/login',
  '/admin/analytics',
  '/admin/audit-logs',
  '/admin/crm',
  '/admin/returns',
  '/admin/settings',
  '/checkout/address',
  '/checkout/confirmation',
  '/checkout/payment',
  '/blog'
];

const collections = db.prepare("SELECT key FROM collections").all().map(c => `/collections/${c.key}`);
const subcategories = db.prepare(`
  SELECT c.key as colKey, s.key as subKey 
  from subcategories s 
  join collections c on s.collection_id = c.id
`).all().map(s => `/collections/${s.colKey}/${s.subKey}`);

const sampleProducts = db.prepare("SELECT slug FROM products LIMIT 10").all().map(p => `/product/${p.slug}`);

const allRoutes = [...staticRoutes, ...collections, ...subcategories, ...sampleProducts];

async function checkRoutes() {
  console.log(`Testing ${allRoutes.length} routes against ${BASE}...`);
  const results = [];
  for (const route of allRoutes) {
    try {
      const res = await fetch(`${BASE}${route}`);
      results.push({ route, status: res.status, ok: res.ok });
    } catch (err) {
      results.push({ route, status: 'ERROR', error: err.message });
    }
  }
  
  console.table(results);
}

checkRoutes();
