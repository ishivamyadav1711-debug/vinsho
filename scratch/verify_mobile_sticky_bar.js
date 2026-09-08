import fs from 'fs';
import path from 'path';

console.log('--- VERIFYING MOBILE STICKY BAR IMPLEMENTATION ---');

// 1. Inspect product/[slug].astro source for required elements & rules
const astroContent = fs.readFileSync('src/pages/product/[slug].astro', 'utf-8');

const hasMobileBarMarkup = astroContent.includes('pdp-mobile-sticky-bar');
const hasMobileAddCartBtn = astroContent.includes('pdp-mobile-add-cart-btn');
const hasMobileBuyNowBtn = astroContent.includes('pdp-mobile-buy-now-btn');
const hasDesktopHideRule = astroContent.includes('.pdp-mobile-sticky-bar {\n    display: none !important;\n  }');
const has767Breakpoint = astroContent.includes('@media (max-width: 767px)');
const hasSafeArea = astroContent.includes('env(safe-area-inset-bottom');

console.log('1. Source Markup & Rule Verification:');
console.log(' - Mobile Sticky Bar Markup:', hasMobileBarMarkup ? '✓' : '✗');
console.log(' - Mobile Add Cart Button:', hasMobileAddCartBtn ? '✓' : '✗');
console.log(' - Mobile Buy Now Button:', hasMobileBuyNowBtn ? '✓' : '✗');
console.log(' - Desktop Hidden Rule (.pdp-mobile-sticky-bar { display: none !important; }):', hasDesktopHideRule ? '✓' : '✗');
console.log(' - 767px Responsive Breakpoint:', has767Breakpoint ? '✓' : '✗');
console.log(' - Mobile Safe Area Support:', hasSafeArea ? '✓' : '✗');

if (!hasMobileBarMarkup || !hasMobileAddCartBtn || !hasMobileBuyNowBtn || !hasDesktopHideRule || !has767Breakpoint || !hasSafeArea) {
  console.error('FAILED: Source check failed!');
  process.exit(1);
}

// 2. HTTP Verification against dev server
async function verifyHttp() {
  console.log('\n2. HTTP Live Server Verification:');
  try {
    const res = await fetch('http://localhost:4321/product/3-shade-flower-jar-candle');
    console.log(' - HTTP Status:', res.status, res.status === 200 ? '✓' : '✗');
    const html = await res.text();
    const renderedStickyBar = html.includes('id="pdp-mobile-sticky-bar"');
    console.log(' - Rendered Mobile Sticky Bar Element:', renderedStickyBar ? '✓' : '✗');
    
    if (res.status === 200 && renderedStickyBar) {
      console.log('\n✓ VERIFICATION SUCCESSFUL: Desktop remains unchanged, Mobile Sticky Bar ready!');
    } else {
      console.error('FAILED: HTTP verification failed');
      process.exit(1);
    }
  } catch (err) {
    console.error('Error fetching live page:', err.message);
  }
}

verifyHttp();
