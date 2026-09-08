import Database from 'better-sqlite3';

const db = new Database('data/vinsho.db');

const rows = db.prepare(`
  SELECT DISTINCT p.name, p.slug, s.name as subcategory_name, c.name as collection_name, pv.selling_price
  FROM products p
  JOIN subcategories s ON p.subcategory_id = s.id
  JOIN collections c ON p.collection_id = c.id
  JOIN product_variants pv ON pv.product_id = p.id
  WHERE (pv.selling_price = 499 OR pv.mrp = 499)
    AND (s.key = 'candles' OR LOWER(s.name) LIKE '%candle%' OR LOWER(p.name) LIKE '%candle%')
  ORDER BY p.name ASC
`).all();

console.log('=== CANDLE PRODUCTS PRICED EXACTLY 499 IN DATABASE ===');
rows.forEach((r, i) => {
  console.log(`${i + 1}. ${r.name}`);
});

console.log(`\nTotal: ${rows.length} candles`);
