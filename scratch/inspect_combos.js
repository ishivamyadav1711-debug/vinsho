import { db } from '../src/lib/db.js';

console.log('--- INSPECTING EXISTING COMBOS IN DATABASE ---');
const comboProducts = db.prepare(`
  SELECT p.id, p.slug, p.name, c.name as collection_name, v.id as variant_id, v.sku, v.selling_price, v.stock
  FROM products p
  JOIN collections c ON p.collection_id = c.id
  LEFT JOIN product_variants v ON v.product_id = p.id
  WHERE (p.slug LIKE '%combo%' OR p.name LIKE '%combo%' OR p.slug LIKE '%set%')
    AND p.deleted_at IS NULL
  ORDER BY p.id ASC
`).all();

console.log(`Found ${comboProducts.length} combo/set product variants:`);
comboProducts.forEach((p) => {
  console.log(`- ID: ${p.id}, Slug: ${p.slug}, Name: "${p.name}", VariantID: ${p.variant_id}, Stock: ${p.stock}`);
});
