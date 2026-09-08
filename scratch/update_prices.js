import fs from 'fs';
import Database from 'better-sqlite3';

const priceUpdates = [
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

console.log('--- Step 1: Matching Products in SQLite Database ---');
const db = new Database('data/vinsho.db');

const matchedProducts = [];
const unmatchedNames = [];

for (const item of priceUpdates) {
  // Try exact match first
  let row = db.prepare('SELECT id, slug, name, is_purchasable FROM products WHERE name = ?').get(item.name);
  
  // If not found, try case-insensitive match
  if (!row) {
    row = db.prepare('SELECT id, slug, name, is_purchasable FROM products WHERE LOWER(name) = LOWER(?)').get(item.name);
  }

  if (row) {
    matchedProducts.push({
      inputName: item.name,
      dbId: row.id,
      slug: row.slug,
      actualName: row.name,
      newPrice: item.price
    });
  } else {
    unmatchedNames.push(item.name);
  }
}

console.log(`Matched ${matchedProducts.length} of ${priceUpdates.length} products in DB.`);
if (unmatchedNames.length > 0) {
  console.warn('Unmatched Product Names:', unmatchedNames);
}

console.log('\n--- Step 2: Updating SQLite DB (products & product_variants) ---');
const updateProductPriceStmt = db.prepare('UPDATE products SET is_purchasable = 1 WHERE id = ?');
const updateVariantPriceStmt = db.prepare('UPDATE product_variants SET selling_price = ?, mrp = ? WHERE product_id = ?');

const dbTransaction = db.transaction(() => {
  for (const item of matchedProducts) {
    // Ensure product is marked purchasable if it has a price
    updateProductPriceStmt.run(item.dbId);
    
    // Check if variant exists
    const variants = db.prepare('SELECT id FROM product_variants WHERE product_id = ?').all(item.dbId);
    if (variants.length > 0) {
      updateVariantPriceStmt.run(item.newPrice, Math.round(item.newPrice * 1.25), item.dbId);
    } else {
      // Insert default variant if none exists
      db.prepare(`
        INSERT INTO product_variants (product_id, sku, size, colour, mrp, selling_price, stock, position)
        VALUES (?, ?, 'Standard', 'Standard', ?, ?, 100, 1)
      `).run(item.dbId, `SKU-${item.slug}`, Math.round(item.newPrice * 1.25), item.newPrice);
    }
    console.log(`DB Price Updated [ID ${item.dbId}, Slug "${item.slug}"]: "${item.actualName}" -> ₹${item.newPrice}`);
  }
});
dbTransaction();

console.log('\n--- Step 3: Updating JSON Files ---');

function updateJsonPrices(filePath) {
  if (!fs.existsSync(filePath)) return;
  console.log(`Updating JSON file: ${filePath}`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);

  const matchedSlugMap = new Map(matchedProducts.map(p => [p.slug, p.newPrice]));
  const matchedNameMap = new Map(matchedProducts.map(p => [p.actualName.toLowerCase(), p.newPrice]));

  let updatedCount = 0;

  function updateItem(item) {
    if (!item) return;
    let targetPrice = null;

    if (item.slug && matchedSlugMap.has(item.slug)) {
      targetPrice = matchedSlugMap.get(item.slug);
    } else if (item.name && matchedNameMap.has(item.name.toLowerCase())) {
      targetPrice = matchedNameMap.get(item.name.toLowerCase());
    }

    if (targetPrice !== null) {
      item.price = targetPrice;
      item.sellingPrice = targetPrice;
      item.mrp = Math.round(targetPrice * 1.25);
      item.isPurchasable = true;
      updatedCount++;
      console.log(`  JSON Updated [Slug "${item.slug}"]: "${item.name}" -> ₹${targetPrice}`);
    }
  }

  if (Array.isArray(data)) {
    data.forEach(updateItem);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } else if (data.products && Array.isArray(data.products)) {
    data.products.forEach(updateItem);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  console.log(`Total JSON records updated in ${filePath}: ${updatedCount}`);
}

updateJsonPrices('vinsho-commerce-seed.json');
updateJsonPrices('src/data/products/candles.json');
updateJsonPrices('vinsho_products.json');

console.log('\nPrice update operation complete!');
