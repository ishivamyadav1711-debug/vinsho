const Database = require('better-sqlite3');
const db = new Database('data/vinsho.db');

const testSlugs = [
  "cork-diary-as-fab-india-combo-30",
  "cork-bottle-ocean-mist-combo-18",
  "natural-bark-planter",
  "fine-grain-napkin-ring"
];

console.log("=== VERIFYING HIGHLIGHTS & TAGLINE IN SQLITE DB ===");

testSlugs.forEach(slug => {
  const row = db.prepare("SELECT name, slug, description, tagline, features, closing_line FROM products WHERE slug = ?").get(slug);
  if (!row) {
    console.error(`❌ Product not found: ${slug}`);
    return;
  }

  const features = JSON.parse(row.features);
  console.log(`\nPRODUCT: ${row.name} (${row.slug})`);
  console.log(`  Description: ${row.description}`);
  console.log(`  Closing Line: "${row.closing_line}"`);
  console.log(`  Features (${features.length} items):`);
  features.forEach((f, i) => {
    console.log(`    0${i+1} [${f.title}] -> ${f.description}`);
  });
});
