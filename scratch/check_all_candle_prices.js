import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';

const seedData = JSON.parse(fs.readFileSync('vinsho-commerce-seed.json', 'utf8'));

const candleProducts = seedData.products.filter(p => 
  p.category === 'candles' || 
  p.subcategory === 'candles' || 
  p.subcategoryKey === 'candles' || 
  (p.name && p.name.toLowerCase().includes('candle')) ||
  (p.image && p.image.includes('/candles/'))
);

console.log('=== CANDLE PRODUCT PRICES IN COMMERCE SEED ===\n');
const priceCounts = {};
candleProducts.forEach(p => {
  const pr = p.price || p.sellingPrice || 'No price set (Quote/Purchasability evaluation)';
  priceCounts[pr] = (priceCounts[pr] || 0) + 1;
  console.log(`• ${p.name} (slug: ${p.slug}) -> Price: ${pr} | isPurchasable: ${p.isPurchasable}`);
});

console.log('\nPrice summary:', priceCounts);
