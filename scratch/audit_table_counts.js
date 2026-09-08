import Database from 'better-sqlite3';

const db = new Database('data/vinsho.db');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC").all();

console.log('=== VINSHO CRM DATABASE TABLES & COUNTS ===\n');

for (const t of tables) {
  const c = db.prepare(`SELECT COUNT(*) as count FROM "${t.name}"`).get().count;
  console.log(`${t.name.padEnd(30)} : ${c} records`);
}
