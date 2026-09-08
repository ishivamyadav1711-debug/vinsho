const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const seed = JSON.parse(fs.readFileSync('vinsho-commerce-seed.json', 'utf8'));
const db = new Database('data/vinsho.db');

console.log("--- SEED PRODUCTS COUNT:", seed.products.length, "---");
seed.products.forEach((p, i) => {
  if (p.subcategoryKey === 'corporate-gifting' || p.category === 'Cork Products' || (p.subcategory && p.subcategory.toLowerCase().includes('gifting')) || p.slug.includes('combo') || p.slug.includes('cork') || p.slug.includes('planter') || p.slug.includes('coaster') || p.slug.includes('trivet') || p.slug.includes('tablemat')) {
    console.log(`[SEED ${i}] slug="${p.slug}" | name="${p.name}" | image="${p.image}"`);
  }
});

console.log("\n--- DB PRODUCTS SEARCH ---");
const dbRows = db.prepare('SELECT id, slug, name FROM products').all();
console.log("DB Total products:", dbRows.length);
dbRows.forEach(p => {
  if (p.slug.includes('combo') || p.slug.includes('cork') || p.slug.includes('planter') || p.slug.includes('coaster') || p.slug.includes('trivet') || p.slug.includes('tablemat') || p.name.toLowerCase().includes('cork') || p.name.toLowerCase().includes('combo')) {
    console.log(`[DB ${p.id}] slug="${p.slug}" | name="${p.name}"`);
  }
});
