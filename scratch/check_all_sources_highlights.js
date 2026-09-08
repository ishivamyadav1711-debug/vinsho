import fs from 'fs';

const files = ['vinsho-commerce-seed.json', 'vinsho-taxonomy.json', 'vinsho_products.json'];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  const raw = fs.readFileSync(file, 'utf8');
  let data = JSON.parse(raw);
  let products = [];
  if (Array.isArray(data)) products = data;
  else if (data.products && Array.isArray(data.products)) products = data.products;

  const candleProducts = products.filter(p => 
    (p.subcategoryKey === 'candles' || p.subcategory === 'Candles' || p.category === 'candles' || (p.name && p.name.toLowerCase().includes('candle')))
  );

  const missing = candleProducts.filter(p => {
    const hl = p.highlights || p.features;
    return !hl || !Array.isArray(hl) || hl.length === 0;
  });

  console.log(`File: ${file} | Total Candles: ${candleProducts.length} | Missing Highlights: ${missing.length}`);
});
