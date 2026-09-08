import Database from 'better-sqlite3';

const db = new Database('data/vinsho.db');

console.log('=== TABLES ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(tables.map(t => t.name));

for (const t of tables) {
  try {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${t.name}`).get();
    console.log(`Table ${t.name}: ${count.count} rows`);
  } catch (e) {
    console.log(`Table ${t.name}: error ${e.message}`);
  }
}

console.log('\n=== PRODUCTS (sample 10) ===');
try {
  const products = db.prepare("SELECT id, slug, title FROM products LIMIT 10").all();
  console.log(products);
} catch (e) {
  console.log(e.message);
}

console.log('\n=== CATEGORIES / COLLECTIONS ===');
try {
  const categories = db.prepare("SELECT * FROM categories LIMIT 20").all();
  console.log(categories);
} catch (e) {
  console.log(e.message);
}

console.log('\n=== BLOG POSTS ===');
try {
  const blogs = db.prepare("SELECT * FROM posts LIMIT 10").all();
  console.log(blogs);
} catch (e) {
  console.log(e.message);
}
