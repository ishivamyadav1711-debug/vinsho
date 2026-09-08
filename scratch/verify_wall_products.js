import Database from 'better-sqlite3';

const db = new Database('data/vinsho.db');

const rows = db.prepare(`
  SELECT p.id, p.slug, p.name, (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1) as image
  FROM products p
  WHERE p.deleted_at IS NULL AND p.slug IN ('wall-clock', 'wall-art', 'wall-art-2')
  ORDER BY p.name ASC
`).all();

console.table(rows);
console.log(`Verified ${rows.length} product(s) in SQLite DB.`);
