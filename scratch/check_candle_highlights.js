import fs from 'fs';

const seedData = JSON.parse(fs.readFileSync('vinsho-commerce-seed.json', 'utf8'));

// Filter all candle products
const candleProducts = seedData.products.filter(p => 
  p.category === 'candles' || 
  p.subcategory === 'candles' || 
  (p.name && p.name.toLowerCase().includes('candle')) ||
  (p.image && p.image.includes('/candles/'))
);

const missingHighlights = [];
const hasHighlights = [];

candleProducts.forEach(p => {
  const hl = p.highlights || p.features;
  if (!hl || !Array.isArray(hl) || hl.length === 0) {
    missingHighlights.push(p);
  } else {
    hasHighlights.push(p);
  }
});

console.log(`Total candle products evaluated: ${candleProducts.length}`);
console.log(`Products WITH highlights: ${hasHighlights.length}`);
console.log(`Products WITHOUT highlights: ${missingHighlights.length}\n`);

console.log('=== CANDLE PRODUCTS WITHOUT "DESIGN & CRAFTSMANSHIP HIGHLIGHTS" ===\n');
missingHighlights.forEach((p, index) => {
  console.log(`${index + 1}. ${p.name} (slug: ${p.slug})`);
});
