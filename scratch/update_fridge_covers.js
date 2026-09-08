import fs from 'fs';
import Database from 'better-sqlite3';

const db = new Database('data/vinsho.db');

const fridgeCoversData = {
  slug: 'fridge-covers',
  name: 'Fridge covers',
  collection: 'Home Furnishing',
  collectionKey: 'home-furnishing',
  subcategory: 'Cushion',
  subcategoryKey: 'cushion',
  image: 'https://vinsho.in/wp-content/uploads/2025/10/WhatsApp-Image-2025-12-30-at-13.52.38.jpeg',
  material: 'Quilted · Kitchen',
  description: 'Give your kitchen a cleaner and more coordinated appearance with a stylish fridge cover designed to add a decorative layer around your refrigerator. It helps protect the surface from everyday dust and marks while introducing visual character to the kitchen. A practical décor accessory for keeping one of the busiest areas of your home looking organized.',
  descriptionSource: 'curated',
  tagline: 'Protect. Style. Simplify.',
  features: [
    { title: 'Dust & Stain Protection', description: 'Shields your fridge from dust, spills and scratches.' },
    { title: 'Quality Fabric', description: 'Made from durable, washable & long-lasting material.' },
    { title: 'Convenient Pockets', description: 'Extra storage for notes, bills, pens & more.' },
    { title: 'Stylish Design', description: 'Beautiful prints to enhance your kitchen décor.' }
  ],
  closing_line: 'Style that protects.',
  closingLine: 'Style that protects.',
  shippingClass: 'standard',
  launchPhase: 1,
  sellableOnline: true,
  returnable: true,
  sku: null,
  mrp: null,
  sellingPrice: null,
  currency: 'INR',
  countryOfOrigin: 'India',
  mainCategory: 'Home Furnishing',
  subCategory: 'Cushion',
  isPurchasable: false
};

// 1. Update vinsho-commerce-seed.json
const seed = JSON.parse(fs.readFileSync('vinsho-commerce-seed.json', 'utf8'));

// Remove singular 'fridge-cover'
seed.products = seed.products.filter(p => p.slug !== 'fridge-cover' && p.name !== 'Fridge Cover');

// Upsert plural 'fridge-covers' under Home Furnishing
const existingPluralIdx = seed.products.findIndex(p => p.slug === 'fridge-covers');
if (existingPluralIdx > -1) {
  seed.products[existingPluralIdx] = { ...seed.products[existingPluralIdx], ...fridgeCoversData };
} else {
  seed.products.push(fridgeCoversData);
}
fs.writeFileSync('vinsho-commerce-seed.json', JSON.stringify(seed, null, 2), 'utf8');
console.log('Updated vinsho-commerce-seed.json');

// 2. Update vinsho_products.json
let vProds = JSON.parse(fs.readFileSync('vinsho_products.json', 'utf8'));
vProds = vProds.filter(p => p.slug !== 'fridge-cover' && p.name !== 'Fridge Cover');
const vIdx = vProds.findIndex(p => p.slug === 'fridge-covers');
const vObj = {
  id: vIdx > -1 ? vProds[vIdx].id : vProds.length + 1,
  slug: fridgeCoversData.slug,
  name: fridgeCoversData.name,
  category: fridgeCoversData.collection,
  collection: fridgeCoversData.collection,
  subcategory: fridgeCoversData.subcategory,
  tagline: fridgeCoversData.tagline,
  description: fridgeCoversData.description,
  features: fridgeCoversData.features,
  closing_line: fridgeCoversData.closing_line,
  material: fridgeCoversData.material
};
if (vIdx > -1) {
  vProds[vIdx] = vObj;
} else {
  vProds.push(vObj);
}
fs.writeFileSync('vinsho_products.json', JSON.stringify(vProds, null, 2), 'utf8');
console.log('Updated vinsho_products.json');

// 3. Update SQLite Database
const deleteSingular = db.prepare('DELETE FROM products WHERE slug = ? OR name = ?').run('fridge-cover', 'Fridge Cover');
console.log('Deleted singular fridge-cover from DB:', deleteSingular.changes);

const existingDbPlural = db.prepare('SELECT id FROM products WHERE slug = ?').get('fridge-covers');
const now = new Date().toISOString();

if (existingDbPlural) {
  db.prepare(`
    UPDATE products
    SET name = ?, collection_id = 109, subcategory_id = 418, description = ?, tagline = ?, features = ?, closing_line = ?, material = ?, updated_at = ?
    WHERE slug = ?
  `).run(
    fridgeCoversData.name,
    fridgeCoversData.description,
    fridgeCoversData.tagline,
    JSON.stringify(fridgeCoversData.features),
    fridgeCoversData.closing_line,
    fridgeCoversData.material,
    now,
    'fridge-covers'
  );
  console.log('Updated existing fridge-covers in DB');
} else {
  const insertRes = db.prepare(`
    INSERT INTO products (
      slug, name, collection_id, subcategory_id, description, description_source,
      tagline, features, closing_line, material, shipping_class, launch_phase,
      sellable_online, returnable, country_of_origin, is_purchasable, created_at, updated_at
    ) VALUES (?, ?, 109, 418, ?, 'curated', ?, ?, ?, ?, 'standard', 1, 1, 1, 'India', 0, ?, ?)
  `).run(
    fridgeCoversData.slug,
    fridgeCoversData.name,
    fridgeCoversData.description,
    fridgeCoversData.tagline,
    JSON.stringify(fridgeCoversData.features),
    fridgeCoversData.closing_line,
    fridgeCoversData.material,
    now,
    now
  );
  const newId = insertRes.lastInsertRowid;
  db.prepare(`
    INSERT INTO product_images (product_id, url, alt, position, is_primary, created_at, updated_at)
    VALUES (?, ?, ?, 1, 1, ?, ?)
  `).run(newId, fridgeCoversData.image, fridgeCoversData.name, now, now);
  console.log('Inserted new fridge-covers into DB with ID:', newId);
}

console.log('SUCCESS!');
