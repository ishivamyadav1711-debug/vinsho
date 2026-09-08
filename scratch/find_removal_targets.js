import fs from 'fs';

const seedData = JSON.parse(fs.readFileSync('vinsho-commerce-seed.json', 'utf8'));

const targets = [
  'black-abstract-sculptural-candle',
  'caff-latte-jar-candle', // Duplicate entry to remove (keeping caffe-latte-jar-candle)
  'floral-relief-pillar-candle',
  'rose-sculpture-pillar-candle',
  'snowman-christmas-candle',
  'swan-sculptural-candle',
  'teddy-bear-sculptural-candle'
];

console.log('=== REMOVAL TARGET AUDIT ===\n');

targets.forEach(slug => {
  const p = seedData.products.find(item => item.slug === slug);
  if (p) {
    console.log(`Found: "${p.name}" | slug: ${p.slug} | image: ${p.image}`);
  } else {
    console.log(`NOT Found: slug ${slug}`);
  }
});
