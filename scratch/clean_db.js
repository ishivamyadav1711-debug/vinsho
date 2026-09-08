const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'vinsho.db');
const db = new Database(dbPath);

try {
  const sub = db.prepare("SELECT id FROM subcategories WHERE key = 'festive-personal'").get();
  if (sub) {
    const candlesSub = db.prepare("SELECT id FROM subcategories WHERE key = 'candles'").get();
    if (candlesSub) {
      db.prepare("UPDATE products SET subcategory_id = ? WHERE subcategory_id = ?").run(candlesSub.id, sub.id);
    }
    db.prepare("DELETE FROM subcategories WHERE id = ?").run(sub.id);
    console.log("Successfully removed festive-personal subcategory from DB.");
  } else {
    console.log("No festive-personal subcategory found in DB.");
  }
} catch (e) {
  console.log("DB check note:", e.message);
}
