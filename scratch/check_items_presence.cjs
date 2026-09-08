const fs = require('fs');
const path = require('path');

const userList = [
  "Cork Diary — Asfab India Combo 30",
  "Cork Metal Pen — Combo 30",
  "Ecodesk Diary — Combo 10",
  "Card Stacker — Combo 10",
  "Key Chain — Combo 10",
  "Cork Metal Pen — Combo 10",
  "Cork Canvas Sleeve — Combo 10",
  "Ocean Mist Bag — Combo 18",
  "Passport Holder — Ocean Mist — Combo 18",
  "Cork Bottle — Ocean Mist — Combo 18",
  "Jet Case Brown Bag — Combo 19",
  "Cork Bottle — Granco — Combo 19",
  "Passport Holder — Granco — Combo 19",
  "Ecodesk Diary — Combo 36",
  "Small Calculator — Combo 36",
  "Pen Holder — Combo 36",
  "Mouse Pad — Super Fine Grain — C-36",
  "Cork Metal Pen — Combo 36",
  "Natural Tray — 9×9 Inch — Combo 46",
  "Box UV Printed Coaster — Combo 46",
  "Box Printed Table Top Test Tube Planter — Combo 46",
  "Cork Tea Light Holder — Assorted — C-46",
  "Round Wine Planter",
  "Crocodile Square Planter",
  "Natural Bark Planter",
  "Cork Belly Planter",
  "Rectangular Test Tube Planter",
  "Box Print Table Top T.T. Planter",
  "Feather Printed Tabletop T.T. Planter",
  "Multi Printed Tabletop T.T. Planter",
  "Cork Conical Flask Planter",
  "Wall Frame Test Tube Planter",
  "Diamond Square Planter",
  "Chocochip Square Planter",
  "Cork Belly Coaster",
  "Leaf Shape Coaster",
  "Box UV Printed Coaster",
  "Cork Fine Natural Trivet",
  "Chocochip Trivet",
  "Red Assiago Trivet",
  "Striped Trivet",
  "Web Printed Trivet",
  "Smoky Black Small Round Tray",
  "Cork Tablemat — Chocochip — 9\"",
  "Cork Tablemat — Red Assiago",
  "Cork Tablemat — Abstract",
  "Cork Tablemat — Oval Red Assiago",
  "Chocochip Napkin Ring",
  "Round Napkin Ring",
  "Fine Grain Napkin Ring"
];

// Load seed data
const seedPath = path.join(__dirname, '../vinsho-commerce-seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
const websiteProducts = seedData.products || [];

console.log(`Total website products in seed: ${websiteProducts.length}`);

// Also check vinsho_products.json if exists
let otherProducts = [];
if (fs.existsSync(path.join(__dirname, '../vinsho_products.json'))) {
  otherProducts = JSON.parse(fs.readFileSync(path.join(__dirname, '../vinsho_products.json'), 'utf-8'));
}

function normalize(str) {
  return str.toLowerCase()
    .replace(/[—–-]/g, ' ')
    .replace(/[“”"']/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const websiteNames = websiteProducts.map(p => ({
  raw: p.name,
  norm: normalize(p.name),
  slug: p.slug
}));

const present = [];
const notPresent = [];

userList.forEach((item, index) => {
  const normItem = normalize(item);
  
  // Exact norm match
  let match = websiteNames.find(w => w.norm === normItem);
  
  // Fuzzy/substring match check
  if (!match) {
    match = websiteNames.find(w => {
      // Compare core words
      const itemWords = normItem.split(' ');
      const wWords = w.norm.split(' ');
      const matchAll = itemWords.every(word => w.norm.includes(word));
      return matchAll;
    });
  }

  if (match) {
    present.push({ index: index + 1, item, matchedName: match.raw, slug: match.slug });
  } else {
    notPresent.push({ index: index + 1, item });
  }
});

console.log("=== PRESENT ===");
present.forEach(p => console.log(`${p.index}. ${p.item} ===> Matched: "${p.matchedName}"`));

console.log("\n=== NOT PRESENT ===");
notPresent.forEach(np => console.log(`${np.index}. ${np.item}`));

console.log(`\nSummary: Present: ${present.length}, Not Present: ${notPresent.length}`);
