import Database from 'better-sqlite3';
import fs from 'fs';

const db = new Database('data/vinsho.db');

const products = db.prepare(`
  SELECT p.id, p.slug, p.name, p.is_purchasable, c.name as collection_name, c.key as collection_key, s.name as sub_name, s.key as sub_key
  FROM products p
  LEFT JOIN collections c ON p.collection_id = c.id
  LEFT JOIN subcategories s ON p.subcategory_id = s.id
`).all();

console.log('=== PRODUCT PURCHASABILITY BREAKDOWN IN DB ===');

const breakdown = {};

products.forEach(p => {
  const key = `${p.collection_name} (${p.collection_key})`;
  if (!breakdown[key]) breakdown[key] = { purchasable: 0, quoteOnly: 0, total: 0 };
  breakdown[key].total++;
  if (p.is_purchasable) {
    breakdown[key].purchasable++;
  } else {
    breakdown[key].quoteOnly++;
  }
});

console.log(breakdown);

const purchasableHome = products.filter(p => 
  (p.collection_key === 'home-decor' || p.collection_key === 'home-furnishing' || 
   p.collection_name === 'Home Decor' || p.collection_name === 'Home Furnishing') && 
  p.is_purchasable
);

console.log(`\nPurchasable products currently in Home Decor or Home Furnishing: ${purchasableHome.length}`);
purchasableHome.forEach(p => console.log(` - [${p.id}] ${p.name} (${p.slug}) | Coll: ${p.collection_name}`));
