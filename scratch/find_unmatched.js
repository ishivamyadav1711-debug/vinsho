import Database from 'better-sqlite3';

const db = new Database('data/vinsho.db');

const rows = db.prepare(`
  SELECT id, slug, name 
  FROM products 
  WHERE LOWER(name) LIKE '%rose%' 
     OR LOWER(name) LIKE '%lavender%' 
     OR LOWER(name) LIKE '%lavander%' 
     OR LOWER(name) LIKE '%bouquet%'
`).all();

console.log('Matching Products in DB:');
console.table(rows);
