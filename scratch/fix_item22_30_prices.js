import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'vinsho.db');
const db = new Database(dbPath);

console.log("Updating prices in database...");

// 1. Update Cork Tea Light Holder Assorted — Combo 46 (Item #22)
const update22 = db.prepare(`
  UPDATE product_variants
  SET selling_price = 300, mrp = 375, updated_at = ?
  WHERE product_id = 3885
`).run(new Date().toISOString());

console.log(`Updated Item #22 variant price to 300 (MRP 375). Changes: ${update22.changes}`);

// 2. Update Multi Printed Tabletop TT Planter (Item #30)
const update30 = db.prepare(`
  UPDATE product_variants
  SET selling_price = 1250, mrp = 1563, updated_at = ?
  WHERE product_id = 3893
`).run(new Date().toISOString());

console.log(`Updated Item #30 variant price to 1250 (MRP 1563). Changes: ${update30.changes}`);

console.log("\nVerifying updated prices:");

const item22 = db.prepare(`
  SELECT p.id, p.name, v.selling_price, v.mrp
  FROM products p
  JOIN product_variants v ON v.product_id = p.id
  WHERE p.id = 3885
`).get();
console.log("Item #22:", item22);

const item30 = db.prepare(`
  SELECT p.id, p.name, v.selling_price, v.mrp
  FROM products p
  JOIN product_variants v ON v.product_id = p.id
  WHERE p.id = 3893
`).get();
console.log("Item #30:", item30);
