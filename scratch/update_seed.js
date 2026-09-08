import fs from 'node:fs';
import path from 'node:path';

const seedPath = path.join(process.cwd(), 'vinsho-commerce-seed.json');
if (fs.existsSync(seedPath)) {
  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const products = Array.isArray(seedData) ? seedData : (seedData.products || []);
  const seedProd = products.find((p) => p.slug === 'ecodesk-diary-combo-10');
  if (seedProd) {
    seedProd.image = '/images/vinsho/products/Corporate-gifting/03_ecodesk_diary_as_combo_10_1.jpg';
    seedProd.images = [
      '/images/vinsho/products/Corporate-gifting/03_ecodesk_diary_as_combo_10_1.jpg',
      '/images/vinsho/products/Corporate-gifting/03_ecodesk_diary_as_combo_10_2.jpg'
    ];
    fs.writeFileSync(seedPath, JSON.stringify(seedData, null, 2));
    console.log('Updated vinsho-commerce-seed.json successfully.');
  } else {
    console.log('Product not found in seedData array');
  }
}
