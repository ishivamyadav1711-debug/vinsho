import Database from 'better-sqlite3';

const db = new Database('data/vinsho.db');

const targetSlugs = [
  'elegant-runners',
  'jaguar-new-arrival-teaser',
  'jaguar-showpiece',
  'botanical-printed-blinds',
  'elegant-doormat',
  'show-piece-vintage-wall-d-cor',
  'mattress'
];

const targetNames = [
  'elegent runners',
  'Elegant Runners',
  'Jaguar (New Arrival teaser)',
  'Jaguar Showpiece',
  'Botanical Printed Blinds',
  'Elegant Doormat',
  'Show Piece (Vintage Wall Décor)',
  'Mattress'
];

const placeholders = targetSlugs.map(() => '?').join(',');
const rows = db.prepare(`
  SELECT id, name, slug 
  FROM products 
  WHERE slug IN (${placeholders}) 
     OR LOWER(name) IN (${targetNames.map(() => '?').join(',')})
`).all(...targetSlugs, ...targetNames.map(n => n.toLowerCase()));

console.log('Found in DB:');
console.table(rows);
