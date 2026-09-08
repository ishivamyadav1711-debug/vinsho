import Database from 'better-sqlite3';

const db = new Database('data/vinsho.db');

const product = db.prepare('SELECT * FROM products WHERE slug = ?').get('ecodesk-diary-combo-10');
console.log('Product:', product);

if (product) {
  const images = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY position ASC, id ASC').all(product.id);
  console.log('Images in DB:', images);
}
