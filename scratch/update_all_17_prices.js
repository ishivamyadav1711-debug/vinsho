import fs from 'fs';
import Database from 'better-sqlite3';

const priceUpdatesBySlug = [
  { requestedName: "Three rose candle bouquet", slug: "3-rose-candle-bouquet", price: 1196 },
  { requestedName: "Candles", slug: "candles", price: 620 },
  { requestedName: "Blushing Rose Candle Bouquet", slug: "blushing-rose-candle-bouquet", price: 480 },
  { requestedName: "Bubble Jar Candle", slug: "bubble-jar-candle", price: 880 },
  { requestedName: "Caffè Latte Jar Candle", slug: "caffe-latte-jar-candle", price: 769 },
  { requestedName: "MINI CAT CANDLE", slug: "mini-teddy-jar-candle", price: 360 },
  { requestedName: "Diamond Jar Candle (Gift)", slug: "diamond-jar-candle-gift", price: 960 },
  { requestedName: "Floral Jar Candle & Sachet Combo", slug: "floral-jar-candle-sachet-combo", price: 1120 },
  { requestedName: "Hearty Gel Wax Jar Candle", slug: "hearty-gel-wax-jar-candle", price: 740 },
  { requestedName: "lavander pillar candle", slug: "lavender-botanical-pillar-candle", price: 1000 },
  { requestedName: "Mini Floral Candle Bouquet", slug: "mini-floral-candle-bouquet", price: 1000 },
  { requestedName: "Orange Caramel Layered Jar Candle", slug: "orange-caramel-layered-jar-candle", price: 769 },
  { requestedName: "Ocean Jar Candle", slug: "ocean-jar-candle", price: 1280 },
  { requestedName: "Pastel Blue Bowl Candle", slug: "pastel-blue-bowl-candle", price: 2280 },
  { requestedName: "Rose Garden Jar Candle", slug: "rose-garden-jar-candle", price: 1440 },
  { requestedName: "Royal Red Peony Candle", slug: "royal-red-peony-candle", price: 480 },
  { requestedName: "Whipped Floral Jar Candle", slug: "whipped-floral-jar-candle", price: 660 }
];

console.log('--- Updating SQLite DB for all 17 products ---');
const db = new Database('data/vinsho.db');

const updateProductStmt = db.prepare('UPDATE products SET is_purchasable = 1 WHERE id = ?');
const updateVariantStmt = db.prepare('UPDATE product_variants SET selling_price = ?, mrp = ? WHERE product_id = ?');

const verifiedList = [];

for (const item of priceUpdatesBySlug) {
  const row = db.prepare('SELECT id, slug, name, is_purchasable FROM products WHERE slug = ?').get(item.slug);
  if (row) {
    updateProductStmt.run(row.id);
    const variants = db.prepare('SELECT id FROM product_variants WHERE product_id = ?').all(row.id);
    if (variants.length > 0) {
      updateVariantStmt.run(item.price, Math.round(item.price * 1.25), row.id);
    } else {
      db.prepare(`
        INSERT INTO product_variants (product_id, sku, size, colour, mrp, selling_price, stock, position)
        VALUES (?, ?, 'Standard', 'Standard', ?, ?, 100, 1)
      `).run(row.id, `SKU-${row.slug}`, Math.round(item.price * 1.25), item.price);
    }
    verifiedList.push({
      requestedName: item.requestedName,
      actualName: row.name,
      slug: row.slug,
      dbId: row.id,
      newPrice: item.price
    });
    console.log(`DB Price Updated [ID ${row.id}, Slug "${row.slug}"]: "${row.name}" -> ₹${item.price}`);
  } else {
    console.warn('Could not find slug in DB:', item.slug);
  }
}

console.log(`\n--- Updating JSON files for all 17 products ---`);

function updateJsonPricesBySlug(filePath) {
  if (!fs.existsSync(filePath)) return;
  console.log(`Updating JSON file: ${filePath}`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);

  const slugMap = new Map(priceUpdatesBySlug.map(p => [p.slug, p.price]));
  let updatedCount = 0;

  function updateItem(item) {
    if (item && item.slug && slugMap.has(item.slug)) {
      const targetPrice = slugMap.get(item.slug);
      item.price = targetPrice;
      item.sellingPrice = targetPrice;
      item.mrp = Math.round(targetPrice * 1.25);
      item.isPurchasable = true;
      updatedCount++;
    }
  }

  if (Array.isArray(data)) {
    data.forEach(updateItem);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } else if (data.products && Array.isArray(data.products)) {
    data.products.forEach(updateItem);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  console.log(`Updated ${updatedCount} records in ${filePath}`);
}

updateJsonPricesBySlug('vinsho-commerce-seed.json');
updateJsonPricesBySlug('src/data/products/candles.json');
updateJsonPricesBySlug('vinsho_products.json');

console.log('\nAll 17 product prices successfully updated!');
