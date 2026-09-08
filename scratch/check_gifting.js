import Database from 'better-sqlite3';
import fs from 'fs';

const db = new Database('data/vinsho.db');

console.log('=== DB COLLECTIONS ===');
const collections = db.prepare('SELECT * FROM collections WHERE deleted_at IS NULL').all();
console.log(collections);

console.log('\n=== DB SUBCATEGORIES ===');
const subcategories = db.prepare('SELECT s.*, c.name as collection_name FROM subcategories s JOIN collections c ON s.collection_id = c.id WHERE s.deleted_at IS NULL').all();
console.log(subcategories);

console.log('\n=== DB GIFTING PRODUCTS ===');
const products = db.prepare(`
  SELECT p.id, p.slug, p.name, p.collection_id, c.name as collection, s.name as subcategory 
  FROM products p 
  JOIN collections c ON p.collection_id = c.id 
  JOIN subcategories s ON p.subcategory_id = s.id 
  WHERE p.deleted_at IS NULL AND (c.key LIKE '%gifting%' OR c.name LIKE '%gifting%')
`).all();
console.log(products);

const taxonomy = JSON.parse(fs.readFileSync('vinsho-taxonomy.json', 'utf8'));
const giftingCol = taxonomy.collections.find(c => c.key.includes('gifting'));
console.log('\n=== JSON GIFTING COLLECTION ===');
console.log(JSON.stringify(giftingCol, null, 2));

const giftingProductsInJson = taxonomy.products.filter(p => p.collectionKey === 'gifting' || p.collection === 'Gifting Collection');
console.log('\n=== JSON GIFTING PRODUCTS ===');
console.log(giftingProductsInJson.map(p => ({ slug: p.slug, name: p.name, subcategory: p.subcategory })));
