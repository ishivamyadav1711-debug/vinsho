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

// Load seed products
const seedData = JSON.parse(fs.readFileSync(path.join(__dirname, '../vinsho-commerce-seed.json'), 'utf-8'));
const seedProducts = seedData.products || [];

// Load vinsho_products.json if exists
let vProducts = [];
if (fs.existsSync(path.join(__dirname, '../vinsho_products.json'))) {
  vProducts = JSON.parse(fs.readFileSync(path.join(__dirname, '../vinsho_products.json'), 'utf-8'));
}

// Load vinsho-content.json if exists
let cProducts = [];
if (fs.existsSync(path.join(__dirname, '../vinsho-content.json'))) {
  cProducts = JSON.parse(fs.readFileSync(path.join(__dirname, '../vinsho-content.json'), 'utf-8'));
}

console.log(`Seed products: ${seedProducts.length}`);
console.log(`vinsho_products.json: ${vProducts.length}`);

// Combine all product names from all sources
const allCatalogItems = [];

seedProducts.forEach(p => allCatalogItems.push({ name: p.name, slug: p.slug, source: 'seed' }));
vProducts.forEach(p => {
  if (!allCatalogItems.some(x => x.name === p.name || x.slug === p.slug)) {
    allCatalogItems.push({ name: p.name, slug: p.slug, source: 'vinsho_products.json' });
  }
});

console.log(`Total unique catalog items across files: ${allCatalogItems.length}`);

// Detailed mapping analysis
const results = userList.map((item, index) => {
  const normItem = item.toLowerCase().trim();
  
  // 1. Direct standalone product on website
  const exactProd = allCatalogItems.find(p => p.name.toLowerCase() === normItem || p.name.toLowerCase() === normItem.replace(/cork /i, ''));
  
  // 2. Close match/variation as standalone product
  // Examples:
  // "Cork Belly Coaster" => "Cork Belly Coaster"
  // "Leaf Shape Coaster" => "Cork Leaf Shape Coaster"
  // "Box UV Printed Coaster" => "Cork Box Print Coaster" or "Cork Diamond UV Print Coaster"
  // "Box Print Table Top T.T. Planter" / "Box Printed Table Top Test Tube Planter" => "Box Print Planter — Cork Table Top Planter"
  // "Feather Printed Tabletop T.T. Planter" => "Feather Planter — Cork Table Top Planter"
  // "Diamond Square Planter" => "Diamond Planter — Cork Table Top Planter"
  // "Chocochip Square Planter" => "Chocochip Planter — Cork Table Top Planter"
  
  let standaloneMatch = null;
  if (normItem.includes("belly coaster")) standaloneMatch = "Cork Belly Coaster";
  else if (normItem.includes("leaf shape coaster") || normItem.includes("leaf coaster")) standaloneMatch = "Cork Leaf Shape Coaster";
  else if (normItem.includes("box print planter") || normItem.includes("box printed table top")) standaloneMatch = "Box Print Planter — Cork Table Top Planter";
  else if (normItem.includes("feather printed tabletop") || normItem.includes("feather planter")) standaloneMatch = "Feather Planter — Cork Table Top Planter";
  else if (normItem.includes("diamond square planter") || normItem.includes("diamond planter")) standaloneMatch = "Diamond Planter — Cork Table Top Planter";
  else if (normItem.includes("chocochip square planter") || normItem.includes("chocochip planter")) standaloneMatch = "Chocochip Planter — Cork Table Top Planter";
  else if (normItem === "box uv printed coaster") standaloneMatch = "Cork Box Print Coaster (or Cork Diamond UV Print Coaster)";
  
  // 3. Is it part of a Combo set product listed on the website?
  let comboMatch = null;
  if (normItem.includes("combo 30")) comboMatch = "Combo 30 — Cork Printed Diary & Pen Set";
  else if (normItem.includes("combo 10")) comboMatch = "Combo 10 — Cork Executive Essentials";
  else if (normItem.includes("combo 18")) comboMatch = "Combo 18 — Executive Laptop Set (Ocean Mist)";
  else if (normItem.includes("combo 19")) comboMatch = "Combo 19 — Executive Laptop Set (Deep Blue) / Combo 20 (Brown)";
  else if (normItem.includes("combo 36")) comboMatch = "Combo 36 — Cork Workstation Set";
  else if (normItem.includes("combo 46")) comboMatch = "Combo 46 — Cork Printed Hosting Set";
  
  // Also check general standalone matches from catalog
  if (!standaloneMatch) {
    const found = allCatalogItems.find(p => {
      const pName = p.name.toLowerCase();
      return pName === normItem || (normItem.length > 5 && pName.includes(normItem));
    });
    if (found) standaloneMatch = found.name;
  }

  return {
    num: index + 1,
    item,
    standaloneMatch,
    comboMatch
  };
});

console.log(JSON.stringify(results, null, 2));
