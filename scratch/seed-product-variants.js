import Database from 'better-sqlite3';
import path from 'node:path';

const dbPath = path.join(process.cwd(), 'data', 'vinsho.db');
const db = new Database(dbPath);

const products = db.prepare('SELECT id, slug, name, is_purchasable FROM products WHERE deleted_at IS NULL').all();
const now = new Date().toISOString();

const insertVariant = db.prepare(`
  INSERT INTO product_variants (
    product_id, sku, size, colour, mrp, selling_price, currency,
    hsn_code, gst_rate, net_quantity, stock, position, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, 'INR', '9405', 18.0, '1 N', ?, ?, ?, ?)
`);

let createdVariantsCount = 0;

db.transaction(() => {
  db.prepare('DELETE FROM product_variants').run();

  products.forEach((p) => {
    const slug = p.slug.toLowerCase();
    
    // Assign price ranges based on product type if not set
    let basePrice = 499;
    if (slug.includes('candle')) basePrice = 750;
    else if (slug.includes('cork') || slug.includes('combo')) basePrice = 1450;
    else if (slug.includes('vase') || slug.includes('flower')) basePrice = 1290;
    else if (slug.includes('art') || slug.includes('clock') || slug.includes('mirror')) basePrice = 2450;
    else if (slug.includes('frame') || slug.includes('diary')) basePrice = 850;
    else if (slug.includes('mat') || slug.includes('curtain') || slug.includes('bed')) basePrice = 1890;

    // Define 2 variants for gift products, 1 default variant for others
    const isGiftItem = slug.includes('candle') || slug.includes('cork') || slug.includes('combo') || 
                       slug.includes('frame') || slug.includes('vase') || slug.includes('art') || 
                       slug.includes('diary') || slug.includes('buddha') || slug.includes('flower');

    if (isGiftItem) {
      // Variant 1: Standard
      insertVariant.run(
        p.id,
        `SKU-${p.slug.toUpperCase()}-STD`,
        'Standard Size',
        'Natural / Amber',
        Math.round(basePrice * 1.2),
        basePrice,
        100, // Stock
        1,
        now,
        now
      );
      createdVariantsCount++;

      // Variant 2: Deluxe / Gift Packaging Variant
      insertVariant.run(
        p.id,
        `SKU-${p.slug.toUpperCase()}-DLX`,
        'Deluxe Gift Set',
        'Gold / Deep Maroon',
        Math.round(basePrice * 1.6),
        Math.round(basePrice * 1.35),
        50, // Stock
        2,
        now,
        now
      );
      createdVariantsCount++;
    } else {
      // Single default variant
      insertVariant.run(
        p.id,
        `SKU-${p.slug.toUpperCase()}-DEF`,
        'Standard',
        'Default',
        Math.round(basePrice * 1.2),
        basePrice,
        75,
        1,
        now,
        now
      );
      createdVariantsCount++;
    }
  });
})();

console.log(`Successfully generated ${createdVariantsCount} product variant records in database.`);
