import Database from 'better-sqlite3';

const db = new Database('data/vinsho.db');

const rows = db.prepare(`
  SELECT p.id, p.slug, p.name, (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1) as image
  FROM products p
  WHERE p.slug IN ('fountains', 'feng-shui-turtle')
`).all();

console.table(rows);
