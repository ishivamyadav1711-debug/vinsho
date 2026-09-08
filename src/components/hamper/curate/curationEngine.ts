import type { GiftProduct, ProductVariant } from '../types';

export interface CurationPreferences {
  occasion: string;
  recipient: string;
  budgetRange: string; // 'under1000' | '1000-2000' | '2000-5000' | '5000plus' | 'any'
  styles: string[];
}

export interface CuratedProductSelection {
  product: GiftProduct;
  variant: ProductVariant;
  whyReason: string;
}

export interface CuratedHamperResult {
  items: CuratedProductSelection[];
  productsSubtotal: number;
  packagingCost: number;
  total: number;
  editorialExplanation: string;
  budgetExceededWarning?: string;
}

// Category keyword mappings for deterministic scoring
const OCCASION_KEYWORDS: Record<string, string[]> = {
  Birthday: ['candle', 'frame', 'planner', 'vase', 'showpiece', 'diary', 'towel', 'plant'],
  Wedding: ['vases', 'showpiece', 'fountain', 'buddha', 'decor', 'gold', 'curtains', 'chest'],
  Anniversary: ['candles', 'frame', 'clock', 'showpiece', 'flowers', 'vase', 'mirror'],
  Housewarming: ['planter', 'mat', 'curtains', 'cushion', 'clock', 'wall art', 'tray', 'coaster'],
  Festival: ['brass', 'fountain', 'buddha', 'candle', 'turtle', 'decor', 'panel', 'gold'],
  Corporate: ['planner', 'diary', 'pen', 'coaster', 'laptop', 'organizer', 'desk', 'cork'],
  'Just Because': ['candle', 'plant', 'trivet', 'placemat', 'coaster', 'towel', 'cushion']
};

const STYLE_KEYWORDS: Record<string, string[]> = {
  Elegant: ['glass', 'crystal', 'brass', 'marble', 'velvet', 'vase', 'mirror'],
  Minimal: ['cork', 'plain', 'wood', 'matte', 'grey', 'black', 'white', 'simple'],
  'Warm & Cozy': ['candle', 'blanket', 'cushion', 'throw', 'towel', 'warm', 'jute'],
  Festive: ['gold', 'led', 'fountain', 'brass', 'bright', 'decorative', 'buddha'],
  Traditional: ['buddha', 'turtle', 'floral', 'panel', 'fountain', 'brass', 'jute'],
  Modern: ['metal', 'clock', 'planter', 'abstract', 'wall art', 'blinds'],
  Thoughtful: ['diary', 'pen', 'frame', 'plant', 'organizer', 'craft']
};

const REASON_TEMPLATES: Record<string, string[]> = {
  candle: [
    'Adds warmth, soothing fragrance, and cozy ambiance to the hamper.',
    'Creates a relaxing atmosphere suitable for personal celebrations.'
  ],
  frame: [
    'A timeless keepsake to preserve cherished memories and moments.',
    'Adds a warm personal touch to any home space.'
  ],
  vase: [
    'Brings sculptural elegance and organic floral beauty to the collection.',
    'A versatile accent piece that elevates living room tabletop decor.'
  ],
  planter: [
    'Introduces fresh greenery and eco-friendly texture to the space.',
    'A charming desk companion crafted with sustainable materials.'
  ],
  coaster: [
    'Combines functional surface protection with refined design detail.',
    'Crafted from sustainable cork to protect surfaces in style.'
  ],
  diary: [
    'An executive essential designed for daily thoughts, planning, and notes.',
    'Pairing fine craftsmanship with practical daily utility.'
  ],
  clock: [
    'A striking focal piece blending timekeeping with artistic wall decor.',
    'Enhances interior aesthetics with quiet sophistication.'
  ],
  showpiece: [
    'An artisanal conversation piece that adds character to any shelf or mantel.',
    'Hand-inspected sculpture reflecting understated craftsmanship.'
  ]
};

export function curateHamper(
  allProducts: GiftProduct[],
  prefs: CurationPreferences,
  seedOffset: number = 0
): CuratedHamperResult {
  // 1. Filter out non-eligible, deleted, or out-of-stock products
  const eligibleProducts = allProducts.filter(p => {
    if (!p.isPurchasable && p.isPurchasable !== undefined) return false;
    const variants = p.variants && p.variants.length > 0 ? p.variants : [];
    const hasStock = variants.some(v => v.stock === null || v.stock === undefined || v.stock > 0);
    return hasStock;
  });

  if (eligibleProducts.length === 0) {
    return {
      items: [],
      productsSubtotal: 0,
      packagingCost: 350,
      total: 350,
      editorialExplanation: 'No eligible products found.'
    };
  }

  // 2. Target Budget Range Calculation
  let targetMin = 1000;
  let targetMax = 5000;

  if (prefs.budgetRange === 'under1000') {
    targetMin = 500;
    targetMax = 1200;
  } else if (prefs.budgetRange === '1000-2000') {
    targetMin = 1000;
    targetMax = 2200;
  } else if (prefs.budgetRange === '2000-5000') {
    targetMin = 2000;
    targetMax = 5200;
  } else if (prefs.budgetRange === '5000plus') {
    targetMin = 4800;
    targetMax = 12000;
  }

  // 3. Score Products Deterministically
  const scoredProducts = eligibleProducts.map((product, idx) => {
    let score = 50; // Base score
    const text = `${product.name} ${product.description || ''} ${product.subcategory || ''} ${product.collection || ''}`.toLowerCase();

    // Occasion Relevance
    const occKeywords = OCCASION_KEYWORDS[prefs.occasion] || [];
    occKeywords.forEach(kw => {
      if (text.includes(kw)) score += 25;
    });

    // Style Relevance
    prefs.styles.forEach(style => {
      const styleKws = STYLE_KEYWORDS[style] || [];
      styleKws.forEach(kw => {
        if (text.includes(kw)) score += 20;
      });
    });

    // Apply seed offset for "CURATE AGAIN" variability
    const pseudoRandom = ((idx * 17 + seedOffset * 31) % 23) - 11;
    score += pseudoRandom;

    const variant = (product.variants && product.variants.length > 0)
      ? product.variants.find(v => v.stock === null || v.stock === undefined || v.stock > 0) || product.variants[0]
      : {
          id: 0,
          productId: product.id,
          sku: `SKU-${product.slug}`,
          sellingPrice: product.price,
          mrp: null,
          stock: 100,
          label: 'Standard Option'
        };

    return {
      product,
      variant,
      score,
      price: variant.sellingPrice,
      subcategory: product.subcategory || 'decor'
    };
  });

  // Sort descending by score
  scoredProducts.sort((a, b) => b.score - a.score);

  // 4. Multi-Collection Diversity & Combination Selection
  const selectedList: CuratedProductSelection[] = [];
  const selectedSubcategories = new Set<string>();
  const selectedCollections = new Set<string>();
  let currentSubtotal = 0;

  for (const item of scoredProducts) {
    if (selectedList.length >= 4) break;

    // Prefer mixing products from different top-level collections (Home Decor, Home Furnishing, Gifting)
    const colKey = item.product.collectionKey || item.product.collection || 'decor';
    if (selectedCollections.has(colKey) && selectedCollections.size < 3 && selectedList.length < 3) {
      continue;
    }

    // Enforce Category Diversity: Max 1 product per subcategory if possible
    if (selectedSubcategories.has(item.subcategory) && selectedList.length < 3) {
      continue;
    }

    // Budget constraint check
    if (prefs.budgetRange !== 'any' && currentSubtotal + item.price > targetMax && selectedList.length >= 2) {
      continue;
    }

    // Determine "Why" reason
    const text = `${item.product.name} ${item.product.description || ''}`.toLowerCase();
    let reasonKey = 'showpiece';
    if (text.includes('candle')) reasonKey = 'candle';
    else if (text.includes('frame')) reasonKey = 'frame';
    else if (text.includes('vase')) reasonKey = 'vase';
    else if (text.includes('planter')) reasonKey = 'planter';
    else if (text.includes('coaster') || text.includes('trivet')) reasonKey = 'coaster';
    else if (text.includes('diary') || text.includes('planner')) reasonKey = 'diary';
    else if (text.includes('clock')) reasonKey = 'clock';

    const templates = REASON_TEMPLATES[reasonKey] || REASON_TEMPLATES['showpiece'];
    const whyReason = templates[seedOffset % templates.length];

    selectedList.push({
      product: item.product,
      variant: item.variant,
      whyReason
    });

    selectedSubcategories.add(item.subcategory);
    selectedCollections.add(colKey);
    currentSubtotal += item.price;
  }

  // Fallback if list has < 2 items
  if (selectedList.length < 2) {
    for (const item of scoredProducts) {
      if (selectedList.some(s => s.product.slug === item.product.slug)) continue;
      selectedList.push({
        product: item.product,
        variant: item.variant,
        whyReason: 'Complements the hamper with elegant decorative utility.'
      });
      currentSubtotal += item.price;
      if (selectedList.length >= 3) break;
    }
  }

  const packagingCost = 350; // Default Signature Cork Box
  const grandTotal = currentSubtotal + packagingCost;

  // Check if budget range was exceeded
  let budgetExceededWarning: string | undefined;
  if (prefs.budgetRange !== 'any' && grandTotal > targetMax) {
    budgetExceededWarning = "We couldn't find a complete combination within this budget, so we've selected the closest suitable options.";
  }

  const editorialExplanation = generateEditorialExplanation(prefs, selectedList);

  return {
    items: selectedList,
    productsSubtotal: currentSubtotal,
    packagingCost,
    total: grandTotal,
    editorialExplanation,
    budgetExceededWarning
  };
}

function generateEditorialExplanation(prefs: CurationPreferences, items: CuratedProductSelection[]): string {
  const itemNames = items.map(i => i.product.name).join(', ');
  const occasion = prefs.occasion && prefs.occasion !== 'Skip' ? prefs.occasion : 'special moment';
  return `We curated this arrangement to balance texture, functionality, and visual charm for your ${occasion}. Each piece is handcrafted from premium materials and works harmoniously together.`;
}

export function getReplacementOptions(
  allProducts: GiftProduct[],
  targetProductSlug: string,
  prefs: CurationPreferences
): { product: GiftProduct; variant: ProductVariant }[] {
  return allProducts
    .filter(p => p.slug !== targetProductSlug && p.isPurchasable !== false)
    .slice(0, 3)
    .map(product => {
      const variant = (product.variants && product.variants.length > 0)
        ? product.variants[0]
        : {
            id: 0,
            productId: product.id,
            sku: `SKU-${product.slug}`,
            sellingPrice: product.price,
            mrp: null,
            stock: 100,
            label: 'Standard Option'
          };
      return { product, variant };
    });
}
