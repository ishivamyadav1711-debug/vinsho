import fs from 'fs';
import Database from 'better-sqlite3';

const db = new Database('data/vinsho.db');
const products = db.prepare(`SELECT id, slug, name FROM products WHERE name LIKE '%Napkin%' OR slug LIKE '%napkin%'`).all();
console.log('Products in SQLite DB:', products);

products.forEach(p => {
  const images = db.prepare(`SELECT * FROM product_images WHERE product_id = ?`).all(p.id);
  console.log(`Images for ID ${p.id} (${p.name}):`, images);
});

function inspectJson(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  const list = Array.isArray(data) ? data : (data.products || []);
  const matches = list.filter(item => {
    const str = JSON.stringify(item).toLowerCase();
    return str.includes('napkin') || str.includes('chocochip') || str.includes('fine grain');
  });
  console.log(`Matches in ${filePath}:`, matches.map(m => ({
    id: m.id,
    slug: m.slug,
    title: m.title || m.name,
    image: m.image,
    images: m.images
  })));
}

inspectJson('vinsho-commerce-seed.json');
inspectJson('vinsho_products.json');
inspectJson('vinsho-content.json');
