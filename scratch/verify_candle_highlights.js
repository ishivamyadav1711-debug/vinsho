import fs from 'fs';

const targetSlugs = [
  "teddy-girl-candle",
  "succulent-jar-candle",
  "floral-flower-box-candle",
  "pink-and-cream-floral-bowl-candle",
  "blue-and-white-floral-bowl-candle",
  "pink-floral-bouquet-candle",
  "orange-floral-bouquet-candle",
  "caffe-latte-jar-candle",
  "floral-boat-candle-collection",
  "orange-caramel-layered-jar-candle",
  "floral-relief-pillar-candle",
  "rose-sculpture-pillar-candle",
  "snowman-christmas-candle",
  "pink-heart-scallop-jar-candle",
  "wavy-sculptural-pillar-candle",
  "crescent-moon-candle",
  "swan-sculptural-candle",
  "black-abstract-sculptural-candle",
  "ocean-wave-pillar-candle",
  "couple-embrace-sculptural-candle",
  "cat-sculptural-candle",
  "faceted-bowl-candle",
  "ribbed-pumpkin-bowl-candle",
  "seashell-sculptural-candle",
  "lavender-botanical-pillar-candle",
  "sculptural-animal-bowl-candle",
  "teddy-bear-sculptural-candle"
];

const seedData = JSON.parse(fs.readFileSync('vinsho-commerce-seed.json', 'utf8'));

let successCount = 0;
let missing = [];

targetSlugs.forEach(slug => {
  const p = seedData.products.find(item => item.slug === slug);
  if (!p) {
    missing.push({ slug, reason: 'Product not found' });
    return;
  }
  const hl = p.highlights || p.features;
  const quote = p.highlightsTagline || p.closing_line || p.closingLine;
  if (!hl || !Array.isArray(hl) || hl.length !== 4) {
    missing.push({ slug, reason: `Highlights length is ${hl ? hl.length : 0}` });
  } else if (!quote) {
    missing.push({ slug, reason: 'Missing quote' });
  } else {
    successCount++;
  }
});

console.log(`Verified ${successCount} / ${targetSlugs.length} candle PDP highlights data.`);
if (missing.length > 0) {
  console.log('Issues found:', missing);
} else {
  console.log('SUCCESS: All 27 candle products have 4 highlights and a quote populated!');
}
