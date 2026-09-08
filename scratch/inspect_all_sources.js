import fs from 'fs';
import Database from 'better-sqlite3';

console.log('=== 1. Checking SQLite DB (data/vinsho.db) ===');
const db = new Database('data/vinsho.db');
const dbRows = db.prepare(`
  SELECT p.id, p.name, p.slug, (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1) as image
  FROM products p
  WHERE p.deleted_at IS NULL AND (LOWER(p.name) LIKE '%wall%' OR LOWER(p.slug) LIKE '%wall%')
`).all();
console.table(dbRows);

function inspectJson(filePath) {
  if (!fs.existsSync(filePath)) return;
  console.log(`\n=== Checking ${filePath} ===`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  const items = Array.isArray(data) ? data : (data.products || []);
  const wallItems = items.filter(p => (p.name && p.name.toLowerCase().includes('wall')) || (p.slug && p.slug.toLowerCase().includes('wall')));
  console.table(wallItems.map(p => ({ slug: p.slug, name: p.name, image: p.image })));
}

inspectJson('vinsho-commerce-seed.json');
inspectJson('vinsho_products.json');
