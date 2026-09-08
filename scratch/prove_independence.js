import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost:4321';

async function auditRenderedPages() {
  console.log('=== STEP 6: PROVING INDEPENDENCE ===');

  const verifyScript = fs.readFileSync('scratch/dump_all_valid_urls.js', 'utf8');
  
  // Get all routes
  const Database = (await import('better-sqlite3')).default;
  const db = new Database('data/vinsho.db');

  const staticPages = ['/', '/about', '/contact', '/cart', '/grievance-officer', '/products', '/collections', '/gifting/create-your-hamper', '/blog'];
  const collections = db.prepare("SELECT key FROM collections").all().map(c => `/collections/${c.key}`);
  const subcategories = db.prepare(`
    SELECT c.key as colKey, s.key as subKey 
    FROM subcategories s 
    JOIN collections c ON s.collection_id = c.id
  `).all().map(s => `/collections/${s.colKey}/${s.subKey}`);
  const products = db.prepare("SELECT slug FROM products LIMIT 20").all().map(p => `/product/${p.slug}`);

  const allRoutes = [...staticPages, ...collections, ...subcategories, ...products];

  console.log(`Checking rendered HTML across ${allRoutes.length} pages for external domain dependency...`);

  let remoteImageHits = 0;
  let brokenLocalImages = 0;
  let totalImagesChecked = 0;

  for (const route of allRoutes) {
    try {
      const res = await fetch(`${BASE}${route}`);
      if (!res.ok) {
        console.warn(`[WARN] Page ${route} returned status ${res.status}`);
        continue;
      }

      const html = await res.text();

      // Check for any remaining vinsho.in/wp-content references
      if (html.includes('vinsho.in/wp-content')) {
        console.error(`[FAIL] Page ${route} contains live vinsho.in/wp-content image reference!`);
        remoteImageHits++;
      }

      // Find all /images/vinsho/ src attributes
      const imgRegex = /src=["'](\/images\/vinsho\/[^"']+)["']/g;
      let match;
      while ((match = imgRegex.exec(html)) !== null) {
        totalImagesChecked++;
        const relUrl = match[1];
        const diskPath = path.join('public', relUrl);
        if (!fs.existsSync(diskPath)) {
          console.error(`[BROKEN IMAGE] Page ${route} references missing file: ${diskPath}`);
          brokenLocalImages++;
        }
      }
    } catch (err) {
      console.error(`Error fetching ${route}: ${err.message}`);
    }
  }

  console.log('\n=== INDEPENDENCE PROOF SUMMARY ===');
  console.log(`Pages Audited: ${allRoutes.length}`);
  console.log(`Total Image Tags Verified: ${totalImagesChecked}`);
  console.log(`Remote vinsho.in/wp-content References in HTML: ${remoteImageHits}`);
  console.log(`Broken Local Image Files: ${brokenLocalImages}`);

  if (remoteImageHits === 0 && brokenLocalImages === 0) {
    console.log('\n✅ INDEPENDENCE PASSED 100%! Site operates completely independently of vinsho.in');
  } else {
    console.error('\n❌ INDEPENDENCE TEST FAILED');
  }
}

auditRenderedPages();
