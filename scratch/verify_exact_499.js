import Database from 'better-sqlite3';

const db = new Database('data/vinsho.db');

const rows = db.prepare(`
  SELECT p.name, p.slug, pv.mrp, pv.selling_price
  FROM products p
  JOIN product_variants pv ON pv.product_id = p.id
  WHERE pv.selling_price = 499 OR pv.mrp = 499
`).all();

console.log('=== SQLITE DATABASE PRODUCTS PRICED EXACTLY 499 ===');
rows.forEach((r, i) => {
  console.log(`${i + 1}. ${r.name} | MRP: ${r.mrp} | SellingPrice: ${r.selling_price}`);
});

console.log(`\nTotal: ${rows.length} products`);
