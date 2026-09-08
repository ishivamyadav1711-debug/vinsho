import fs from 'fs';

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

function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Map of normalized name to relative image path
const normToImg = {};
Object.keys(mapping).forEach(file => {
  const norm = normalize(mapping[file]);
  normToImg[norm] = `/products/candles/${file}`;
});

// Update vinsho-commerce-seed.json
const seedFile = 'vinsho-commerce-seed.json';
if (fs.existsSync(seedFile)) {
  const data = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
  let updatedCount = 0;
  data.products.forEach(p => {
    const norm = normalize(p.name);
    if (normToImg[norm]) {
      if (p.image !== normToImg[norm]) {
        p.image = normToImg[norm];
        updatedCount++;
      }
    }
  });
  fs.writeFileSync(seedFile, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Updated ${updatedCount} products in ${seedFile}`);
}

// Update vinsho-taxonomy.json
const taxFile = 'vinsho-taxonomy.json';
if (fs.existsSync(taxFile)) {
  const data = JSON.parse(fs.readFileSync(taxFile, 'utf8'));
  let updatedCount = 0;
  if (data.products && Array.isArray(data.products)) {
    data.products.forEach(p => {
      const norm = normalize(p.name);
      if (normToImg[norm]) {
        if (p.image !== normToImg[norm]) {
          p.image = normToImg[norm];
          updatedCount++;
        }
      }
    });
  }
  fs.writeFileSync(taxFile, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Updated ${updatedCount} products in ${taxFile}`);
}

// Update vinsho-content.json
const contentFile = 'vinsho-content.json';
if (fs.existsSync(contentFile)) {
  const data = JSON.parse(fs.readFileSync(contentFile, 'utf8'));
  let updatedCount = 0;
  if (Array.isArray(data)) {
    data.forEach(p => {
      const norm = normalize(p.name || '');
      if (normToImg[norm]) {
        if (p.image !== normToImg[norm]) {
          p.image = normToImg[norm];
          updatedCount++;
        }
      }
    });
  } else if (data.products && Array.isArray(data.products)) {
    data.products.forEach(p => {
      const norm = normalize(p.name || '');
      if (normToImg[norm]) {
        if (p.image !== normToImg[norm]) {
          p.image = normToImg[norm];
          updatedCount++;
        }
      }
    });
  }
  fs.writeFileSync(contentFile, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Updated ${updatedCount} products in ${contentFile}`);
}

// Update vinsho_products.json
const vProdFile = 'vinsho_products.json';
if (fs.existsSync(vProdFile)) {
  const data = JSON.parse(fs.readFileSync(vProdFile, 'utf8'));
  let updatedCount = 0;
  if (Array.isArray(data)) {
    data.forEach(p => {
      const norm = normalize(p.name || '');
      if (normToImg[norm]) {
        if (p.image !== normToImg[norm]) {
          p.image = normToImg[norm];
          updatedCount++;
        }
      }
    });
  }
  fs.writeFileSync(vProdFile, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Updated ${updatedCount} products in ${vProdFile}`);
}
