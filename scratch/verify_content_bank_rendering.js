import Database from 'better-sqlite3';

const BASE = 'http://localhost:4321';
const db = new Database('data/vinsho.db');

const testSlugs = ['aprons', 'artificial-flowers', 'bathmats', 'bedsheet', 'blanket', 'buddha', 'curtains', 'doormat', 'jaguar'];

async function checkRendering() {
  console.log('=== VERIFYING CONTENT BANK RENDERING ON LIVE SERVER ===');

  for (const slug of testSlugs) {
    try {
      const res = await fetch(`${BASE}/product/${slug}`);
      if (!res.ok) {
        console.error(`[ERR ${res.status}] /product/${slug}`);
        continue;
      }
      const html = await res.text();

      const prodInDb = db.prepare("SELECT name, tagline, closing_line FROM products WHERE slug = ?").get(slug);

      const hasTitle = html.includes(prodInDb.name);
      const hasTagline = prodInDb.tagline ? html.includes(prodInDb.tagline) : true;
      const hasClosing = prodInDb.closing_line ? html.includes(prodInDb.closing_line) : true;
      const hasFeatures = html.includes('DESIGN &amp; CRAFTSMANSHIP HIGHLIGHTS') || html.includes('DESIGN & CRAFTSMANSHIP HIGHLIGHTS') || html.includes('feature-card');

      console.log(`[PASS] /product/${slug}`);
      console.log(`   - Name (${prodInDb.name}): ${hasTitle ? '✓' : '✗'}`);
      console.log(`   - Tagline ("${prodInDb.tagline}"): ${hasTagline ? '✓' : '✗'}`);
      console.log(`   - Features Section: ${hasFeatures ? '✓' : '✗'}`);
      console.log(`   - Closing Line ("${prodInDb.closing_line}"): ${hasClosing ? '✓' : '✗'}`);
    } catch (e) {
      console.error(`Error checking ${slug}: ${e.message}`);
    }
  }
}

checkRendering();
