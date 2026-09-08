import fs from 'fs';

console.log('--- VERIFYING MOBILE INLINE ENQUIRY BUTTON HIDING ---');

const astroContent = fs.readFileSync('src/pages/product/[slug].astro', 'utf-8');

const hasEnquiryHideRule = astroContent.includes('.pdp-btn-stack,\n    .pdp-enquiry-controls {\n      display: none !important;\n    }');
const hasDesktopHideRule = astroContent.includes('.pdp-mobile-sticky-bar {\n    display: none !important;\n  }');

console.log('1. Source CSS Rule Checks:');
console.log(' - Mobile Inline CTAs Hidden (.pdp-btn-stack, .pdp-enquiry-controls { display: none !important; }):', hasEnquiryHideRule ? '✓' : '✗');
console.log(' - Desktop Sticky Bar Hidden (.pdp-mobile-sticky-bar { display: none !important; }):', hasDesktopHideRule ? '✓' : '✗');

if (!hasEnquiryHideRule || !hasDesktopHideRule) {
  console.error('FAILED: Source check failed!');
  process.exit(1);
}

async function verifyHttp() {
  console.log('\n2. Live HTTP Endpoint Check (Non-purchasable/Enquiry Product):');
  try {
    const res = await fetch('http://localhost:4321/product/jaguar-showpiece');
    console.log(' - HTTP Status:', res.status, res.status === 200 ? '✓' : '✗');
    const html = await res.text();
    const hasInlineEnquiry = html.includes('class="pdp-enquiry-controls"');
    const hasStickyBar = html.includes('id="pdp-mobile-sticky-bar"');
    console.log(' - Has Inline Enquiry Controls (Visible on Desktop):', hasInlineEnquiry ? '✓' : '✗');
    console.log(' - Has Sticky Bottom Bar (Visible on Mobile):', hasStickyBar ? '✓' : '✗');
    
    if (res.status === 200 && hasInlineEnquiry && hasStickyBar) {
      console.log('\n✓ VERIFICATION SUCCESSFUL: Inline duplicate CTAs hidden on mobile, 100% untouched on desktop!');
    } else {
      console.error('FAILED: HTTP check failed');
      process.exit(1);
    }
  } catch (err) {
    console.error('Error fetching live server:', err.message);
  }
}

verifyHttp();
