const Database = require('better-sqlite3');
const db = new Database('data/vinsho.db');

db.pragma('foreign_keys = OFF');
db.prepare('DELETE FROM return_items').run();
db.prepare('DELETE FROM returns').run();
db.prepare('DELETE FROM invoices').run();
db.prepare('DELETE FROM order_items').run();
db.prepare('DELETE FROM payments').run();
db.prepare('DELETE FROM orders').run();
db.pragma('foreign_keys = ON');

console.log('Orders and all related records cleared!');
