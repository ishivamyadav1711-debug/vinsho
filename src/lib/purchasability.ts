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
  if (typeof product.isPurchasable === 'boolean') {
    return product.isPurchasable;
  }

  const slug = (product.slug || '').toLowerCase();
  const name = (product.name || '').toLowerCase();
  const subcat = (product.subcategoryKey || product.subcategory || '').toLowerCase();
  const material = (product.material || '').toLowerCase();

  // 1. Candles (Home Decor -> Candles)
  if (subcat.includes('candle') || slug.includes('candle') || name.includes('candle')) {
    return true;
  }

  // 2. Cork Products
  if (slug.includes('cork') || name.includes('cork') || material.includes('cork')) {
    return true;
  }

  // 3. Gift Baskets
  if (slug.includes('basket') || name.includes('basket')) {
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
