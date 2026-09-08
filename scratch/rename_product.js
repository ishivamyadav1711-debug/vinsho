import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, '..', 'data', 'vinsho.db'));

const before = db.prepare("SELECT id, slug, name FROM products WHERE slug = 'sculptural-animal-bowl-candle'").get();
console.log('Before:', before);

if (before) {
  db.prepare("UPDATE products SET name = ?, slug = ?, updated_at = ? WHERE slug = 'sculptural-animal-bowl-candle'")
    .run('Wood Log Jar Candle', 'wood-log-jar-candle', new Date().toISOString());

  const after = db.prepare("SELECT id, slug, name FROM products WHERE slug = 'wood-log-jar-candle'").get();
  console.log('After:', after);
  console.log('✓ DB updated successfully.');
} else {
  const byName = db.prepare("SELECT id, slug, name FROM products WHERE name LIKE '%Animal Bowl%' OR name LIKE '%Sculptural Animal%'").all();
  console.log('Not found by old slug. Matches by name:', byName);
}

db.close();
