import fs from 'fs';
import path from 'path';

const imgDir = 'public/products/candles';
const files = fs.readdirSync(imgDir);

// Group files by visual theme/type based on filename keywords
const groups = {
  'Teddy Bear / Animal Candles': [],
  'Floral Bowl & Petal Bowl Candles': [],
  'Floral Bouquet Candles': [],
  'Pumpkin & Autumn Sculptural Candles': [],
  'Ocean & Gel Wax Candles': [],
  'Succulent & Botanical Jar Candles': [],
  'Latte & Food-Theme Jar Candles': [],
  'Boat Shape Floral Candles': [],
  'Sculptural Pillar & Relief Candles': [],
  'Abstract & Celestial Sculptural Candles': [],
  'Heart & Valentine Theme Candles': []
};

files.forEach(f => {
  const name = f.replace(/^\d+-/, '').replace('.jpg', '').replace(/-/g, ' ');
  const lower = name.toLowerCase();

  if (lower.includes('teddy') || lower.includes('cat') || lower.includes('dog') || lower.includes('animal')) {
    groups['Teddy Bear / Animal Candles'].push({ file: f, name });
  } else if (lower.includes('bowl')) {
    groups['Floral Bowl & Petal Bowl Candles'].push({ file: f, name });
  } else if (lower.includes('bouquet')) {
    groups['Floral Bouquet Candles'].push({ file: f, name });
  } else if (lower.includes('pumpkin')) {
    groups['Pumpkin & Autumn Sculptural Candles'].push({ file: f, name });
  } else if (lower.includes('ocean') || lower.includes('gel') || lower.includes('seashell')) {
    groups['Ocean & Gel Wax Candles'].push({ file: f, name });
  } else if (lower.includes('succulent') || lower.includes('botanical') || lower.includes('rose garden')) {
    groups['Succulent & Botanical Jar Candles'].push({ file: f, name });
  } else if (lower.includes('latte') || lower.includes('chocolate') || lower.includes('caramel')) {
    groups['Latte & Food-Theme Jar Candles'].push({ file: f, name });
  } else if (lower.includes('boat')) {
    groups['Boat Shape Floral Candles'].push({ file: f, name });
  } else if (lower.includes('pillar') || lower.includes('relief') || lower.includes('sculpture pillar')) {
    groups['Sculptural Pillar & Relief Candles'].push({ file: f, name });
  } else if (lower.includes('abstract') || lower.includes('moon') || lower.includes('swan') || lower.includes('faceted') || lower.includes('couple')) {
    groups['Abstract & Celestial Sculptural Candles'].push({ file: f, name });
  } else if (lower.includes('heart')) {
    groups['Heart & Valentine Theme Candles'].push({ file: f, name });
  }
});

console.log('=== CANDLES WITH SIMILAR IMAGES & VISUAL DESIGN THEMES ===\n');

Object.keys(groups).forEach(groupName => {
  console.log(`### ${groupName} (${groups[groupName].length} items):`);
  groups[groupName].forEach(item => {
    console.log(`  • ${item.file} -> "${item.name}"`);
  });
  console.log('');
});
