const fs = require('fs');
const path = require('path');

const officialList = [
  { id: 1, name: "Cork Diary A5 Fab India Combo 30", price: 750 },
  { id: 2, name: "Cork Metal Pen Combo 30", price: 135 },
  { id: 3, name: "Ecodesk Diary A5 Combo 10", price: 405 },
  { id: 4, name: "Card Stacker Combo 10", price: 480 },
  { id: 5, name: "Key Chain Combo 10", price: 195 },
  { id: 6, name: "Cork Metal Pen Combo 10", price: 135 },
  { id: 7, name: "Cork Canvas Sleeve Combo 10", price: 550 },
  { id: 8, name: "Ocean Mist Bag Combo 18", price: 4900 },
  { id: 9, name: "Passport Holder OC Whisky C-18", price: 1350 },
  { id: 10, name: "Cork Bottle Ocean Mist Combo 18", price: 1540 },
  { id: 11, name: "Jet Case Brown Bag Combo 19", price: 4900 },
  { id: 12, name: "Cork Bottle Granco Combo 19", price: 1500 },
  { id: 13, name: "Passport Holder Granco Combo 19", price: 1200 },
  { id: 14, name: "Ecodesk Diary A5 Combo 36", price: 405 },
  { id: 15, name: "Small Calculator Combo 36", price: 750 },
  { id: 16, name: "Pen Holder Combo 36", price: 495 },
  { id: 17, name: "Mouse Pad Super Fine Grain C-36", price: 350 },
  { id: 18, name: "Cork Metal Pen Combo 36", price: 135 },
  { id: 19, name: "Natural Tray 9x9 Inch Combo 46", price: 1800 },
  { id: 20, name: "Box UV Printed Coaster Combo 46", price: 600 },
  { id: 21, name: "Box Print Table Top Test Tube Planter Combo 46", price: 900 },
  { id: 22, name: "Cork Tea Light Holder Assorted C-46", price: 350 },
  { id: 23, name: "Round Line Planter", price: 1250 },
  { id: 24, name: "Chocolate Square Planter", price: 1250 },
  { id: 25, name: "Natural Bark Planter", price: 800 },
  { id: 26, name: "Cork Belly Planter", price: 750 },
  { id: 27, name: "Rectangular Test Tube Planter", price: 1050 },
  { id: 28, name: "Box Print Table Top T.T. Planter", price: 1250 },
  { id: 29, name: "Feather Printed Tabletop T.T. Planter", price: 1250 },
  { id: 30, name: "Multi Printed Tabletop T.T. Planter", price: 800 },
  { id: 31, name: "Cork Conical Flask Planter", price: 800 },
  { id: 32, name: "Wall Frame Test Tube Planter", price: 2300 },
  { id: 33, name: "Diamond Square Planter", price: 1250 },
  { id: 34, name: "Chocolate Chip Square Planter", price: 1250 },
  { id: 35, name: "Cork Belly Coaster Set", price: 720 },
  { id: 36, name: "Leaf Shape Coaster Set", price: 575 },
  { id: 37, name: "Box UV Printed Coaster Set", price: 650 },
  { id: 38, name: "Cork Pine Natural Trivet", price: 1260 },
  { id: 39, name: "Chocolate Chip Trivet", price: 1260 },
  { id: 40, name: "Red Asiago Trivet", price: 1260 },
  { id: 41, name: "Striped Trivet", price: 1260 },
  { id: 42, name: "Web Printed Trivet", price: 945 },
  { id: 43, name: "Smoky Black Small Round Tray", price: 1550 },
  { id: 44, name: "Cork Tablemat Chocolate Chip", price: 1015 },
  { id: 45, name: "Cork Tablemat Red Asiago", price: 1015 },
  { id: 46, name: "Cork Tablemat Abstract", price: 1015 },
  { id: 47, name: "Cork Tablemat Oval Red Asiago", price: 1015 },
  { id: 48, name: "Chocolate Chip Napkin Ring", price: 360 },
  { id: 49, name: "Round Napkin Ring", price: 360 },
  { id: 50, name: "Fine Grain Napkin Ring", price: 360 }
];

const seedData = JSON.parse(fs.readFileSync('vinsho-commerce-seed.json', 'utf8'));

console.log(`Total products in vinsho-commerce-seed.json: ${seedData.products.length}`);

// Normalize strings for matching
function normalize(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

officialList.forEach((item) => {
  const itemNorm = normalize(item.name);
  
  // Exact name or slug match
  let matches = seedData.products.filter(p => {
    const pNorm = normalize(p.name);
    return pNorm === itemNorm || p.slug === item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  });

  // If combo number is present (e.g. 10, 18, 19, 30, 36, 46), ensure combo match
  const comboMatch = item.name.match(/(?:combo|c-?)\s*(\d+)/i);
  const comboNum = comboMatch ? comboMatch[1] : null;

  if (matches.length === 0) {
    // Try partial/intelligent match
    matches = seedData.products.filter(p => {
      const pNorm = normalize(p.name);
      
      // If comboNum exists, p.name or p.slug MUST contain that combo number!
      if (comboNum) {
        const pCombo = p.name.match(/(?:combo|c-?)\s*(\d+)/i) || p.slug.match(/(?:combo|c-?)\s*(\d+)/i);
        if (!pCombo || pCombo[1] !== comboNum) return false;
      }

      // Check fuzzy overlap
      const words = itemNorm.split(' ').filter(w => w.length > 2);
      const matchedWords = words.filter(w => pNorm.includes(w));
      return matchedWords.length >= Math.min(words.length - 1, 2);
    });
  }

  console.log(`\nItem #${item.id}: "${item.name}" (Target Price: ₹${item.price})`);
  if (matches.length === 1) {
    const p = matches[0];
    console.log(`  ✓ MATCH: [id/slug: ${p.slug}] "${p.name}" (Current Price: ₹${p.sellingPrice || p.price})`);
  } else if (matches.length > 1) {
    console.log(`  ⚠ MULTIPLE MATCHES (${matches.length}):`);
    matches.forEach(m => console.log(`    - [${m.slug}] "${m.name}" (Current Price: ₹${m.sellingPrice || m.price})`));
  } else {
    console.log(`  ❌ NO MATCH FOUND`);
  }
});
