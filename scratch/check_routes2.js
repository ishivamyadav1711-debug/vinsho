import Database from 'better-sqlite3';

const db = new Database('data/vinsho.db');

console.log('=== COLLECTIONS ===');
const collections = db.prepare("SELECT * FROM collections").all();
console.log(collections);

console.log('=== SUBCATEGORIES ===');
const subcategories = db.prepare("SELECT * FROM subcategories").all();
console.log(subcategories);

console.log('=== PRODUCTS SAMPLE ===');
const products = db.prepare("SELECT id, slug, name FROM products LIMIT 15").all();
console.log(products);
