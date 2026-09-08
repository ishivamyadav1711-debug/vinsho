const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const seedPath = path.join(process.cwd(), 'vinsho-commerce-seed.json');
const productsJsonPath = path.join(process.cwd(), 'vinsho_products.json');
const dbPath = path.join(process.cwd(), 'data', 'vinsho.db');

const seed = fs.existsSync(seedPath) ? JSON.parse(fs.readFileSync(seedPath, 'utf8')) : { products: [] };
const prodsJson = fs.existsSync(productsJsonPath) ? JSON.parse(fs.readFileSync(productsJsonPath, 'utf8')) : [];
const db = fs.existsSync(dbPath) ? new Database(dbPath) : null;

const targetList = [
  { id: 1, name: "Cork Diary — As Fab India Combo 30", file: "01_cork_diary_as_fab_india_combo_30.jpg" },
  { id: 2, name: "Cork Metal Pen — Combo 30", file: "02_cork_metal_pen_combo_30.jpg" },
  { id: 3, name: "Ecodesk Diary — Combo 10", file: "03_ecodesk_diary_as_combo_10.jpg" },
  { id: 4, name: "Cork Card Stacker — Combo 10", file: "04_card_stacker_combo_10.jpg" },
  { id: 5, name: "Key Chain — Combo 10", file: "05_key_chain_combo_10.jpg" },
  { id: 6, name: "Cork Metal Pen — Combo 10", file: "06_cork_metal_pen_combo_10.jpg" },
  { id: 7, name: "Cork Canvas Sleeve — Combo 10", file: "07_cork_canvas_sleeve_combo_10.jpg" },
  { id: 8, name: "Ocean Mist Bag — Combo 18", file: "08_ocean_mist_bag_combo_18.jpg" },
  { id: 9, name: "Passport Holder — Ocean Mist Combo 18", file: "09_passport_holder_ocean_mist_combo_18.jpg" },
  { id: 10, name: "Cork Bottle — Ocean Mist Combo 18", file: "10_cork_bottle_ocean_mist_combo_18.jpg" },
  { id: 11, name: "Jet Case — Brown Bag Combo 19", file: "11_jet_case_brown_bag_combo_19.jpg" },
  { id: 12, name: "Cork Bottle — Granco Combo 19", file: "12_cork_bottle_granco_combo_19.jpg" },
  { id: 13, name: "Passport Holder — Granco Combo 19", file: "13_passport_holder_granco_combo_19.jpg" },
  { id: 14, name: "Ecodesk Diary — Combo 36", file: "14_ecodesk_diary_as_combo_36.jpg" },
  { id: 15, name: "Small Calculator — Combo 36", file: "15_small_calculator_combo_36.jpg" },
  { id: 16, name: "Pen Holder — Combo 36", file: "16_pen_holder_combo_36.jpg" },
  { id: 17, name: "Mouse Pad Super Fine Grain — Combo 36", file: "17_mouse_pad_super_fine_grain_combo_36.jpg" },
  { id: 18, name: "Cork Metal Pen — Combo 36", file: "18_cork_metal_pen_combo_36.jpg" },
  { id: 19, name: "Natural Tray 9×9 inch — Combo 46", file: "19_natural_tray_9x9_inch_combo_46.jpg" },
  { id: 20, name: "Box UV Printed Coaster — Combo 46", file: "20_box_uv_printed_coaster_combo_46.jpg" },
  { id: 21, name: "Box Print Table Top Test Tube Holder — Combo 46", file: "21_box_print_table_top_test_tube_holder_combo_46.jpg" },
  { id: 22, name: "Cork Tea Light Holder Assorted — Combo 46", file: "22_cork_tea_light_holder_assorted_combo_46.jpg" },
  { id: 23, name: "Round Linear Planter", file: "23_round_linear_planter.jpg" },
  { id: 24, name: "Chocochip Square Planter", file: "24_chocochip_square_planter.jpg" },
  { id: 25, name: "Natural Bark Planter", file: "25_natural_bark_planter.jpg" },
  { id: 26, name: "Cork Belly Planter", file: "26_cork_belly_planter.jpg" },
  { id: 27, name: "Rectangular Test Tube Planter", file: "27_rectangular_test_tube_planter.jpg" },
  { id: 28, name: "Box Print Table Top TT Planter", file: "28_box_print_table_top_tt_planter.jpg" },
  { id: 29, name: "Feather Printed Tabletop TT Planter", file: "29_feather_printed_tabletop_tt_planter.jpg" },
  { id: 30, name: "Multi Printed Tabletop TT Planter", file: "30_multi_printed_tabletop_tt_planter.jpg" },
  { id: 31, name: "Cork Conical Flask Planter", file: "31_cork_conical_flask_planter.jpg" },
  { id: 32, name: "Wall Frame Test Tube Planter", file: "32_wall_frame_test_tube_planter.jpg" },
  { id: 33, name: "Diamond Square Planter", file: "33_diamond_square_planter.jpg" },
  { id: 34, name: "Chocochip Square Planter", file: "34_chocochip_square_planter.jpg" },
  { id: 35, name: "Cork Belly Coaster — Set", file: "35_cork_belly_coaster_set.jpg" },
  { id: 36, name: "Leaf Shape Coaster — Set", file: "36_leaf_shape_coaster_set.jpg" },
  { id: 37, name: "Box UV Printed Coaster — Set", file: "37_box_uv_printed_coaster_set.jpg" },
  { id: 38, name: "Cork Fine Natural Trivet — Set", file: "38_cork_fine_natural_trivet_set.jpg" },
  { id: 39, name: "Chocochip Trivet — Set", file: "39_chocochip_trivet_set.jpg" },
  { id: 40, name: "Red Assiago Trivet — Set", file: "40_red_assiago_trivet_set.jpg" },
  { id: 41, name: "Striped Trivet — Set", file: "41_striped_trivet_set.jpg" },
  { id: 42, name: "Web Printed Trivet", file: "42_web_printed_trivet.jpg" },
  { id: 43, name: "Smoky Black Small Round Tray", file: null },
  { id: 44, name: "Cork Tablemat Chocochip 18\"", file: "44_cork_tablemat_chocochip_18_inch.jpg" },
  { id: 45, name: "Cork Tablemat Red Assiago 18\"", file: "45_cork_tablemat_red_assiago_18_inch.jpg" },
  { id: 46, name: "Cork Tablemat Abstract 18\"", file: "46_cork_tablemat_abstract_18_inch.jpg" },
  { id: 47, name: "Cork Tablemat Oval Red Assiago", file: "47_cork_tablemat_oval_red_assiago.jpg" },
  { id: 48, name: "Chocochip Napkin Ring", file: null },
  { id: 49, name: "Round Napkin Ring", file: null },
  { id: 50, name: "Fine Grain Napkin Ring", file: null }
];

console.log("Checking image file availability in public/images/vinsho/products/Corporate-gifting/:");
const imgDir = path.join(process.cwd(), 'public', 'images', 'vinsho', 'products', 'Corporate-gifting');

let availableCount = 0;
let missingCount = 0;

targetList.forEach(item => {
  if (!item.file) {
    missingCount++;
    console.log(`[#${item.id}] ${item.name} -> MISSING IMAGE FILE`);
  } else {
    const exists = fs.existsSync(path.join(imgDir, item.file));
    if (exists) availableCount++; else missingCount++;
    console.log(`[#${item.id}] ${item.name} -> File: ${item.file} (${exists ? 'EXISTS' : 'NOT FOUND'})`);
  }
});

console.log(`\nImage Files Check Summary: Available=${availableCount}, Missing=${missingCount}`);

console.log("\n--- Checking database products under Corporate Gifting ---");
if (db) {
  const dbProds = db.prepare(`
    SELECT p.id, p.name, p.slug, p.sku, pi.url as current_img
    FROM products p
    LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
  `).all();
  console.log(`Total DB products: ${dbProds.length}`);
}
