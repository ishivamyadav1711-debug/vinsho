import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const db = new Database('data/vinsho.db');

const p = db.prepare(`SELECT * FROM products WHERE slug = 'round-napkin-ring'`).get();
console.log('Product in DB:', p);

const imgs = db.prepare(`SELECT * FROM product_images WHERE product_id = ?`).all(p.id);
console.log('Images in DB for product_id =', p.id, imgs);

const publicPath = path.join(process.cwd(), 'public', 'images', 'vinsho', 'products', 'Corporate-gifting', '49_round_napkin_ring.jpg');
console.log('Does public file exist on disk?', fs.existsSync(publicPath));
console.log('Public path:', publicPath);
