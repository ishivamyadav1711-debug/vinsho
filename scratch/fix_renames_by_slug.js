import fs from 'fs';
import Database from 'better-sqlite3';

const slugToNewName = {
  "mini-teddy-jar-candle": "MINI CAT CANDLE",
  "faceted-bowl-candle": "Concrete Hexa Jar Candle",
  "concrete-hexa-jar-candle": "wood log jar candle",
  "concrete-ocean-theme-jar-candle": "ocean theme pillar candle",
  "crescent-moon-candle": "Crescent Moon jar Candle",
  "floral-flower-box-candle": "pink bouquet candle",
  "orange-floral-bouquet-candle": "golden bouquet",
  "seashell-sculptural-candle": "concrete ocean theme jar candle"
};

console.log('--- Updating SQLite Database by SLUG ---');
try {
  const db = new Database('data/vinsho.db');
  const stmt = db.prepare('UPDATE products SET name = ? WHERE slug = ?');

  for (const [slug, newName] of Object.entries(slugToNewName)) {
    const res = stmt.run(newName, slug);
    console.log(`DB Update [Slug "${slug}"]: name set to "${newName}" (${res.changes} row updated)`);
  }
} catch (err) {
  console.error('DB Error:', err);
}

function updateJsonBySlug(filePath) {
  if (!fs.existsSync(filePath)) return;
  console.log(`--- Updating JSON by SLUG: ${filePath} ---`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);

  let updatedCount = 0;

  function processItem(item) {
    if (item && item.slug && Object.prototype.hasOwnProperty.call(slugToNewName, item.slug)) {
      const old = item.name;
      item.name = slugToNewName[item.slug];
      updatedCount++;
      console.log(`  JSON Update [Slug "${item.slug}"]: "${old}" -> "${item.name}"`);
    }
  }

  if (Array.isArray(data)) {
    data.forEach(processItem);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } else if (data.products && Array.isArray(data.products)) {
    data.products.forEach(processItem);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  console.log(`  Total items updated in ${filePath}: ${updatedCount}`);
}

updateJsonBySlug('vinsho-commerce-seed.json');
updateJsonBySlug('src/data/products/candles.json');
updateJsonBySlug('vinsho_products.json');

console.log('Done!');
