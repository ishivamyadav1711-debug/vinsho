import fs from 'fs';
import Database from 'better-sqlite3';

const db = new Database('data/vinsho.db');

// Check corporate gifting collection ID
const cgCollection = db.prepare(`SELECT * FROM collections WHERE key = 'gifting' OR name LIKE '%gifting%' OR name LIKE '%corporate%'`).all();
console.log('Corporate Gifting Collections:', cgCollection);

const collectionIds = cgCollection.map(c => c.id);

// Get all products under these collection IDs or with cg- IDs in seed
const dbProducts = db.prepare(`SELECT * FROM products WHERE collection_id IN (${collectionIds.join(',')}) OR slug LIKE '%combo%' OR slug LIKE '%planter%' OR slug LIKE '%trivet%' OR slug LIKE '%coaster%' OR slug LIKE '%tablemat%' OR slug LIKE '%napkin-ring%'`).all();
console.log(`Total candidate products in DB: ${dbProducts.length}`);
console.log('DB Products list:');
dbProducts.forEach(p => console.log(`  id=${p.id}, slug="${p.slug}", name="${p.name}"`));

// Check in vinsho-commerce-seed.json
const rawSeed = fs.readFileSync('vinsho-commerce-seed.json', 'utf8');
const seedData = JSON.parse(rawSeed);
const seedProducts = Array.isArray(seedData) ? seedData : (seedData.products || []);
const seedCgProducts = seedProducts.filter(p => p.id && String(p.id).startsWith('cg-'));

console.log(`\nSeed CG Products count: ${seedCgProducts.length}`);
seedCgProducts.forEach(p => console.log(`  seedId=${p.id}, slug="${p.slug}", title="${p.title}"`));
