import fs from 'fs';

const seedData = JSON.parse(fs.readFileSync('vinsho-commerce-seed.json', 'utf8'));

// Filter all candle products
const candleProducts = seedData.products.filter(p => 
  p.category === 'candles' || 
  p.subcategory === 'candles' || 
  (p.name && p.name.toLowerCase().includes('candle')) ||
  (p.image && p.image.includes('/candles/'))
);

// Map image path to list of product names
const imgMap = {};
candleProducts.forEach(p => {
  if (!imgMap[p.image]) {
    imgMap[p.image] = [];
  }
  imgMap[p.image].push(p);
});

console.log('=== CANDLE PRODUCTS WITHOUT DEDICATED / UNIQUE / PROVABLE UNIQUE IMAGES ===\n');

// 1. Candle products that use generic, unsplash, or unconfirmed placeholder image paths (not in /products/candles/)
const nonDedicated = candleProducts.filter(p => !p.image || !p.image.startsWith('/products/candles/'));
console.log(`1. Candle Products Using Generic / Unconfirmed / Non-Dedicated Image Files (${nonDedicated.length}):`);
nonDedicated.forEach(p => {
  console.log(`   • ${p.name} (Slug: ${p.slug}) -> Image: ${p.image}`);
});

// 2. Image paths that are shared by 2 or more candle products
console.log('\n2. Candle Products Sharing the Same Image File (Duplicate Image Assignments):');
let sharedCount = 0;
Object.keys(imgMap).forEach(img => {
  if (imgMap[img].length > 1) {
    sharedCount++;
    console.log(`   Image "${img}" is shared by ${imgMap[img].length} products:`);
    imgMap[img].forEach(p => {
      console.log(`     - ${p.name} (Slug: ${p.slug})`);
    });
  }
});

if (sharedCount === 0) {
  console.log('   (No 2 products share the exact same image path among the 52 mapped candles)');
}
