import fs from 'fs';
import path from 'path';

const content = JSON.parse(fs.readFileSync('vinsho-content.json', 'utf8'));
const taxonomy = JSON.parse(fs.readFileSync('vinsho-taxonomy.json', 'utf8'));

const fragileSlugs = new Set([
  "photo-frames", "candles", "decorative-candles", "flower-vases", "flowers-bouquet",
  "buddha", "jaguar", "laughing-buddha", "metal-tree", "show-piece", "show-pieces",
  "mirror", "wall-painting", "wall-art", "wall-art-2", "wall-clock", "washroom-solution-or-soap-dispenser-set"
]);

const bulkySlugs = new Set([
  "bonsai-jade-plant", "mattresses", "carpets"
]);

const mtoSlugs = new Set([
  "customised-wall-paper", "blinds", "blinds-with-decor", "floral-panels"
]);

// Map subcategories from taxonomy
const subcatMap = {};
taxonomy.collections.forEach(col => {
  col.subcategories.forEach(sub => {
    sub.products.forEach(pSlug => {
      subcatMap[pSlug] = {
        colKey: col.key,
        colName: col.name,
        subKey: sub.key,
        subName: sub.name
      };
    });
  });
});

const products = content.products.map(p => {
  const tax = subcatMap[p.slug] || {};
  let shippingClass = "standard";
  let launchPhase = 1;
  let sellableOnline = true;
  let returnable = true;

  if (mtoSlugs.has(p.slug)) {
    shippingClass = "made-to-order";
    launchPhase = 0;
    sellableOnline = false;
    returnable = false;
  } else if (bulkySlugs.has(p.slug)) {
    shippingClass = "bulky";
    launchPhase = 3;
    sellableOnline = true;
    returnable = false;
  } else if (fragileSlugs.has(p.slug)) {
    shippingClass = "fragile";
    launchPhase = 2;
    sellableOnline = true;
    returnable = true;
  }

  return {
    slug: p.slug,
    name: p.name,
    collection: tax.colName || p.collection || "Home Décor",
    collectionKey: tax.colKey || p.collectionKey || "home-decor",
    subcategory: tax.subName || p.subcategory || "General",
    subcategoryKey: tax.subKey || p.subcategoryKey || "general",
    image: p.image,
    material: p.material || "",
    description: p.description || "",
    descriptionSource: p.descriptionSource || "placeholder",
    shippingClass,
    launchPhase,
    sellableOnline,
    returnable,
    sku: null,
    mrp: null,
    sellingPrice: null,
    currency: "INR",
    hsnCode: null,
    gstRate: null,
    netQuantity: null,
    packedWeightKg: null,
    packedDimensionsCm: {
      l: null,
      b: null,
      h: null
    },
    stock: null,
    variants: [],
    countryOfOrigin: "India",
    manufacturerOrPacker: null,
    consumerCareContact: null,
    leadTimeDays: null,
    careInstructions: null
  };
});

const seedData = {
  note: "Commerce seed for VINSHO. Every null field is UNKNOWN and must be supplied by the client. Do not invent values.",
  generated: "2026-08-09",
  launchPhases: {
    "0": "Not sellable online. Enquiry only.",
    "1": "Soft launch. Standard courier, lowest risk.",
    "2": "Add after fragile packaging and breakage handling are proven.",
    "3": "Add only if volumetric shipping economics work, or restrict to Delhi NCR."
  },
  shippingClassCounts: {
    standard: products.filter(p => p.shippingClass === "standard").length,
    fragile: products.filter(p => p.shippingClass === "fragile").length,
    bulky: products.filter(p => p.shippingClass === "bulky").length,
    "made-to-order": products.filter(p => p.shippingClass === "made-to-order").length
  },
  requiredBeforeAnySale: [
    "sku",
    "mrp",
    "sellingPrice",
    "hsnCode",
    "gstRate",
    "netQuantity",
    "packedWeightKg",
    "packedDimensionsCm",
    "stock",
    "manufacturerOrPacker",
    "consumerCareContact"
  ],
  products
};

fs.writeFileSync('vinsho-commerce-seed.json', JSON.stringify(seedData, null, 2), 'utf8');
console.log('Successfully generated vinsho-commerce-seed.json with ' + products.length + ' products.');
