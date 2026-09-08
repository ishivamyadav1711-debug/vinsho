const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const rootDir = process.cwd();
const seedPath = path.join(rootDir, 'vinsho-commerce-seed.json');
const productsJsonPath = path.join(rootDir, 'vinsho_products.json');
const dbPath = path.join(rootDir, 'data', 'vinsho.db');
const imgDir = path.join(rootDir, 'public', 'images', 'vinsho', 'products', 'Corporate-gifting');

const products = [
  { num: 1, id: "cg-01", slug: "cork-diary-as-fab-india-combo-30", name: "Cork Diary — As Fab India Combo 30", file: "01_cork_diary_as_fab_india_combo_30.jpg", type: "combo", status: "mapped", notes: "combo page" },
  { num: 2, id: "cg-02", slug: "cork-metal-pen-combo-30", name: "Cork Metal Pen — Combo 30", file: "02_cork_metal_pen_combo_30.jpg", type: "combo", status: "mapped", notes: "combo page" },
  { num: 3, id: "cg-03", slug: "ecodesk-diary-combo-10", name: "Ecodesk Diary — Combo 10", file: "03_ecodesk_diary_as_combo_10.jpg", type: "combo", status: "mapped", notes: "combo page" },
  { num: 4, id: "cg-04", slug: "cork-card-stacker-combo-10", name: "Cork Card Stacker — Combo 10", file: "04_card_stacker_combo_10.jpg", type: "combo", status: "mapped", notes: "combo page" },
  { num: 5, id: "cg-05", slug: "key-chain-combo-10", name: "Key Chain — Combo 10", file: "05_key_chain_combo_10.jpg", type: "combo", status: "mapped", notes: "combo page" },
  { num: 6, id: "cg-06", slug: "cork-metal-pen-combo-10", name: "Cork Metal Pen — Combo 10", file: "06_cork_metal_pen_combo_10.jpg", type: "combo", status: "mapped", notes: "combo page" },
  { num: 7, id: "cg-07", slug: "cork-canvas-sleeve-combo-10", name: "Cork Canvas Sleeve — Combo 10", file: "07_cork_canvas_sleeve_combo_10.jpg", type: "combo", status: "mapped", notes: "combo page" },
  { num: 8, id: "cg-08", slug: "ocean-mist-bag-combo-18", name: "Ocean Mist Bag — Combo 18", file: "08_ocean_mist_bag_combo_18.jpg", type: "combo", status: "mapped", notes: "combo page" },
  { num: 9, id: "cg-09", slug: "passport-holder-ocean-mist-combo-18", name: "Passport Holder — Ocean Mist Combo 18", file: "09_passport_holder_ocean_mist_combo_18.jpg", type: "combo", status: "mapped", notes: "combo page" },
  { num: 10, id: "cg-10", slug: "cork-bottle-ocean-mist-combo-18", name: "Cork Bottle — Ocean Mist Combo 18", file: "10_cork_bottle_ocean_mist_combo_18.jpg", type: "combo", status: "mapped", notes: "combo page" },
  { num: 11, id: "cg-11", slug: "jet-case-brown-bag-combo-19", name: "Jet Case — Brown Bag Combo 19", file: "11_jet_case_brown_bag_combo_19.jpg", type: "combo", status: "mapped", notes: "combo page" },
  { num: 12, id: "cg-12", slug: "cork-bottle-granco-combo-19", name: "Cork Bottle — Granco Combo 19", file: "12_cork_bottle_granco_combo_19.jpg", type: "combo", status: "mapped", notes: "combo page" },
  { num: 13, id: "cg-13", slug: "passport-holder-granco-combo-19", name: "Passport Holder — Granco Combo 19", file: "13_passport_holder_granco_combo_19.jpg", type: "combo", status: "mapped", notes: "combo page" },
  { num: 14, id: "cg-14", slug: "ecodesk-diary-combo-36", name: "Ecodesk Diary — Combo 36", file: "14_ecodesk_diary_as_combo_36.jpg", type: "combo", status: "mapped", notes: "combo page" },
  { num: 15, id: "cg-15", slug: "small-calculator-combo-36", name: "Small Calculator — Combo 36", file: "15_small_calculator_combo_36.jpg", type: "combo", status: "mapped", notes: "combo page" },
  { num: 16, id: "cg-16", slug: "pen-holder-combo-36", name: "Pen Holder — Combo 36", file: "16_pen_holder_combo_36.jpg", type: "combo", status: "mapped", notes: "combo page" },
  { num: 17, id: "cg-17", slug: "mouse-pad-super-fine-grain-combo-36", name: "Mouse Pad Super Fine Grain — Combo 36", file: "17_mouse_pad_super_fine_grain_combo_36.jpg", type: "combo", status: "mapped", notes: "combo page" },
  { num: 18, id: "cg-18", slug: "cork-metal-pen-combo-36", name: "Cork Metal Pen — Combo 36", file: "18_cork_metal_pen_combo_36.jpg", type: "combo", status: "mapped", notes: "combo page" },
  { num: 19, id: "cg-19", slug: "natural-tray-9x9-inch-combo-46", name: "Natural Tray 9×9 inch — Combo 46", file: "19_natural_tray_9x9_inch_combo_46.jpg", type: "combo", status: "mapped", notes: "combo page" },
  { num: 20, id: "cg-20", slug: "box-uv-printed-coaster-combo-46", name: "Box UV Printed Coaster — Combo 46", file: "20_box_uv_printed_coaster_combo_46.jpg", type: "combo", status: "mapped", notes: "combo page" },
  { num: 21, id: "cg-21", slug: "box-print-table-top-test-tube-holder-combo-46", name: "Box Print Table Top Test Tube Holder — Combo 46", file: "21_box_print_table_top_test_tube_holder_combo_46.jpg", type: "combo", status: "mapped", notes: "combo page" },
  { num: 22, id: "cg-22", slug: "cork-tea-light-holder-assorted-combo-46", name: "Cork Tea Light Holder Assorted — Combo 46", file: "22_cork_tea_light_holder_assorted_combo_46.jpg", type: "combo", status: "mapped", notes: "combo page" },
  { num: 23, id: "cg-23", slug: "round-linear-planter", name: "Round Linear Planter", file: "23_round_linear_planter.jpg", type: "exact", status: "mapped", notes: "visual match" },
  { num: 24, id: "cg-24", slug: "chocochip-square-planter-24", name: "Chocochip Square Planter", file: "24_chocochip_square_planter.jpg", type: "catalog", status: "mapped", notes: "catalog crop (item 24)" },
  { num: 25, id: "cg-25", slug: "natural-bark-planter", name: "Natural Bark Planter", file: "25_natural_bark_planter.jpg", type: "exact", status: "mapped", notes: "visual match" },
  { num: 26, id: "cg-26", slug: "cork-belly-planter", name: "Cork Belly Planter", file: "26_cork_belly_planter.jpg", type: "exact", status: "mapped", notes: "visual match" },
  { num: 27, id: "cg-27", slug: "rectangular-test-tube-planter", name: "Rectangular Test Tube Planter", file: "27_rectangular_test_tube_planter.jpg", type: "exact", status: "mapped", notes: "visual match" },
  { num: 28, id: "cg-28", slug: "box-print-table-top-tt-planter", name: "Box Print Table Top TT Planter", file: "28_box_print_table_top_tt_planter.jpg", type: "catalog", status: "mapped", notes: "catalog crop" },
  { num: 29, id: "cg-29", slug: "feather-printed-tabletop-tt-planter", name: "Feather Printed Tabletop TT Planter", file: "29_feather_printed_tabletop_tt_planter.jpg", type: "catalog", status: "mapped", notes: "catalog crop" },
  { num: 30, id: "cg-30", slug: "multi-printed-tabletop-tt-planter", name: "Multi Printed Tabletop TT Planter", file: "30_multi_printed_tabletop_tt_planter.jpg", type: "catalog", status: "mapped", notes: "catalog crop" },
  { num: 31, id: "cg-31", slug: "cork-conical-flask-planter", name: "Cork Conical Flask Planter", file: "31_cork_conical_flask_planter.jpg", type: "combo", status: "mapped", notes: "combo/catalog reference" },
  { num: 32, id: "cg-32", slug: "wall-frame-test-tube-planter", name: "Wall Frame Test Tube Planter", file: "32_wall_frame_test_tube_planter.jpg", type: "exact", status: "mapped", notes: "page 13 test-tube image" },
  { num: 33, id: "cg-33", slug: "diamond-square-planter", name: "Diamond Square Planter", file: "33_diamond_square_planter.jpg", type: "catalog", status: "mapped", notes: "catalog crop" },
  { num: 34, id: "cg-34", slug: "chocochip-square-planter-34", name: "Chocochip Square Planter", file: "34_chocochip_square_planter.jpg", type: "catalog", status: "mapped", notes: "catalog crop (item 34)" },
  { num: 35, id: "cg-35", slug: "cork-belly-coaster-set", name: "Cork Belly Coaster — Set", file: "35_cork_belly_coaster_set.jpg", type: "catalog", status: "mapped", notes: "catalog crop" },
  { num: 36, id: "cg-36", slug: "leaf-shape-coaster-set", name: "Leaf Shape Coaster — Set", file: "36_leaf_shape_coaster_set.jpg", type: "catalog", status: "mapped", notes: "catalog crop" },
  { num: 37, id: "cg-37", slug: "box-uv-printed-coaster-set", name: "Box UV Printed Coaster — Set", file: "37_box_uv_printed_coaster_set.jpg", type: "catalog", status: "mapped", notes: "catalog crop" },
  { num: 38, id: "cg-38", slug: "cork-fine-natural-trivet-set", name: "Cork Fine Natural Trivet — Set", file: "38_cork_fine_natural_trivet_set.jpg", type: "exact", status: "mapped", notes: "trivet set" },
  { num: 39, id: "cg-39", slug: "chocochip-trivet-set", name: "Chocochip Trivet — Set", file: "39_chocochip_trivet_set.jpg", type: "exact", status: "mapped", notes: "trivet set" },
  { num: 40, id: "cg-40", slug: "red-assiago-trivet-set", name: "Red Assiago Trivet — Set", file: "40_red_assiago_trivet_set.jpg", type: "exact", status: "mapped", notes: "trivet set" },
  { num: 41, id: "cg-41", slug: "striped-trivet-set", name: "Striped Trivet — Set", file: "41_striped_trivet_set.jpg", type: "exact", status: "mapped", notes: "visual match" },
  { num: 42, id: "cg-42", slug: "web-printed-trivet", name: "Web Printed Trivet", file: "42_web_printed_trivet.jpg", type: "catalog", status: "mapped", notes: "catalog crop" },
  { num: 43, id: "cg-43", slug: "smoky-black-small-round-tray", name: "Smoky Black Small Round Tray", file: "", type: "missing", status: "missing", notes: "no matching image file found" },
  { num: 44, id: "cg-44", slug: "cork-tablemat-chocochip-18-inch", name: "Cork Tablemat Chocochip 18\"", file: "44_cork_tablemat_chocochip_18_inch.jpg", type: "catalog", status: "mapped", notes: "catalog crop" },
  { num: 45, id: "cg-45", slug: "cork-tablemat-red-assiago-18-inch", name: "Cork Tablemat Red Assiago 18\"", file: "45_cork_tablemat_red_assiago_18_inch.jpg", type: "catalog", status: "mapped", notes: "catalog crop" },
  { num: 46, id: "cg-46", slug: "cork-tablemat-abstract-18-inch", name: "Cork Tablemat Abstract 18\"", file: "46_cork_tablemat_abstract_18_inch.jpg", type: "catalog", status: "mapped", notes: "catalog crop" },
  { num: 47, id: "cg-47", slug: "cork-tablemat-oval-red-assiago", name: "Cork Tablemat Oval Red Assiago", file: "47_cork_tablemat_oval_red_assiago.jpg", type: "catalog", status: "mapped", notes: "catalog crop" },
  { num: 48, id: "cg-48", slug: "chocochip-napkin-ring", name: "Chocochip Napkin Ring", file: "", type: "missing", status: "missing", notes: "no matching image file found" },
  { num: 49, id: "cg-49", slug: "round-napkin-ring", name: "Round Napkin Ring", file: "", type: "missing", status: "missing", notes: "no matching image file found" },
  { num: 50, id: "cg-50", slug: "fine-grain-napkin-ring", name: "Fine Grain Napkin Ring", file: "", type: "missing", status: "missing", notes: "no matching image file found" }
];

console.log("=== REPLACING CORPORATE GIFTING PRODUCTS IN SEED AND DB WITH EXACT 50 ITEMS ===");

// 1. Update seed data
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

// Filter out old corporate gifting products
const nonCgProducts = seedData.products.filter(p => {
  const subKey = (p.subcategoryKey || p.subCategory || p.subcategory || '').toLowerCase();
  const colKey = (p.collectionKey || p.collection || '').toLowerCase();
  return subKey !== 'corporate-gifting' && colKey !== 'corporate-gifting';
});

// Add exact 50 products
const newCgSeedProducts = products.map(p => {
  const webPath = p.file ? `/images/vinsho/products/Corporate-gifting/${p.file}` : '';
  return {
    id: p.id,
    slug: p.slug,
    sku: p.id.toUpperCase(),
    name: p.name,
    collection: 'Gifting Collection',
    collectionKey: 'gifting-collection',
    subcategory: 'Corporate Gifting',
    subcategoryKey: 'corporate-gifting',
    mainCategory: 'Gifting Collection',
    subCategory: 'corporate-gifting',
    image: webPath,
    material: 'Natural cork',
    description: `${p.name} — Handcrafted sustainable cork product for executive and corporate gifting.`,
    descriptionSource: 'Corporate Gifting Catalog',
    shippingClass: 'standard',
    launchPhase: 1,
    sellableOnline: false,
    returnable: true,
    isPurchasable: false,
    mrp: null,
    sellingPrice: null,
    currency: 'INR',
    stock: null,
    variants: [],
    countryOfOrigin: 'India'
  };
});

seedData.products = [...nonCgProducts, ...newCgSeedProducts];
fs.writeFileSync(seedPath, JSON.stringify(seedData, null, 2), 'utf8');
console.log(`✓ vinsho-commerce-seed.json updated with exactly 50 Corporate Gifting products.`);

// 2. Update SQLite DB
const db = new Database(dbPath);
const colRow = db.prepare("SELECT id FROM collections WHERE key = 'gifting-collection'").get();
const subRow = db.prepare("SELECT id FROM subcategories WHERE key = 'corporate-gifting'").get();
const collectionId = colRow ? colRow.id : 1;
const subcategoryId = subRow ? subRow.id : 1;

db.transaction(() => {
  // Delete all existing products under subcategory corporate-gifting
  const oldProds = db.prepare("SELECT id FROM products WHERE subcategory_id = ?").all(subcategoryId);
  const oldProdIds = oldProds.map(p => p.id);
  if (oldProdIds.length > 0) {
    const placeholders = oldProdIds.map(() => '?').join(',');
    db.prepare(`DELETE FROM product_images WHERE product_id IN (${placeholders})`).run(...oldProdIds);
    db.prepare(`DELETE FROM product_variants WHERE product_id IN (${placeholders})`).run(...oldProdIds);
    db.prepare(`DELETE FROM products WHERE id IN (${placeholders})`).run(...oldProdIds);
  }

  // Insert fresh 50 products
  const insertProdStmt = db.prepare(`
    INSERT INTO products (slug, name, collection_id, subcategory_id, description, material, is_purchasable, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))
  `);
  const insertImgStmt = db.prepare(`
    INSERT INTO product_images (product_id, url, alt, position, is_primary, created_at, updated_at)
    VALUES (?, ?, ?, 1, 1, datetime('now'), datetime('now'))
  `);

  products.forEach(p => {
    const webPath = p.file ? `/images/vinsho/products/Corporate-gifting/${p.file}` : '';
    const desc = `${p.name} — Handcrafted sustainable cork product for executive and corporate gifting.`;
    const res = insertProdStmt.run(p.slug, p.name, collectionId, subcategoryId, desc, 'Natural cork');
    const newId = res.lastInsertRowid;
    if (webPath) {
      insertImgStmt.run(newId, webPath, p.name);
    }
  });
})();

console.log(`✓ SQLite database reset and synced with exactly 50 Corporate Gifting products.`);

// 3. Update IMAGE_MAPPING.csv
const csvLines = [
  'product_number,product_id,product_slug,product_name,image_file,image_web_path,mapping_type,status,notes'
];
products.forEach(p => {
  const webPath = p.file ? `/images/vinsho/products/Corporate-gifting/${p.file}` : '';
  const escapedName = p.name.includes(',') || p.name.includes('"') ? `"${p.name.replace(/"/g, '""')}"` : p.name;
  csvLines.push(`${p.num},${p.id},${p.slug},${escapedName},${p.file},${webPath},${p.type},${p.status},${p.notes}`);
});
fs.writeFileSync(path.join(imgDir, 'IMAGE_MAPPING.csv'), csvLines.join('\n'), 'utf8');

// 4. Update IMAGE_MAPPING.md
const mdLines = [
  '# Corporate Gifting Product Image Mapping',
  '',
  '| # | Product | Product ID | Slug | Image File | Web Path | Type | Status | Notes |',
  '| - | ------- | ---------- | ---- | ---------- | -------- | ---- | ------ | ----- |'
];
products.forEach(p => {
  const webPath = p.file ? `/images/vinsho/products/Corporate-gifting/${p.file}` : '';
  const fileDisplay = p.file ? `\`${p.file}\`` : '*None*';
  const webDisplay = webPath ? `\`${webPath}\`` : '*None*';
  const statusBadge = p.status === 'mapped' ? '✅ mapped' : '❌ missing';
  mdLines.push(`| ${p.num} | ${p.name} | \`${p.id}\` | \`${p.slug}\` | ${fileDisplay} | ${webDisplay} | \`${p.type}\` | ${statusBadge} | ${p.notes} |`);
});
fs.writeFileSync(path.join(imgDir, 'IMAGE_MAPPING.md'), mdLines.join('\n'), 'utf8');
console.log(`✓ Regenerated IMAGE_MAPPING.csv and IMAGE_MAPPING.md`);
