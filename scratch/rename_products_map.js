import fs from 'fs';
import Database from 'better-sqlite3';

const nameMap = {
  "Mini Teddy Jar Candle": "MINI CAT CANDLE",
  "Faceted Bowl Candle": "Concrete Hexa Jar Candle",
  "Concrete Hexa Jar Candle": "wood log jar candle",
  "Concrete Ocean Theme Jar Candle": "ocean theme pillar candle",
  "Crescent Moon Candle": "Crescent Moon jar Candle",
  "Floral Flower Box Candle": "pink bouquet candle",
  "Orange Floral Bouquet Candle": "golden bouquet",
  "Seashell Sculptural Candle": "concrete ocean theme jar candle"
};

console.log('--- Step 1: Updating SQLite Database (data/vinsho.db) ---');
try {
  const db = new Database('data/vinsho.db');
  
  // Prepare a single transaction for atomic replacement
  const updateStmt = db.prepare('UPDATE products SET name = ? WHERE name = ?');
  const getStmt = db.prepare('SELECT id, slug, name FROM products WHERE name = ?');

  const renameTransaction = db.transaction(() => {
    for (const [origName, newName] of Object.entries(nameMap)) {
      const existing = getStmt.get(origName);
      if (existing) {
        updateStmt.run(newName, origName);
        console.log(`DB Updated [ID ${existing.id}, Slug "${existing.slug}"]: "${origName}" -> "${newName}"`);
      } else {
        console.warn(`DB Warning: Could not find product with name "${origName}"`);
      }
    }
  });

  renameTransaction();
} catch (err) {
  console.error('Error updating SQLite DB:', err);
}

function updateJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  console.log(`--- Updating JSON file: ${filePath} ---`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);

  let updatedCount = 0;

  function processItem(item) {
    if (item && item.name && Object.prototype.hasOwnProperty.call(nameMap, item.name)) {
      const old = item.name;
      item.name = nameMap[old];
      updatedCount++;
      console.log(`  JSON Updated [Slug "${item.slug}"]: "${old}" -> "${item.name}"`);
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

updateJsonFile('vinsho-commerce-seed.json');
updateJsonFile('src/data/products/candles.json');
updateJsonFile('vinsho_products.json');

console.log('All renaming operations complete!');
