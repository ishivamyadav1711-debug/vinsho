import fs from 'fs';

const seedData = JSON.parse(fs.readFileSync('vinsho-commerce-seed.json', 'utf8'));

// Filter all candle products
const candleProducts = seedData.products.filter(p => 
  p.category === 'candles' || 
  p.subcategory === 'candles' || 
  p.subcategoryKey === 'candles' || 
  (p.name && p.name.toLowerCase().includes('candle')) ||
  (p.image && p.image.includes('/candles/'))
);

console.log('=== CANDLE PRODUCT PRICES AS STORED & DISPLAYED ON WEBSITE ===\n');

const price499List = [];
const non499List = [];

candleProducts.forEach(p => {
  const priceVal = p.price || p.sellingPrice;
  const isPurchasable = p.isPurchasable;

  if (priceVal === 499) {
    price499List.push({ name: p.name, slug: p.slug, priceVal, isPurchasable });
  } else {
    non499List.push({ name: p.name, slug: p.slug, priceVal, isPurchasable });
  }
});

console.log(`Candles with price ₹499 (${price499List.length}):`);
price499List.forEach(p => {
  console.log(`  • ${p.name} (slug: ${p.slug})`);
});

console.log(`\nAll Other Candles (${non499List.length}):`);
non499List.forEach(p => {
  console.log(`  • ${p.name} (slug: ${p.slug}) -> Price: ${p.priceVal ? '₹' + p.priceVal : 'Price on request'}`);
});
