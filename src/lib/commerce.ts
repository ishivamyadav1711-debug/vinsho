import seedData from '../../vinsho-commerce-seed.json';
import taxonomyData from '../../vinsho-taxonomy.json';
import contentData from '../../vinsho-content.json';

export type CommerceMode = 'enquiry' | 'live';

// Global COMMERCE_MODE setting. Defaults to 'enquiry'.
export const COMMERCE_MODE: CommerceMode = (import.meta.env.COMMERCE_MODE as CommerceMode) || 'enquiry';

export interface PackedDimensions {
  l: number | null;
  b: number | null;
  h: number | null;
}

export interface Variant {
  sku: string;
  size?: string;
  colour?: string;
  mrp: number | null;
  sellingPrice: number | null;
  stock: number | null;
  packedWeightKg: number | null;
  packedDimensionsCm: PackedDimensions;
  hsnCode: string | null;
  gstRate: number | null;
  image?: string;
}

export interface ProductCommerce {
  slug: string;
  name: string;
  collection: string;
  collectionKey: string;
  subcategory: string;
  subcategoryKey: string;
  image: string;
  material: string;
  description: string;
  descriptionSource: string;
  shippingClass: 'standard' | 'fragile' | 'bulky' | 'made-to-order';
  launchPhase: number;
  sellableOnline: boolean;
  returnable: boolean;
  sku: string | null;
  mrp: number | null;
  sellingPrice: number | null;
  currency: string;
  hsnCode: string | null;
  gstRate: number | null;
  netQuantity: string | null;
  packedWeightKg: number | null;
  packedDimensionsCm: PackedDimensions;
  stock: number | null;
  variants: Variant[];
  countryOfOrigin: string;
  manufacturerOrPacker: string | null;
  consumerCareContact: string | null;
  leadTimeDays: number | null;
  careInstructions: string | null;
}

export interface PurchasabilityEvaluation {
  purchasable: boolean;
  reason: string;
  missingFields: string[];
  billableWeightKg: number;
  mode: CommerceMode;
}

/**
 * Calculates billable weight using volumetric weight formula:
 * (L x B x H) / 5000 vs actual packed weight in kg, whichever is greater.
 */
export function calculateBillableWeight(weightKg: number | null, dims: PackedDimensions): number {
  const actualKg = weightKg || 0;
  if (!dims || !dims.l || !dims.b || !dims.h) return actualKg;
  const volumetricKg = (dims.l * dims.b * dims.h) / 5000;
  return Math.max(actualKg, volumetricKg);
}

/**
 * Evaluates whether a product can be sold online.
 * Enforces §2 Data-Completeness Gate:
 * A product is sellable ONLY IF:
 * 1. COMMERCE_MODE === 'live'
 * 2. sellableOnline === true
 * 3. launchPhase is enabled (> 0)
 * 4. NOT made-to-order
 * 5. ALL required fields in requiredBeforeAnySale are non-null.
 */
export function evaluateProductPurchasability(product: ProductCommerce): PurchasabilityEvaluation {
  const missingFields: string[] = [];
  const requiredFields = seedData.requiredBeforeAnySale;

  const billableWeightKg = calculateBillableWeight(
    product.packedWeightKg,
    product.packedDimensionsCm
  );

  if (COMMERCE_MODE !== 'live') {
    return {
      purchasable: false,
      reason: 'Site is operating in Enquiry Mode.',
      missingFields: [],
      billableWeightKg,
      mode: COMMERCE_MODE
    };
  }

  // Made to order products are permanently enquiry only
  if (product.shippingClass === 'made-to-order' || product.launchPhase === 0) {
    return {
      purchasable: false,
      reason: 'Made-to-order products require site measurement and custom quotation.',
      missingFields: [],
      billableWeightKg,
      mode: COMMERCE_MODE
    };
  }

  if (!product.sellableOnline) {
    return {
      purchasable: false,
      reason: 'Product is disabled for online sales.',
      missingFields: [],
      billableWeightKg,
      mode: COMMERCE_MODE
    };
  }

  // Check required data fields
  requiredFields.forEach((field) => {
    if (field === 'packedDimensionsCm') {
      const dims = product.packedDimensionsCm;
      if (!dims || dims.l === null || dims.b === null || dims.h === null) {
        missingFields.push('packedDimensionsCm (l, b, h)');
      }
    } else {
      const val = (product as any)[field];
      if (val === null || val === undefined || val === '') {
        missingFields.push(field);
      }
    }
  });

  const purchasable = missingFields.length === 0;
  const reason = purchasable
    ? 'Product is eligible for online sale.'
    : `Missing mandatory commerce fields: ${missingFields.join(', ')}`;

  return {
    purchasable,
    reason,
    missingFields,
    billableWeightKg,
    mode: COMMERCE_MODE
  };
}

export function getAllCommerceProducts(): ProductCommerce[] {
  return seedData.products as ProductCommerce[];
}

export function getCommerceProductBySlug(slug: string): ProductCommerce | undefined {
  return (seedData.products as ProductCommerce[]).find((p) => p.slug === slug);
}
