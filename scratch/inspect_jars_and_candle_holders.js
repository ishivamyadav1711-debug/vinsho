import fs from 'fs';
import Database from 'better-sqlite3';

const db = new Database('data/vinsho.db');

console.log('=== Products in DB ===');
const rows = db.prepare(`
  SELECT p.id, p.name, p.slug, (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1) as image
  FROM products p
  WHERE p.deleted_at IS NULL AND (
    LOWER(p.name) LIKE '%candle holder%' OR 
    LOWER(p.name) LIKE '%ceramic%' OR 
    LOWER(p.slug) LIKE '%candle-holder%' OR 
    LOWER(p.slug) LIKE '%ceramic%'
  )
`).all();

console.table(rows);
