const fs = require('fs');
const seed = JSON.parse(fs.readFileSync('vinsho-commerce-seed.json', 'utf8'));

console.log("Subcategory keys in seed:");
const subs = {};
seed.products.forEach(p => {
  const key = p.subcategoryKey || p.subCategory || p.subcategory || 'none';
  subs[key] = (subs[key] || 0) + 1;
});
console.log(subs);

console.log("\nProducts under 'gifting-collection' or 'corporate-gifting':");
seed.products.forEach((p, idx) => {
  if (p.collectionKey === 'gifting-collection' || p.subcategoryKey === 'corporate-gifting' || p.subCategory === 'corporate-gifting') {
    console.log(`[${idx}] slug=${p.slug} | name=${p.name} | img=${p.image}`);
  }
});
