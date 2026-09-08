import fs from 'fs';

const seedData = JSON.parse(fs.readFileSync('vinsho-commerce-seed.json', 'utf8'));

const removedSlugs = [
  'pink-heart-scallop-jar-candle',
  'black-abstract-sculptural-candle',
  'caff-latte-jar-candle',
  'floral-relief-pillar-candle',
  'rose-sculpture-pillar-candle',
  'snowman-christmas-candle',
  'swan-sculptural-candle',
  'teddy-bear-sculptural-candle'
];

console.log('=== VERIFICATION OF TRANSFER & REMOVAL ===\n');

// Check pink-jar-candle
const pinkJar = seedData.products.find(p => p.slug === 'pink-jar-candle');
if (pinkJar) {
  console.log(`✓ Pink Jar Candle found!`);
  console.log(`  - Image: ${pinkJar.image}`);
  console.log(`  - Highlights count: ${pinkJar.highlights ? pinkJar.highlights.length : 0}`);
  console.log(`  - Quote: "${pinkJar.highlightsTagline}"`);
} else {
  console.log(`❌ Pink Jar Candle NOT found!`);
}

// Check removed slugs
let foundRemoved = 0;
removedSlugs.forEach(slug => {
  const p = seedData.products.find(item => item.slug === slug);
  if (p) {
    foundRemoved++;
    console.log(`❌ Found supposed-to-be-removed product: ${slug}`);
  }
});

if (foundRemoved === 0) {
  console.log(`\n✓ SUCCESS: All 8 target candle products successfully removed from catalog!`);
} else {
  console.log(`\n❌ ERROR: ${foundRemoved} products still present.`);
}
