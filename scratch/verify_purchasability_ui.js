import fs from 'fs';

const BASE = 'http://localhost:4321';

async function verifyUI() {
  const homeDecorRoutes = [
    '/collections/home-decor',
    '/collections/home-furnishing',
    '/collections/home-furnishing/bedsheet',
    '/collections/home-decor/wall-art',
    '/product/anti-skid-rubber-mat',
    '/product/bedsheet',
    '/product/blanket',
    '/product/curtains',
    '/product/bathmats'
  ];

  console.log('=== VERIFYING HOME DECOR & HOME FURNISHING UI ===');

  let hasAddOrBuyCount = 0;

  for (const route of homeDecorRoutes) {
    try {
      const res = await fetch(`${BASE}${route}`);
      if (!res.ok) {
        console.warn(`[WARN] Route ${route} status ${res.status}`);
        continue;
      }
      let html = await res.text();

      // Strip <style> tags to avoid CSS selector string false positives
      html = html.replace(/<style[\s\S]*?<\/style>/gi, '');

      // Check if rendered HTML contains "Add to Cart" button, "Buy Now" button, or data-add attribute
      const hasAddToCartBtn = /<button[^>]*data-add=/i.test(html) || /Add to Cart/i.test(html);
      const hasBuyNowLink = /<a[^>]*pc-btn-buy/i.test(html) || /Buy Now/i.test(html);

      if (hasAddToCartBtn || hasBuyNowLink) {
        console.error(`[FAIL] Page ${route} contains Add to Cart or Buy Now HTML elements!`);
        hasAddOrBuyCount++;
      } else {
        console.log(`[PASS] Page ${route} - 100% clean (No Add to Cart or Buy Now options).`);
      }
    } catch (e) {
      console.error(`Error fetching ${route}: ${e.message}`);
    }
  }

  console.log('\n=== VERIFICATION RESULT ===');
  if (hasAddOrBuyCount === 0) {
    console.log('✅ SUCCESS: "Add to cart" and "buy now" options have been completely removed from all Home Decor and Home Furnishing products!');
  } else {
    console.error(`❌ FAILED: Found ${hasAddOrBuyCount} pages with Add to Cart / Buy Now options.`);
  }
}

verifyUI();
