import Database from 'better-sqlite3';

const db = new Database('data/vinsho.db');

const rows = db.prepare(`
  SELECT 
    p.id, 
    p.name, 
    p.slug, 
    c.name as collection,
    s.name as subcategory,
    (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image
  FROM products p
  JOIN collections c ON p.collection_id = c.id
  JOIN subcategories s ON p.subcategory_id = s.id
  WHERE p.deleted_at IS NULL
  ORDER BY image ASC
`).all();

// Group products by image URL
const imageMap = new Map();

for (const p of rows) {
  const img = p.image || 'NO_IMAGE';
  if (!imageMap.has(img)) {
    imageMap.set(img, []);
  }
  imageMap.get(img).push(p);
}

// Find images shared by multiple products
const duplicates = [];

for (const [img, products] of imageMap.entries()) {
  if (products.length > 1) {
    duplicates.push({
      image: img,
      count: products.length,
      products: products.map(p => ({ id: p.id, name: p.name, slug: p.slug, subcategory: p.subcategory }))
    });
  }
}

console.log(`Found ${duplicates.length} duplicate image groups across ${duplicates.reduce((sum, d) => sum + d.count, 0)} products:\n`);

duplicates.forEach((d, idx) => {
  console.log(`Group ${idx + 1}: Image "${d.image}" (${d.count} products)`);
  d.products.forEach(p => {
    console.log(`  - [ID ${p.id}] ${p.name} (Slug: ${p.slug}, Subcategory: ${p.subcategory})`);
  });
  console.log('');
});
