import fs from 'node:fs';

const candlesData = JSON.parse(fs.readFileSync('src/data/products/candles.json', 'utf8'));
const seedData = JSON.parse(fs.readFileSync('vinsho-commerce-seed.json', 'utf8'));

const images52 = [
  { id: 1, file: '01-floral-flower-box-candle.jpg', name: 'Floral Flower Box Candle' },
  { id: 2, file: '02-pink-and-cream-floral-bowl-candle.jpg', name: 'Pink & Cream Floral Bowl Candle' },
  { id: 3, file: '03-blue-and-white-floral-bowl-candle.jpg', name: 'Blue & White Floral Bowl Candle' },
  { id: 4, file: '04-pink-floral-bouquet-candle.jpg', name: 'Pink Floral Bouquet Candle' },
  { id: 5, file: '05-orange-floral-bouquet-candle.jpg', name: 'Orange Floral Bouquet Candle' },
  { id: 6, file: '06-pastel-blue-bowl-candle.jpg', name: 'Pastel Blue Bowl Candle' },
  { id: 7, file: '07-ocean-bowl-candle.jpg', name: 'Ocean Bowl Candle' },
  { id: 8, file: '08-orange-pumpkin-bowl-candle.jpg', name: 'Orange Pumpkin Bowl Candle' },
  { id: 9, file: '09-pumpkin-boat-candle.jpg', name: 'Pumpkin Boat Candle' },
  { id: 10, file: '10-hearty-gel-wax-jar-candle.jpg', name: 'Hearty Gel Wax Jar Candle' },
  { id: 11, file: '11-peony-boat-candle.jpg', name: 'Peony Boat Candle' },
  { id: 12, file: '12-bubble-jar-candle.jpg', name: 'Bubble Jar Candle' },
  { id: 13, file: '13-blue-love-jar-candle.jpg', name: 'Blue Love Jar Candle' },
  { id: 14, file: '14-caffe-latte-jar-candle.jpg', name: 'Caffè Latte Jar Candle' },
  { id: 15, file: '15-3-shade-flower-jar-candle.jpg', name: '3-Shade Flower Jar Candle' },
  { id: 16, file: '16-whipped-floral-jar-candle.jpg', name: 'Whipped Floral Jar Candle' },
  { id: 17, file: '17-ocean-jar-candle.jpg', name: 'Ocean Jar Candle' },
  { id: 18, file: '18-mini-floral-candle-bouquet.jpg', name: 'Mini Floral Candle Bouquet' },
  { id: 19, file: '19-diamond-jar-candle.jpg', name: 'Diamond Jar Candle' },
  { id: 20, file: '20-rose-garden-jar-candle.jpg', name: 'Rose Garden Jar Candle' },
  { id: 21, file: '21-matcha-latte-jar-candle.jpg', name: 'Matcha Latte Jar Candle' },
  { id: 22, file: '22-3-rose-candle-bouquet.jpg', name: '3-Rose Candle Bouquet' },
  { id: 23, file: '23-blushing-rose-candle-bouquet.jpg', name: 'Blushing Rose Candle Bouquet' },
  { id: 24, file: '24-tulip-sapphire-candle-bouquet.jpg', name: 'Tulip Sapphire Candle Bouquet' },
  { id: 25, file: '25-royal-red-peony-candle.jpg', name: 'Royal Red Peony Candle' },
  { id: 26, file: '26-white-chocolate-and-strawberry-jar-candle.jpg', name: 'White Chocolate & Strawberry Jar Candle' },
  { id: 27, file: '27-sunflower-jar-candle.jpg', name: 'Sunflower Jar Candle' },
  { id: 28, file: '28-floral-jar-candle-and-sachet-combo.jpg', name: 'Floral Jar Candle & Sachet Combo' },
  { id: 29, file: '29-succulent-jar-candle-small.jpg', name: 'Succulent Jar Candle – Small' },
  { id: 30, file: '30-red-mini-heart-jar-candle.jpg', name: 'Red Mini Heart Jar Candle' },
  { id: 31, file: '31-cute-teddy-jar-candle.jpg', name: 'Cute Teddy Jar Candle' },
  { id: 32, file: '32-seashell-gel-wax-candle.jpg', name: 'Seashell Gel Wax Candle' },
  { id: 33, file: '33-floral-boat-candle-collection.jpg', name: 'Floral Boat Candle Collection' },
  { id: 34, file: '34-orange-caramel-layered-jar-candle.jpg', name: 'Orange Caramel Layered Jar Candle' },
  { id: 35, file: '35-succulent-jar-candle.jpg', name: 'Succulent Jar Candle' },
  { id: 36, file: '36-floral-relief-pillar-candle.jpg', name: 'Floral Relief Pillar Candle' },
  { id: 37, file: '37-rose-sculpture-pillar-candle.jpg', name: 'Rose Sculpture Pillar Candle' },
  { id: 38, file: '38-snowman-christmas-candle.jpg', name: 'Snowman Christmas Candle' },
  { id: 39, file: '39-pink-heart-scallop-jar-candle.jpg', name: 'Pink Heart Scallop Jar Candle' },
  { id: 40, file: '40-wavy-sculptural-pillar-candle.jpg', name: 'Wavy Sculptural Pillar Candle' },
  { id: 41, file: '41-crescent-moon-candle.jpg', name: 'Crescent Moon Candle' },
  { id: 42, file: '42-swan-sculptural-candle.jpg', name: 'Swan Sculptural Candle' },
  { id: 43, file: '43-black-abstract-sculptural-candle.jpg', name: 'Black Abstract Sculptural Candle' },
  { id: 44, file: '44-ocean-wave-pillar-candle.jpg', name: 'Ocean Wave Pillar Candle' },
  { id: 45, file: '45-couple-embrace-sculptural-candle.jpg', name: 'Couple Embrace Sculptural Candle' },
  { id: 46, file: '46-cat-sculptural-candle.jpg', name: 'Cat Sculptural Candle' },
  { id: 47, file: '47-faceted-bowl-candle.jpg', name: 'Faceted Bowl Candle' },
  { id: 48, file: '48-ribbed-pumpkin-bowl-candle.jpg', name: 'Ribbed Pumpkin Bowl Candle' },
  { id: 49, file: '49-seashell-sculptural-candle.jpg', name: 'Seashell Sculptural Candle' },
  { id: 50, file: '50-lavender-botanical-pillar-candle.jpg', name: 'Lavender Botanical Pillar Candle' },
  { id: 51, file: '51-sculptural-animal-bowl-candle.jpg', name: 'Sculptural Animal Bowl Candle' },
  { id: 52, file: '52-teddy-bear-sculptural-candle.jpg', name: 'Teddy Bear Sculptural Candle' }
];

console.log('=== SUMMARY OF ALL 52 IMAGES ===');
images52.forEach(img => {
  const normSlug = img.file.replace(/^\d+-/, '').replace(/\.jpg$/, '');
  const normName = img.name.toLowerCase().replace(/&/g, 'and').replace(/[–—]/g, '-').replace(/[^a-z0-9]/g, '');

  let seedMatch = seedData.products.find(p => p.slug === normSlug || p.slug === normSlug.replace(/-and-/g, '-'));
  if (!seedMatch) {
    seedMatch = seedData.products.find(p => p.name.toLowerCase().replace(/&/g, 'and').replace(/[–—]/g, '-').replace(/[^a-z0-9]/g, '') === normName);
  }

  // Also check if Diamond Jar Candle (Gift) matches #19
  if (!seedMatch && img.id === 19) {
    seedMatch = seedData.products.find(p => p.slug === 'diamond-jar-candle-gift');
  }

  if (seedMatch) {
    console.log(`#${String(img.id).padStart(2, '0')} | MATCHED   | ${img.file} => Product: "${seedMatch.name}" (${seedMatch.slug})`);
  } else {
    console.log(`#${String(img.id).padStart(2, '0')} | NOT IN SEED | ${img.file} => Target Name: "${img.name}"`);
  }
});
