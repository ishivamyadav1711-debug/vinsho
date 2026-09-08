const Database = require('better-sqlite3');
const db = new Database('data/vinsho.db');

const prod = db.prepare(`
  SELECT p.* FROM products p
  JOIN subcategories s ON p.subcategory_id = s.id
  WHERE s.key = 'candles' OR p.name LIKE '%candle%'
  LIMIT 2
`).all();

console.log("=== CANDLE PRODUCTS IN DB ===");
console.log(JSON.stringify(prod, null, 2));
