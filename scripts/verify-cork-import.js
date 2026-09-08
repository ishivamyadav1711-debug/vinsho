import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const rootDir = process.cwd();
const productsJsonPath = path.join(rootDir, 'vinsho_products.json');
const seedJsonPath = path.join(rootDir, 'vinsho-commerce-seed.json');
const dbPath = path.join(rootDir, 'data', 'vinsho.db');

const existingProductsJson = JSON.parse(fs.readFileSync(productsJsonPath, 'utf8'));
const seedData = JSON.parse(fs.readFileSync(seedJsonPath, 'utf8'));
const db = new Database(dbPath);

console.log('--- VERIFICATION REPORT ---');
console.log(`Total products in vinsho_products.json: ${existingProductsJson.length}`);
console.log(`Total products in vinsho-commerce-seed.json: ${seedData.products.length}`);

const dbProductCount = db.prepare('SELECT count(*) as count FROM products').get().count;
console.log(`Total products in SQLite DB: ${dbProductCount}`);

const corkSkus = [
  "CORK-CMB-10", "CORK-CMB-11", "CORK-CMB-12", "CORK-CMB-13", "CORK-CMB-14",
  "CORK-CMB-29", "CORK-CMB-30", "CORK-CMB-36", "CORK-CMB-37", "CORK-CMB-44",
  "CORK-CMB-45", "CORK-CMB-18", "CORK-CMB-19", "CORK-CMB-20", "CORK-CMB-46",
  "CORK-CMB-47", "CORK-PL-PL1", "CORK-PL-PL2", "CORK-PL-PL3", "CORK-PL-PL4",
  "CORK-PL-PL5", "CORK-PL-PL6", "CORK-CO-01", "CORK-CO-02", "CORK-CO-03",
  "CORK-CO-04", "CORK-CO-05", "CORK-TR-01"
];

let verifiedCount = 0;
for (const sku of corkSkus) {
  const jsonProd = existingProductsJson.find(p => p.sku === sku);
  const seedProd = seedData.products.find(p => p.sku === sku);
  const dbProd = db.prepare('SELECT * FROM products WHERE sku = ?').get(sku);

  if (jsonProd && seedProd && dbProd) {
    verifiedCount++;
  } else {
    console.warn(`[MISSING] SKU ${sku} missing in one or more targets: json=${!!jsonProd}, seed=${!!seedProd}, db=${!!dbProd}`);
  }
}

console.log(`Verified Cork Products across all 3 data stores: ${verifiedCount} / ${corkSkus.length}`);
