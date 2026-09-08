import Database from 'better-sqlite3';
import fs from 'fs';

const db = new Database('data/vinsho.db');

const product = db.prepare("SELECT * FROM products WHERE slug = 'mirror'").get();
console.log('--- DB Mirror Product ---');
console.log(product);

const taxonomy = JSON.parse(fs.readFileSync('vinsho-taxonomy.json', 'utf8'));
const mirrorTaxonomy = taxonomy.products.find(p => p.slug === 'mirror');
console.log('\n--- Taxonomy Mirror Product ---');
console.log(mirrorTaxonomy);

const content = JSON.parse(fs.readFileSync('vinsho-content.json', 'utf8'));
const mirrorContent = content.products.find(p => p.slug === 'mirror');
console.log('\n--- Content Mirror Product ---');
console.log(mirrorContent);
