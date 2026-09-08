const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const db = new Database('data/vinsho.db');

const rows = db.prepare(`
  SELECT p.id, p.slug, p.name, pi.url
  FROM products p
  LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
  JOIN subcategories s ON p.subcategory_id = s.id
  WHERE s.key = 'corporate-gifting'
  ORDER BY p.id ASC
`).all();

console.log("=== WEBSITE PRODUCT DATA RENDERING CHECK ===");
console.log(`Corporate Gifting Products Found in DB: ${rows.length}`);

let mappedCnt = 0;
let missingCnt = 0;
let brokenCnt = 0;

rows.forEach((r, idx) => {
  const num = idx + 1;
  if (!r.url) {
    missingCnt++;
    console.log(`[#${num}] ${r.name} -> Image: (safely empty fallback placeholder)`);
  } else {
    const relFile = r.url.replace('/images/vinsho/products/Corporate-gifting/', '');
    const diskPath = path.join(process.cwd(), 'public', 'images', 'vinsho', 'products', 'Corporate-gifting', relFile);
    const exists = fs.existsSync(diskPath);
    if (exists) {
      mappedCnt++;
      console.log(`[#${num}] ${r.name} -> URL: ${r.url} (EXISTS ON DISK)`);
    } else {
      brokenCnt++;
      console.log(`[#${num}] ${r.name} -> BROKEN LINK: ${r.url} (NOT FOUND AT ${diskPath})`);
    }
  }
});

console.log(`\nSummary: Total=${rows.length}, Mapped=${mappedCnt}, Missing=${missingCnt}, BrokenLinks=${brokenCnt}`);
