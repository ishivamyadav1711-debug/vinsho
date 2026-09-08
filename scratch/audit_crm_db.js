import Database from 'better-sqlite3';

const db = new Database('data/vinsho.db');

console.log('=== VINSHO DATABASE AUDIT ===\n');

// Get list of all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC").all();

console.log(`Found ${tables.length} tables in sqlite_master:\n`);

const report = [];

for (const { name } of tables) {
  const countRow = db.prepare(`SELECT COUNT(*) as count FROM "${name}"`).get();
  const columns = db.prepare(`PRAGMA table_info("${name}")`).all();
  const fks = db.prepare(`PRAGMA foreign_key_list("${name}")`).all();

  // Get sample records
  const sample = db.prepare(`SELECT * FROM "${name}" LIMIT 3`).all();

  report.push({
    table: name,
    count: countRow.count,
    columns: columns.map(c => c.name),
    foreignKeys: fks.map(f => `${f.from} -> ${f.table}.${f.to}`),
    sample
  });
}

for (const item of report) {
  console.log(`TABLE: ${item.table} (Count: ${item.count})`);
  console.log(`  Columns: ${item.columns.join(', ')}`);
  if (item.foreignKeys.length > 0) {
    console.log(`  Foreign Keys: ${item.foreignKeys.join('; ')}`);
  }
  if (item.count > 0) {
    console.log(`  Sample (first item):`, JSON.stringify(item.sample[0]));
  }
  console.log('----------------------------------------------------');
}
