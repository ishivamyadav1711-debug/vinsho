import fs from 'fs';
import Database from 'better-sqlite3';

function searchDb(dbPath) {
  if (!fs.existsSync(dbPath)) {
    console.log(`DB not found: ${dbPath}`);
    return;
  }
  console.log(`=== DB: ${dbPath} ===`);
  try {
    const db = new Database(dbPath);
    const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all();
    console.log('Tables:', tables.map(t => t.name));
    for (const t of tables) {
      const rows = db.prepare(`SELECT * FROM ${t.name}`).all();
      const matching = rows.filter(r => JSON.stringify(r).toLowerCase().includes('coaster'));
      if (matching.length > 0) {
        console.log(`Matching rows in table ${t.name}:`, matching);
      }
    }
  } catch (e) {
    console.error(`Error with ${dbPath}:`, e.message);
  }
}

searchDb('vinsho.db');
searchDb('data/vinsho.db');

function searchJson(filePath) {
  if (!fs.existsSync(filePath)) return;
  console.log(`=== JSON: ${filePath} ===`);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const items = Array.isArray(content) ? content : (content.products || []);
  const matches = items.filter(item => {
    const str = JSON.stringify(item).toLowerCase();
    return str.includes('leaf') || str.includes('box uv') || str.includes('cork belly') || str.includes('coaster');
  });
  matches.forEach(m => {
    console.log(`Found in ${filePath}:`, {
      id: m.id,
      slug: m.slug,
      title: m.title || m.name,
      image: m.image,
      images: m.images,
      media: m.media
    });
  });
}

searchJson('vinsho-commerce-seed.json');
searchJson('vinsho_products.json');
searchJson('vinsho-content.json');
searchJson('src/data/products/candles.json');
searchJson('public/images/vinsho/products/Corporate-gifting/IMAGE_MAPPING_SOURCE.json');
