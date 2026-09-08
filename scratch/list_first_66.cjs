const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '../vinsho-commerce-seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
const products = seedData.products || [];

console.log("FIRST 66 PRODUCTS:");
products.slice(0, 66).forEach((p, i) => {
  console.log(`${i + 1}. [${p.slug}] "${p.name}" (${p.collection} / ${p.subcategory})`);
});
