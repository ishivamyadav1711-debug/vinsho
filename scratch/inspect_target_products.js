import fs from 'fs';
import Database from 'better-sqlite3';

const db = new Database('data/vinsho.db');

const p1 = db.prepare(`SELECT id, slug, name FROM products WHERE name LIKE '%Ocean Mist Bag%' OR slug LIKE '%ocean-mist-bag%'`).get();
console.log('Ocean Mist Bag Combo 18 in DB:', p1);

const p2 = db.prepare(`SELECT id, slug, name FROM products WHERE name LIKE '%Web Printed Trivet%' OR slug LIKE '%web-printed-trivet%'`).get();
console.log('Web Printed Trivet in DB:', p2);

if (p1) {
  console.log('Images for p1:', db.prepare('SELECT * FROM product_images WHERE product_id = ?').all(p1.id));
}

if (p2) {
  console.log('Images for p2:', db.prepare('SELECT * FROM product_images WHERE product_id = ?').all(p2.id));
}
