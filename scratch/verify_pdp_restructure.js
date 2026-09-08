const BASE = 'http://localhost:4321';

const testSlugs = ['bedsheet', 'aprons', 'comforter-set', 'curtains', 'candles', 'flower-vases', 'metal-tree'];

async function testPDPRestructure() {
  console.log('=== VERIFYING RESTRUCTURED PRODUCT DETAIL PAGE LAYOUT ===');

  let passedCount = 0;

  for (const slug of testSlugs) {
    try {
      const res = await fetch(`${BASE}/product/${slug}`);
      if (!res.ok) {
        console.error(`[FAIL ${res.status}] /product/${slug}`);
        continue;
      }
      const html = await res.text();

      // 1. Verify Right Column Highlights section
      const hasHighlightsHeader = html.includes('DESIGN &amp; CRAFTSMANSHIP HIGHLIGHTS') || html.includes('DESIGN & CRAFTSMANSHIP HIGHLIGHTS');
      const hasRightColHighlights = html.includes('pdp-highlights-sidebar');

      // 2. Verify Full-Width Accordions section below hero stage
      const hasFullInfoSection = html.includes('pdp-full-info-section');
      const hasDescriptionAccord = html.includes('DESCRIPTION');
      const hasMaterialAccord = html.includes('MATERIAL &amp; DETAILS') || html.includes('MATERIAL & DETAILS');
      const hasShippingAccord = html.includes('SHIPPING &amp; DELIVERY') || html.includes('SHIPPING & DELIVERY');

      // 3. Verify no duplicate features grid or closing wrapper
      const hasOldFeaturesSection = html.includes('pdp-features-section');
      const hasOldClosingWrapper = html.includes('pdp-closing-wrapper');

      if (hasHighlightsHeader && hasRightColHighlights && hasFullInfoSection && !hasOldFeaturesSection && !hasOldClosingWrapper) {
        console.log(`[PASS] /product/${slug}`);
        console.log(`   - Right Column Highlights: ✓`);
        console.log(`   - Full-Width Accordions Below Hero: ✓`);
        console.log(`   - No Duplicate Sections: ✓`);
        passedCount++;
      } else {
        console.error(`[FAIL] /product/${slug}`);
        console.log(`   - Right Column Highlights: ${hasRightColHighlights ? '✓' : '✗'}`);
        console.log(`   - Full-Width Accordions: ${hasFullInfoSection ? '✓' : '✗'}`);
        console.log(`   - Old Features Grid Present: ${hasOldFeaturesSection ? 'YES (FAIL)' : 'NO (PASS)'}`);
        console.log(`   - Old Closing Wrapper Present: ${hasOldClosingWrapper ? 'YES (FAIL)' : 'NO (PASS)'}`);
      }
    } catch (e) {
      console.error(`Error testing /product/${slug}: ${e.message}`);
    }
  }

  console.log(`\nVerified ${passedCount}/${testSlugs.length} test product pages.`);
}

testPDPRestructure();
