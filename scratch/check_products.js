import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'vinsho.db');
const db = new Database(dbPath);

const sheetItems = [
  { sr: 1, name: "Cork diary As fab India Combo 30", rate: 750, qty: 1, group: "Combo 30" },
  { sr: 2, name: "Cork metal Pen combo 30", rate: 135, qty: 1, group: "Combo 30" },
  { sr: 3, name: "Ecodesk Diary as combo 10", rate: 405, qty: 1, group: "Combo 10" },
  { sr: 4, name: "Card Stacker combo 10", rate: 400, qty: 1, group: "Combo 10" },
  { sr: 5, name: "Key chain combo 10", rate: 195, qty: 1, group: "Combo 10" },
  { sr: 6, name: "Cork metal pen combo 10", rate: 135, qty: 1, group: "Combo 10" },
  { sr: 7, name: "Cork Canvas sleeve combo 10", rate: 550, qty: 1, group: "Combo 10" },
  { sr: 8, name: "Ocean mist bag combo 18", rate: 4900, qty: 1, group: "Combo 18" },
  { sr: 9, name: "Passport holder ocean mist C-18", rate: 1350, qty: 1, group: "Combo 18" },
  { sr: 10, name: "Cork bottle ocean-Mist combo-18", rate: 1540, qty: 1, group: "Combo 18" },
  { sr: 11, name: "Jet case brown bag combo-19", rate: 4900, qty: 1, group: "Combo 19" },
  { sr: 12, name: "Cork bottle Granco combo-19", rate: 1500, qty: 1, group: "Combo 19" },
  { sr: 13, name: "Passport Holder Granco Combo-19", rate: 1200, qty: 1, group: "Combo 19" },
  { sr: 14, name: "Ecodesk diary as Combo-36", rate: 405, qty: 1, group: "Combo 36" },
  { sr: 15, name: "Small Calculator combo-36", rate: 750, qty: 1, group: "Combo 36" },
  { sr: 16, name: "Pen holder Combo 36", rate: 495, qty: 1, group: "Combo 36" },
  { sr: 17, name: "Mouse Pad Super fine Grain C-36", rate: 350, qty: 1, group: "Combo 36" },
  { sr: 18, name: "Cork metal Pen combo 36", rate: 135, qty: 1, group: "Combo 36" },
  { sr: 19, name: "Natural Tray 9x9 inch combo 46", rate: 1800, qty: 1, group: "Combo 46" },
  { sr: 20, name: "Box UV printed Coaster combo 46", rate: 600, qty: "4 set", group: "Combo 46" },
  { sr: 21, name: "Box print Table Top Testtube planter C-46", rate: 900, qty: 1, group: "Combo 46" },
  { sr: 22, name: "Cork tea light Holder assorted C-46", rate: 300, qty: "2", group: "Combo 46" },
  { sr: 23, name: "Round Linea Planter", rate: 1250, qty: 1 },
  { sr: 24, name: "Chocochip square planter", rate: 1250, qty: 1 },
  { sr: 25, name: "Natural Bark planter", rate: 800, qty: 1 },
  { sr: 26, name: "Cork belly planter", rate: 750, qty: 1 },
  { sr: 27, name: "Rectangular Test Tube Planter", rate: 1050, qty: 1 },
  { sr: 28, name: "Box print Table Top T.T. Planter", rate: 1250, qty: 1 },
  { sr: 29, name: "Feather printed Tabletop TT Planter", rate: 1250, qty: 1 },
  { sr: 30, name: "Multi printed Tabletop TT Planter", rate: 1250, qty: 1 },
  { sr: 31, name: "Cork Conical Flask Planter", rate: 800, qty: 1 },
  { sr: 32, name: "Wall frame Test tube Planter", rate: 2300, qty: 1 },
  { sr: 33, name: "Diamond Square Planter", rate: 1250, qty: 1 },
  { sr: 34, name: "Chocochip Square Planter", rate: 1250, qty: 1 },
  { sr: 35, name: "Cork Belly coaster", rate: 720, qty: "Set-4" },
  { sr: 36, name: "Leaf Shape coaster", rate: 575, qty: "Set-4" },
  { sr: 37, name: "Box UV printed coaster", rate: 650, qty: "Set 4" },
  { sr: 38, name: "Cork fine natural Trivet", rate: 1260, qty: "Set 2" },
  { sr: 39, name: "Chocochip Trivet", rate: 1260, qty: "Set 2" },
  { sr: 40, name: "Red assiago Trivet", rate: 1260, qty: "Set 2" },
  { sr: 41, name: "Striped Trivet", rate: 1260, qty: "Set 2" },
  { sr: 42, name: "Web printed Trivet", rate: 945, qty: 1 },
  { sr: 43, name: "Smoky black Small Round Tray 9\"", rate: 1550, qty: 1 },
  { sr: 44, name: "Cork Tablemat chocochip 9\"", rate: 1015, qty: 2 },
  { sr: 45, name: "Cork Tablemat Red Assiago", rate: 1015, qty: 2 },
  { sr: 46, name: "Cork Tablemat Abstract", rate: 1015, qty: 2 },
  { sr: 47, name: "Cork Tablemat oval Red Assiago", rate: 1015, qty: 2 },
  { sr: 48, name: "Chocochip Napkin Ring", rate: 360, qty: 2 },
  { sr: 49, name: "Round Napkin Ring", rate: 360, qty: 2 },
  { sr: 50, name: "Fine Grain Napkin ring", rate: 360, qty: 2 }
];

const allProducts = db.prepare(`
  SELECT p.id, p.name, p.slug, v.selling_price, v.mrp, v.sku
  FROM products p
  LEFT JOIN product_variants v ON v.product_id = p.id
  WHERE p.deleted_at IS NULL
`).all();

const results = sheetItems.map(item => {
  const match = allProducts.find(p => {
    const pName = p.name.toLowerCase();
    const sName = item.name.toLowerCase();

    if (item.sr === 1) return pName.includes('fab india');
    if (item.sr === 2) return pName.includes('cork metal pen') && pName.includes('combo 30');
    if (item.sr === 3) return pName.includes('ecodesk diary') && pName.includes('combo 10');
    if (item.sr === 4) return pName.includes('card stacker');
    if (item.sr === 5) return pName.includes('key chain');
    if (item.sr === 6) return pName.includes('cork metal pen') && pName.includes('combo 10');
    if (item.sr === 7) return pName.includes('cork canvas sleeve');
    if (item.sr === 8) return pName.includes('ocean mist bag');
    if (item.sr === 9) return pName.includes('passport holder') && pName.includes('ocean mist');
    if (item.sr === 10) return pName.includes('cork bottle') && pName.includes('ocean mist');
    if (item.sr === 11) return pName.includes('jet case');
    if (item.sr === 12) return pName.includes('cork bottle') && pName.includes('granco');
    if (item.sr === 13) return pName.includes('passport holder') && pName.includes('granco');
    if (item.sr === 14) return pName.includes('ecodesk diary') && pName.includes('combo 36');
    if (item.sr === 15) return pName.includes('small calculator');
    if (item.sr === 16) return pName.includes('pen holder') && pName.includes('combo 36');
    if (item.sr === 17) return pName.includes('mouse pad super fine grain');
    if (item.sr === 18) return pName.includes('cork metal pen') && pName.includes('combo 36');
    if (item.sr === 19) return pName.includes('natural tray 9×9');
    if (item.sr === 20) return pName.includes('box uv printed coaster') && pName.includes('combo 46');
    if (item.sr === 21) return pName.includes('test tube holder') && pName.includes('combo 46');
    if (item.sr === 22) return pName.includes('tea light holder assorted');
    if (item.sr === 23) return pName.includes('round linear planter');
    if (item.sr === 24) return p.id === 3887; // Chocochip Square Planter
    if (item.sr === 25) return pName.includes('natural bark planter');
    if (item.sr === 26) return pName.includes('cork belly planter');
    if (item.sr === 27) return pName.includes('rectangular test tube planter');
    if (item.sr === 28) return pName.includes('box print table top tt planter');
    if (item.sr === 29) return pName.includes('feather printed tabletop tt planter');
    if (item.sr === 30) return pName.includes('multi printed tabletop tt planter');
    if (item.sr === 31) return pName.includes('cork conical flask planter');
    if (item.sr === 32) return pName.includes('wall frame test tube planter');
    if (item.sr === 33) return pName.includes('diamond square planter');
    if (item.sr === 34) return p.id === 3897; // Chocochip Square Planter
    if (item.sr === 35) return pName.includes('cork belly coaster');
    if (item.sr === 36) return pName.includes('leaf shape coaster');
    if (item.sr === 37) return pName.includes('box uv printed coaster — set');
    if (item.sr === 38) return pName.includes('cork fine natural trivet');
    if (item.sr === 39) return pName.includes('chocochip trivet');
    if (item.sr === 40) return pName.includes('red assiago trivet');
    if (item.sr === 41) return pName.includes('striped trivet');
    if (item.sr === 42) return pName.includes('web printed trivet');
    if (item.sr === 43) return pName.includes('smoky black small round tray');
    if (item.sr === 44) return pName.includes('cork tablemat chocochip');
    if (item.sr === 45) return pName.includes('cork tablemat red assiago');
    if (item.sr === 46) return pName.includes('cork tablemat abstract');
    if (item.sr === 47) return pName.includes('cork tablemat oval red assiago');
    if (item.sr === 48) return pName.includes('chocochip napkin ring');
    if (item.sr === 49) return pName.includes('round napkin ring');
    if (item.sr === 50) return pName.includes('fine grain napkin ring');

    return false;
  });

  return {
    sr: item.sr,
    listName: item.name,
    present: !!match,
    matchedDbName: match ? match.name : 'NOT FOUND',
    dbPrice: match ? match.selling_price : null,
    listRate: item.rate,
    priceMatch: match ? match.selling_price === item.rate : false
  };
});

console.log(JSON.stringify(results, null, 2));

const allPresent = results.every(r => r.present);
console.log(`\nALL 50 PRESENT? ${allPresent ? 'YES! 50/50' : 'NO'}`);
