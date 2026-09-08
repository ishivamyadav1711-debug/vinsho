import fs from 'fs';
import path from 'path';

const mapping = {
  '01-floral-flower-box-candle.jpg': 'Floral Flower Box Candle',
  '02-pink-and-cream-floral-bowl-candle.jpg': 'Pink & Cream Floral Bowl Candle',
  '03-blue-and-white-floral-bowl-candle.jpg': 'Blue & White Floral Bowl Candle',
  '04-pink-floral-bouquet-candle.jpg': 'Pink Floral Bouquet Candle',
  '05-orange-floral-bouquet-candle.jpg': 'Orange Floral Bouquet Candle',
  '06-pastel-blue-bowl-candle.jpg': 'Pastel Blue Bowl Candle',
  '07-ocean-bowl-candle.jpg': 'Ocean Bowl Candle',
  '08-orange-pumpkin-bowl-candle.jpg': 'Orange Pumpkin Bowl Candle',
  '09-pumpkin-boat-candle.jpg': 'Pumpkin Boat Candle',
  '10-hearty-gel-wax-jar-candle.jpg': 'Hearty Gel Wax Jar Candle',
  '11-peony-boat-candle.jpg': 'Peony Boat Candle',
  '12-bubble-jar-candle.jpg': 'Bubble Jar Candle',
  '13-blue-love-jar-candle.jpg': 'Blue Love Jar Candle',
  '14-caffe-latte-jar-candle.jpg': 'Caffè Latte Jar Candle',
  '15-3-shade-flower-jar-candle.jpg': '3-Shade Flower Jar Candle',
  '16-whipped-floral-jar-candle.jpg': 'Whipped Floral Jar Candle',
  '17-ocean-jar-candle.jpg': 'Ocean Jar Candle',
  '18-mini-floral-candle-bouquet.jpg': 'Mini Floral Candle Bouquet',
  '19-diamond-jar-candle.jpg': 'Diamond Jar Candle',
  '20-rose-garden-jar-candle.jpg': 'Rose Garden Jar Candle',
  '21-matcha-latte-jar-candle.jpg': 'Matcha Latte Jar Candle',
  '22-3-rose-candle-bouquet.jpg': '3-Rose Candle Bouquet',
  '23-blushing-rose-candle-bouquet.jpg': 'Blushing Rose Candle Bouquet',
  '24-tulip-sapphire-candle-bouquet.jpg': 'Tulip Sapphire Candle Bouquet',
  '25-royal-red-peony-candle.jpg': 'Royal Red Peony Candle',
  '26-white-chocolate-and-strawberry-jar-candle.jpg': 'White Chocolate & Strawberry Jar Candle',
  '27-sunflower-jar-candle.jpg': 'Sunflower Jar Candle',
  '28-floral-jar-candle-and-sachet-combo.jpg': 'Floral Jar Candle & Sachet Combo',
  '29-succulent-jar-candle-small.jpg': 'Succulent Jar Candle – Small',
  '30-red-mini-heart-jar-candle.jpg': 'Red Mini Heart Jar Candle',
  '31-cute-teddy-jar-candle.jpg': 'Cute Teddy Jar Candle',
  '32-seashell-gel-wax-candle.jpg': 'Seashell Gel Wax Candle',
  '33-floral-boat-candle-collection.jpg': 'Floral Boat Candle Collection',
  '34-orange-caramel-layered-jar-candle.jpg': 'Orange Caramel Layered Jar Candle',
  '35-succulent-jar-candle.jpg': 'Succulent Jar Candle',
  '36-floral-relief-pillar-candle.jpg': 'Floral Relief Pillar Candle',
  '37-rose-sculpture-pillar-candle.jpg': 'Rose Sculpture Pillar Candle',
  '38-snowman-christmas-candle.jpg': 'Snowman Christmas Candle',
  '39-pink-heart-scallop-jar-candle.jpg': 'Pink Heart Scallop Jar Candle',
  '40-wavy-sculptural-pillar-candle.jpg': 'Wavy Sculptural Pillar Candle',
  '41-crescent-moon-candle.jpg': 'Crescent Moon Candle',
  '42-swan-sculptural-candle.jpg': 'Swan Sculptural Candle',
  '43-black-abstract-sculptural-candle.jpg': 'Black Abstract Sculptural Candle',
  '44-ocean-wave-pillar-candle.jpg': 'Ocean Wave Pillar Candle',
  '45-couple-embrace-sculptural-candle.jpg': 'Couple Embrace Sculptural Candle',
  '46-cat-sculptural-candle.jpg': 'Cat Sculptural Candle',
  '47-faceted-bowl-candle.jpg': 'Faceted Bowl Candle',
  '48-ribbed-pumpkin-bowl-candle.jpg': 'Ribbed Pumpkin Bowl Candle',
  '49-seashell-sculptural-candle.jpg': 'Seashell Sculptural Candle',
  '50-lavender-botanical-pillar-candle.jpg': 'Lavender Botanical Pillar Candle',
  '51-sculptural-animal-bowl-candle.jpg': 'Sculptural Animal Bowl Candle',
  '52-teddy-bear-sculptural-candle.jpg': 'Teddy Bear Sculptural Candle'
};

const imagesDir = 'public/products/candles';
const existingFiles = fs.readdirSync(imagesDir);

console.log(`Found ${existingFiles.length} files in ${imagesDir}`);

let missingFiles = [];
Object.keys(mapping).forEach(file => {
  if (!existingFiles.includes(file)) {
    missingFiles.push(file);
  }
});
console.log('Missing files from directory:', missingFiles);

// Audit vinsho-commerce-seed.json
const seedData = JSON.parse(fs.readFileSync('vinsho-commerce-seed.json', 'utf8'));
const candleProducts = seedData.products.filter(p => 
  p.category === 'candles' || 
  p.subcategory === 'candles' || 
  (p.name && p.name.toLowerCase().includes('candle')) ||
  (p.image && p.image.includes('/candles/'))
);

console.log(`\nFound ${candleProducts.length} candle products in vinsho-commerce-seed.json`);

// Check mapping completeness in seedData
let unmappedCount = 0;
let correctCount = 0;
let mismatched = [];

candleProducts.forEach(p => {
  const expectedFile = Object.keys(mapping).find(f => {
    const name = mapping[f].toLowerCase().replace(/[^a-z0-9]/g, '');
    const pName = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return name === pName;
  });

  const expectedImg = expectedFile ? `/products/candles/${expectedFile}` : null;
  if (!expectedImg) {
    unmappedCount++;
    console.log(`Unmapped product in catalog: "${p.name}" (slug: ${p.slug}, current img: ${p.image})`);
  } else if (p.image !== expectedImg) {
    mismatched.push({ name: p.name, current: p.image, expected: expectedImg });
  } else {
    correctCount++;
  }
});

console.log(`\nAudit Results:`);
console.log(`- Correctly Mapped: ${correctCount}`);
console.log(`- Image Mismatch: ${mismatched.length}`);
console.log(`- Unmapped in Catalog: ${unmappedCount}`);

if (mismatched.length > 0) {
  console.log('\nMismatches detail:');
  mismatched.forEach(m => console.log(`  - ${m.name}: current "${m.current}" -> expected "${m.expected}"`));
}
