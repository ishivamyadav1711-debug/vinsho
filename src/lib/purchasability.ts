import { COMMERCE_MODE } from './commerce';
export { COMMERCE_MODE };

export interface PurchasableCheckItem {
  slug: string;
  name?: string;
  subcategoryKey?: string;
  subcategory?: string;
  collectionKey?: string;
  material?: string;
  isPurchasable?: boolean;
}

/**
 * Determines whether a VINSHO product is eligible for online sale & checkout.
 * Per business requirements:
 * Only explicitly approved items (Candles, Cork products, Gift Baskets) are purchasable online.
 * All other products fall back to "Price on Request" -> "Get Quote".
 */
export function isProductPurchasable(product: PurchasableCheckItem): boolean {
  const colKey = (product.collectionKey || product.collection || '').toLowerCase().trim();
  const subcat = (product.subcategoryKey || product.subcategory || '').toLowerCase().trim();

  // DYNAMIC SINGLE SOURCE OF TRUTH:
  // IF product belongs to "Gifting Collection" -> AVAILABLE ONLINE (true)
  // ELSE -> AVAILABLE AT STORE ONLY (false)
  if (
    colKey.includes('gifting') || 
    colKey.includes('gift') ||
    subcat.includes('gifting')
  ) {
    return true;
  }

  return false;
}

/**
 * Admin Data-Completeness Audit Evaluator.
 */
export function evaluatePurchasability(product: any, variants: any[] = []) {
  const missingProductFields: string[] = [];
  const missingVariantFields: string[] = [];

  const requiredProdFields = [
    'manufacturer_or_packer',
    'consumer_care_contact',
    'country_of_origin'
  ];

  requiredProdFields.forEach(f => {
    if (!product[f]) missingProductFields.push(f);
  });

  if (!variants || variants.length === 0) {
    missingVariantFields.push('at least 1 variant row');
  } else {
    variants.forEach((v, idx) => {
      if (!v.sku) missingVariantFields.push(`variant[${idx}].sku`);
      if (!v.selling_price) missingVariantFields.push(`variant[${idx}].selling_price`);
      if (!v.mrp) missingVariantFields.push(`variant[${idx}].mrp`);
    });
  }

  const isPurchasable = isProductPurchasable(product) && missingProductFields.length === 0 && missingVariantFields.length === 0;

  return {
    isPurchasable,
    missingProductFields,
    missingVariantFields
  };
}
