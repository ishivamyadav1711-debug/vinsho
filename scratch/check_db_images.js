import Database from 'better-sqlite3';

const db = new Database('data/vinsho.db');

const multiImageProducts = db.prepare(`
  SELECT product_id, COUNT(*) as count 
  FROM product_images 
  GROUP BY product_id 
  HAVING count > 1
`).all();

console.log('Products with >1 image:', multiImageProducts);

const sampleImages = db.prepare(`SELECT * FROM product_images LIMIT 10`).all();
console.log('Sample images:', sampleImages);
