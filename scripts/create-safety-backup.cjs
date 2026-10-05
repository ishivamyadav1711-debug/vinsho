const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const Database = require('better-sqlite3');

const src = path.join(process.cwd(), 'data', 'vinsho.db');
const backupDir = path.join(process.cwd(), 'data', 'backups');
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupDir, 'vinsho_pre_recovery_' + timestamp + '.db');

// Copy file
fs.copyFileSync(src, backupPath);

// Calculate SHA-256
const fileBuffer = fs.readFileSync(backupPath);
const hashSum = crypto.createHash('sha256');
hashSum.update(fileBuffer);
const hex = hashSum.digest('hex');

// Verify backup by opening it read-only
const db = new Database(backupPath, { readonly: true });
const tableCount = db.prepare("SELECT count(1) as c FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").get().c;
const productCount = db.prepare("SELECT count(1) as c FROM products").get().c;
const customerCount = db.prepare("SELECT count(1) as c FROM customers").get().c;
const orderCount = db.prepare("SELECT count(1) as c FROM orders").get().c;
db.close();

// Check PostgreSQL target host without credentials
const envLocal = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
const urlMatch = envLocal.match(/DATABASE_URL="([^"]+)"/);
let pgTarget = 'unknown';
if (urlMatch) {
  const parsed = new URL(urlMatch[1]);
  pgTarget = parsed.protocol + '//' + parsed.host + parsed.pathname;
}

console.log('BACKUP STATUS');
console.log('Git: 28e908fd5de4a96cc1007529a65ac1dc08593002');
console.log('SQLite backup: ' + backupPath);
console.log('SHA256: ' + hex);
console.log('PostgreSQL target: ' + pgTarget);
console.log('Recovery branch: fix/production-recovery');
