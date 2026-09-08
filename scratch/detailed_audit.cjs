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

const seedPath = path.join(__dirname, '../vinsho-commerce-seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
const products = seedData.products || [];

console.log("Analyzing " + userList.length + " user items against " + products.length + " website products...\n");

userList.forEach((item, idx) => {
  const itemLower = item.toLowerCase();
  
  // Find direct matches
  const directMatches = products.filter(p => {
    const pName = p.name.toLowerCase();
    const pSlug = p.slug.toLowerCase();
    return pName.includes(itemLower) || itemLower.includes(pName);
  });

  // Find description / feature matches
  const featureMatches = products.filter(p => {
    const desc = (p.description || '').toLowerCase();
    const features = JSON.stringify(p.features || []).toLowerCase();
    return desc.includes(itemLower) || features.includes(itemLower);
  });

  // Keywords search
  const keywords = itemLower.replace(/—|-/g, ' ').split(' ').filter(w => w.length > 2 && w !== 'combo' && w !== 'cork');
  const keywordMatches = products.filter(p => {
    const pName = p.name.toLowerCase();
    const matchCount = keywords.filter(k => pName.includes(k)).length;
    return matchCount >= Math.min(2, keywords.length);
  });

  console.log(`[Item ${idx + 1}] "${item}"`);
  if (directMatches.length > 0) {
    console.log(`  -> Direct Product Matches: ${directMatches.map(m => `"${m.name}" (${m.slug})`).join(', ')}`);
  }
  if (featureMatches.length > 0) {
    console.log(`  -> Included in Product Details/Features: ${featureMatches.map(m => `"${m.name}" (${m.slug})`).join(', ')}`);
  }
  if (keywordMatches.length > 0 && directMatches.length === 0) {
    console.log(`  -> Closest Website Products by Keywords: ${keywordMatches.map(m => `"${m.name}" (${m.slug})`).join(', ')}`);
  }
  if (directMatches.length === 0 && featureMatches.length === 0 && keywordMatches.length === 0) {
    console.log(`  -> NO MATCH FOUND ON WEBSITE`);
  }
  console.log("");
});
