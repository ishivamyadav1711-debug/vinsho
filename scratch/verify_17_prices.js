import Database from 'better-sqlite3';

const db = new Database('data/vinsho.db');

const targetSlugs = [
  '3-rose-candle-bouquet',
  'candles',
  'blushing-rose-candle-bouquet',
  'bubble-jar-candle',
  'caffe-latte-jar-candle',
  'mini-teddy-jar-candle',
  'diamond-jar-candle-gift',
  'floral-jar-candle-sachet-combo',
  'hearty-gel-wax-jar-candle',
  'lavender-botanical-pillar-candle',
  'mini-floral-candle-bouquet',
  'orange-caramel-layered-jar-candle',
  'ocean-jar-candle',
  'pastel-blue-bowl-candle',
  'rose-garden-jar-candle',
  'royal-red-peony-candle',
  'whipped-floral-jar-candle'
];

const placeholders = targetSlugs.map(() => '?').join(',');
const rows = db.prepare(`
  SELECT 
    p.id, 
    p.name, 
    p.slug, 
    v.selling_price as price_inr
  FROM products p
  LEFT JOIN product_variants v ON v.product_id = p.id
  WHERE p.slug IN (${placeholders})
  ORDER BY p.name ASC
`).all(...targetSlugs);

console.table(rows);
console.log(`Total verified: ${rows.length} products`);
