import Database from 'better-sqlite3';

const db = new Database('data/vinsho.db');

const rows = db.prepare(`
  SELECT 
    p.id, 
    p.name, 
    p.slug, 
    c.name as collection,
    s.name as subcategory,
    (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image
  FROM products p
  JOIN collections c ON p.collection_id = c.id
  JOIN subcategories s ON p.subcategory_id = s.id
  WHERE p.deleted_at IS NULL AND (
    LOWER(p.name) LIKE '%wall art%' OR 
    LOWER(p.name) LIKE '%wall clock%' OR 
    LOWER(p.slug) LIKE '%wall%'
  )
  ORDER BY p.id ASC
`).all();

console.log('Wall Art & Wall Clock Products in DB:');
console.table(rows);
