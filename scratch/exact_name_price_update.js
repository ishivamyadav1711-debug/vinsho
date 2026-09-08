import fs from 'fs';
import Database from 'better-sqlite3';

const requestedUpdates = [
  { name: "Three rose candle bouquet", price: 1196 },
  { name: "Candles", price: 620 },
  { name: "Blushing Rose Candle Bouquet", price: 480 },
  { name: "Bubble Jar Candle", price: 880 },
  { name: "Caffè Latte Jar Candle", price: 769 },
  { name: "MINI CAT CANDLE", price: 360 },
  { name: "Diamond Jar Candle (Gift)", price: 960 },
  { name: "Floral Jar Candle & Sachet Combo", price: 1120 },
  { name: "Hearty Gel Wax Jar Candle", price: 740 },
  { name: "lavander pillar candle", price: 1000 },
  { name: "Mini Floral Candle Bouquet", price: 1000 },
  { name: "Orange Caramel Layered Jar Candle", price: 769 },
  { name: "Ocean Jar Candle", price: 1280 },
  { name: "Pastel Blue Bowl Candle", price: 2280 },
  { name: "Rose Garden Jar Candle", price: 1440 },
  { name: "Royal Red Peony Candle", price: 480 },
  { name: "Whipped Floral Jar Candle", price: 660 }
];

console.log('--- Step 1: Exact Name Matching in SQLite Database ---');
const db = new Database('data/vinsho.db');

const matchedExact = [];
const unmatchedNames = [];

for (const item of requestedUpdates) {
  const row = db.prepare('SELECT id, slug, name FROM products WHERE name = ?').get(item.name);
  if (row) {
    matchedExact.push({
      name: row.name,
      slug: row.slug,
      id: row.id,
      price: item.price
    });
  } else {
    unmatchedNames.push(item.name);
  }
}

console.log(`Exact Name Matches: ${matchedExact.length} / 17`);
console.log(`Unmatched Names: ${unmatchedNames.length}`);

console.log('\n--- Step 2: Updating DB for Exact Matches ---');
const updateProductStmt = db.prepare('UPDATE products SET is_purchasable = 1 WHERE id = ?');
const updateVariantStmt = db.prepare('UPDATE product_variants SET selling_price = ?, mrp = ? WHERE product_id = ?');

const dbTx = db.transaction(() => {
  for (const item of matchedExact) {
    updateProductStmt.run(item.id);
    const variants = db.prepare('SELECT id FROM product_variants WHERE product_id = ?').all(item.id);
    if (variants.length > 0) {
      updateVariantStmt.run(item.price, Math.round(item.price * 1.25), item.id);
    } else {
      db.prepare(`
        INSERT INTO product_variants (product_id, sku, size, colour, mrp, selling_price, stock, position)
        VALUES (?, ?, 'Standard', 'Standard', ?, ?, 100, 1)
      `).run(item.id, `SKU-${item.slug}`, Math.round(item.price * 1.25), item.price);
    }
    console.log(`  Updated DB [ID ${item.id}, Slug "${item.slug}"]: "${item.name}" -> ₹${item.price}`);
  }
});
dbTx();

console.log('\n--- Step 3: Updating JSON Files for Exact Matches ---');

function updateJsonExact(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);

  const exactNameMap = new Map(matchedExact.map(m => [m.name, m.price]));
  let updatedCount = 0;

  function processItem(item) {
    if (item && item.name && exactNameMap.has(item.name)) {
      const p = exactNameMap.get(item.name);
      item.price = p;
      item.sellingPrice = p;
      item.mrp = Math.round(p * 1.25);
      item.isPurchasable = true;
      updatedCount++;
    }
  }

  if (Array.isArray(data)) {
    data.forEach(processItem);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } else if (data.products && Array.isArray(data.products)) {
    data.products.forEach(processItem);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  console.log(`  Updated ${updatedCount} records in ${filePath}`);
}

updateJsonExact('vinsho-commerce-seed.json');
updateJsonExact('src/data/products/candles.json');
updateJsonExact('vinsho_products.json');

console.log('\nExact matching operation complete!');
