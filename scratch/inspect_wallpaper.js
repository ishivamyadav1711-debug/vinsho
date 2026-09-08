import fs from 'fs';
import Database from 'better-sqlite3';

console.log('=== Checking SQLite DB ===');
const db = new Database('data/vinsho.db');
const rows = db.prepare(`
  SELECT p.id, p.name, p.slug, (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1) as image
  FROM products p
  WHERE p.deleted_at IS NULL AND (LOWER(p.name) LIKE '%wallpaper%' OR LOWER(p.name) LIKE '%wall paper%' OR LOWER(p.slug) LIKE '%wall-paper%')
`).all();
console.table(rows);

function checkJson(filePath) {
  if (!fs.existsSync(filePath)) return;
  console.log(`\n=== Checking ${filePath} ===`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  const list = Array.isArray(data) ? data : (data.products || []);
  const matches = list.filter(p => p.slug && p.slug.includes('wall-paper'));
  console.table(matches.map(m => ({ id: m.id, slug: m.slug, name: m.name, image: m.image })));
}

checkJson('vinsho-commerce-seed.json');
checkJson('vinsho_products.json');
