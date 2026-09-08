import Database from 'better-sqlite3';

const db = new Database('data/vinsho.db');

const rows = db.prepare(`
  SELECT id, name, slug 
  FROM products 
  WHERE LOWER(name) LIKE '%buddha%' 
     OR LOWER(slug) LIKE '%buddha%'
`).all();

console.log('Buddha products in DB:');
console.table(rows);
