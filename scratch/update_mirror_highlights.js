import Database from 'better-sqlite3';
import fs from 'fs';

const db = new Database('data/vinsho.db');

const mirrorFeatures = [
  {
    title: 'Sunburst Design',
    description: 'A striking radial design that creates a bold and elegant focal point on the wall.'
  },
  {
    title: 'Layered Detailing',
    description: 'Multiple concentric layers and carefully arranged elements add depth, dimension, and visual richness.'
  },
  {
    title: 'Warm Metallic Finish',
    description: 'A refined golden-toned finish that brings warmth, sophistication, and a luxurious accent to the space.'
  },
  {
    title: 'Statement Wall Decor',
    description: 'Designed to transform living rooms, bedrooms, entryways, and other spaces into visually distinctive interiors.'
  }
];

const mirrorQuote = 'Designed to reflect timeless elegance.';

console.log('--- Step 1: Updating SQLite Database ---');
const res = db.prepare(`
  UPDATE products 
  SET 
    features = ?, 
    closing_line = ?,
    updated_at = ?
  WHERE slug = 'mirror'
`).run(JSON.stringify(mirrorFeatures), mirrorQuote, new Date().toISOString());

console.log(`Updated ${res.changes} row(s) in SQLite database for 'mirror'`);

console.log('\n--- Step 2: Updating JSON files ---');
const filesToUpdate = ['vinsho-taxonomy.json', 'vinsho-content.json', 'vinsho-commerce-seed.json'];

for (const file of filesToUpdate) {
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    let modified = false;

    const products = Array.isArray(data.products) ? data.products : (Array.isArray(data) ? data : []);
    const mirror = products.find((p) => p.slug === 'mirror');

    if (mirror) {
      mirror.features = mirrorFeatures;
      mirror.highlights = mirrorFeatures;
      mirror.closing_line = mirrorQuote;
      mirror.closingLine = mirrorQuote;
      mirror.highlightsTagline = mirrorQuote;
      modified = true;
      console.log(`Updated mirror product in ${file}`);
    }

    if (modified) {
      fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
      console.log(`Saved ${file}`);
    }
  }
}
