import fs from 'fs';
import Database from 'better-sqlite3';

const db = new Database('data/vinsho.db');

const candles = db.prepare(`
  SELECT p.id, p.name, p.slug, s.name as subcategory,
         (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image
  FROM products p
  JOIN subcategories s ON p.subcategory_id = s.id
  WHERE p.deleted_at IS NULL AND (s.key = 'candles' OR p.name LIKE '%candle%' OR p.name LIKE '%bouquet%')
  ORDER BY image ASC
`).all();

const imgMap = new Map();
for (const c of candles) {
  const img = c.image || 'NO_IMAGE';
  if (!imgMap.has(img)) imgMap.set(img, []);
  imgMap.get(img).push(c);
}

console.log(`Candles with duplicate images (${candles.length} total candles checked):\n`);

let dupeCount = 0;
for (const [img, list] of imgMap.entries()) {
  if (list.length > 1) {
    dupeCount++;
    console.log(`Group ${dupeCount}: Image "${img}" (${list.length} products)`);
    list.forEach(p => {
      console.log(`  - [ID ${p.id}] ${p.name} (Slug: ${p.slug})`);
    });
    console.log('');
  }
}

if (dupeCount === 0) {
  console.log('All candles have unique images!');
}
