const Database = require('better-sqlite3');
const db = new Database('data/vinsho.db');

const rows = db.prepare(`
  SELECT p.id, p.slug, p.name, pi.url
  FROM products p
  LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
  JOIN subcategories s ON p.subcategory_id = s.id
  WHERE s.key = 'corporate-gifting'
`).all();

console.log("Corporate gifting DB products count:", rows.length);
rows.forEach(r => console.log(`[DB ID ${r.id}] slug="${r.slug}" | name="${r.name}" | url="${r.url}"`));
