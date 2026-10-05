import { COMMERCE_MODE } from './commerce';
export { COMMERCE_MODE };

export interface PurchasableCheckItem {
  slug: string;
  name?: string;
  subcategoryKey?: string;
  subcategory?: string;
  collectionKey?: string;
  collection?: string;
  material?: string;
  isPurchasable?: boolean;
}

/**
 * Determines whether a VINSHO product is eligible for online sale & checkout.
 * Per business requirements:
 * Only explicitly approved items (Candles, Cork products, Gift Baskets) are purchasable online.
 * All other products fall back to "Price on Request" -> "Get Quote".
 */
export function isProductPurchasable(product: any): boolean {
  let colKey = '';
  if (typeof product.collectionKey === 'string') {
    colKey = product.collectionKey;
  } else if (typeof product.collection === 'string') {
    colKey = product.collection;
  } else if (product.collection && typeof product.collection === 'object') {
    colKey = product.collection.key || product.collection.name || '';
  }

  let subcat = '';
  if (typeof product.subcategoryKey === 'string') {
    subcat = product.subcategoryKey;
  } else if (typeof product.subcategory === 'string') {
    subcat = product.subcategory;
  } else if (product.subcategory && typeof product.subcategory === 'object') {
    subcat = product.subcategory.key || product.subcategory.name || '';
  }

  colKey = String(colKey || '').toLowerCase().trim();
  subcat = String(subcat || '').toLowerCase().trim();

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
