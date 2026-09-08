import Database from 'better-sqlite3';
import fs from 'fs';

const db = new Database('data/vinsho.db');

const targetSlugs = ['diaries', 'photo-frames', 'pen', 'photo-frame'];

console.log('--- Checking SQLite Database ---');
const dbProducts = db.prepare(`
  SELECT id, slug, name, collection_id, subcategory_id 
  FROM products 
  WHERE slug IN ('diaries', 'photo-frames', 'pen', 'photo-frame') 
     OR lower(name) IN ('diaries', 'photo frames', 'pen', 'photo frame')
`).all();

console.log('Found in SQLite:', dbProducts);

if (dbProducts.length > 0) {
  const ids = dbProducts.map(p => p.id);
  const now = new Date().toISOString();
  for (const id of ids) {
    db.prepare('UPDATE products SET deleted_at = ? WHERE id = ?').run(now, id);
    console.log(`Soft-deleted product ID ${id} in SQLite DB`);
  }
} else {
  console.log('No matching products found in SQLite DB (or already soft deleted).');
}

// Check JSON files
const jsonFiles = ['vinsho-taxonomy.json', 'vinsho-content.json', 'vinsho-commerce-seed.json', 'vinsho_products.json'];

for (const file of jsonFiles) {
  if (fs.existsSync(file)) {
    let data = JSON.parse(fs.readFileSync(file, 'utf8'));
    let modified = false;

    if (Array.isArray(data.products)) {
      const initialCount = data.products.length;
      data.products = data.products.filter(p => !targetSlugs.includes(p.slug) && !['diaries', 'photo frames', 'pen', 'photo frame'].includes(p.name?.toLowerCase()));
      if (data.products.length !== initialCount) {
        console.log(`Removed ${initialCount - data.products.length} products from ${file}`);
        modified = true;
      }
    } else if (Array.isArray(data)) {
      const initialCount = data.length;
      data = data.filter(p => !targetSlugs.includes(p.slug) && !['diaries', 'photo frames', 'pen', 'photo frame'].includes(p.name?.toLowerCase()));
      if (data.length !== initialCount) {
        console.log(`Removed ${initialCount - data.length} products from ${file}`);
        modified = true;
      }
    }

    if (file === 'vinsho-taxonomy.json') {
      if (data.collections) {
        const giftingCol = data.collections.find(c => c.key === 'gifting-collection' || c.key === 'gifting');
        if (giftingCol) {
          if (giftingCol.blurb) {
            giftingCol.blurb = "Curated luxury gift items and handcrafted candles.";
          }
          if (giftingCol.subcategories) {
            const corpGifting = giftingCol.subcategories.find(s => s.key === 'corporate-gifting');
            if (corpGifting && corpGifting.blurb) {
              corpGifting.blurb = "Executive sets, cork planters, coasters and premium desk accessories for corporate gifting.";
            }
          }
          modified = true;
        }
      }
    }

    if (modified) {
      fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
      console.log(`Updated ${file}`);
    }
  }
}
