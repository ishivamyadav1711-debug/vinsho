import fs from 'fs';

const seedData = JSON.parse(fs.readFileSync('vinsho-commerce-seed.json', 'utf8'));

// Filter candle products with price = 499 or sellingPrice = 499
const candleProducts499 = seedData.products.filter(p => {
  const isCandle = p.category === 'candles' || 
                   p.subcategory === 'candles' || 
                   p.subcategoryKey === 'candles' || 
                   (p.name && p.name.toLowerCase().includes('candle')) ||
                   (p.image && p.image.includes('/candles/'));
  
  const price = p.price || p.sellingPrice;
  return isCandle && price === 499;
});

console.log(`Found ${candleProducts499.length} candle products priced at ₹499:\n`);
candleProducts499.forEach((p, idx) => {
  console.log(`${idx + 1}. ${p.name} (slug: ${p.slug}) - Price: ₹${p.price || p.sellingPrice}`);
});
