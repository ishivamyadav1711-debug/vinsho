import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'vinsho.db');
const db = new Database(dbPath);

console.log("Checking Item #22 and Item #30 before update...");

const item22Product = db.prepare("SELECT * FROM products WHERE name LIKE '%Tea Light Holder Assorted%'").get();
console.log("Item 22 Product:", item22Product);
if (item22Product) {
  const item22Variants = db.prepare("SELECT * FROM product_variants WHERE product_id = ?").all(item22Product.id);
  console.log("Item 22 Variants:", item22Variants);
}

const item30Product = db.prepare("SELECT * FROM products WHERE name LIKE '%Multi Printed Tabletop TT Planter%'").get();
console.log("Item 30 Product:", item30Product);
if (item30Product) {
  const item30Variants = db.prepare("SELECT * FROM product_variants WHERE product_id = ?").all(item30Product.id);
  console.log("Item 30 Variants:", item30Variants);
}
