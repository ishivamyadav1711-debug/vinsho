const fs = require('fs');

const prods = JSON.parse(fs.readFileSync('vinsho_products.json', 'utf8'));
console.log("vinsho_products.json total length:", prods.length);

const sample = prods.filter(p => p.category === 'Corporate Gifting' || p.category === 'Cork Products' || (p.subcategory && p.subcategory.includes('Corporate')));
console.log("Corporate/Cork products in vinsho_products.json:", sample.length);
sample.forEach(p => console.log(`  id=${p.id}, slug=${p.slug}, name=${p.name}`));
