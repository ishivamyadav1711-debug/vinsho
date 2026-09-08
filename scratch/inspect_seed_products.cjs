const fs = require('fs');
const seedData = JSON.parse(fs.readFileSync('vinsho-commerce-seed.json', 'utf8'));

console.log(`Total Products: ${seedData.products.length}\n`);
seedData.products.forEach((p, idx) => {
  console.log(`${idx + 1}. [slug: "${p.slug}"] "${p.name}" (price: ${p.sellingPrice || p.mrp || p.price})`);
});
