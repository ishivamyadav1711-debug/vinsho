import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = path.resolve('data/vinsho.db');
const db = new Database(dbPath);

const targets = [
  'Cork Metal Pen Combo 30',
  'Cork Metal Pen Combo 36',
  'Ecodesk Diary AS Combo-36',
  'Ecodesk Diary A5 Combo-36'
];

const rows = db.prepare(`SELECT id, name, slug FROM products`).all();

const matching = rows.filter(r => {
  return targets.some(t => r.name.toLowerCase().trim() === t.toLowerCase().trim() || r.slug.toLowerCase().includes(t.toLowerCase().replace(/\s+/g, '-')));
});

console.log('Matching DB products:', matching);

// Also check vinsho-commerce-seed.json
const seedPath = path.resolve('vinsho-commerce-seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

const matchingSeed = seedData.products.filter(p => {
  const title = p.title || p.name || '';
  const slug = p.slug || '';
  return targets.some(t => title.toLowerCase().trim() === t.toLowerCase().trim() || slug.toLowerCase().includes(t.toLowerCase().replace(/\s+/g, '-')));
});

console.log('Matching Seed products:', matchingSeed.map(p => ({ id: p.id, title: p.title || p.name, slug: p.slug })));

db.close();
