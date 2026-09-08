import Database from 'better-sqlite3';

const db = new Database('data/vinsho.db');

const targetSlugs = [
  'mini-teddy-jar-candle',
  'faceted-bowl-candle',
  'concrete-hexa-jar-candle',
  'concrete-ocean-theme-jar-candle',
  'crescent-moon-candle',
  'floral-flower-box-candle',
  'orange-floral-bouquet-candle',
  'seashell-sculptural-candle'
];

const placeholders = targetSlugs.map(() => '?').join(',');
const rows = db.prepare(`SELECT id, slug, name FROM products WHERE slug IN (${placeholders})`).all(...targetSlugs);
console.table(rows);
