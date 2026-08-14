export interface ShippingItem {
  variantId: number;
  productSlug: string;
  shippingClass: 'standard' | 'fragile' | 'bulky' | 'made-to-order';
  packedWeightKg: number | null;
  packedL: number | null;
  packedB: number | null;
  packedH: number | null;
  qty: number;
  price: number;
}

export interface ShippingCalculationResult {
  serviceable: boolean;
  totalBillableWeightKg: number;
  shippingFee: number;
  fragileSurcharge: number;
  isDelhiNcr: boolean;
  isFreeShipping: boolean;
  reason?: string;
}

const DELHI_NCR_PINCODES = [
  // Delhi, Gurgaon, Noida, Ghaziabad, Faridabad ranges
  { start: 110001, end: 110096 },
  { start: 122001, end: 122022 },
  { start: 201301, end: 201314 },
  { start: 201001, end: 201014 }
];

export function isDelhiNcrPincode(pincode: string): boolean {
  const pinNum = parseInt(pincode.trim(), 10);
  if (isNaN(pinNum)) return false;
  return DELHI_NCR_PINCODES.some(r => pinNum >= r.start && pinNum <= r.end);
}

/**
 * Calculates billable weight using volumetric formula:
 * (L x B x H) / 5000 vs actual packed weight, whichever is greater.
 */
export function calculateItemBillableWeight(item: ShippingItem): number {
  const actualKg = (item.packedWeightKg || 0.5) * item.qty;
  if (!item.packedL || !item.packedB || !item.packedH) {
    return actualKg;
  }
  const volumetricKg = ((item.packedL * item.packedB * item.packedH) / 5000) * item.qty;
  return Math.max(actualKg, volumetricKg);
}

/**
 * Calculates overall order shipping fee & serviceability.
 */
export function calculateShipping(items: ShippingItem[], pincode: string, subtotal: number): ShippingCalculationResult {
  const cleanPincode = (pincode || '').trim();
  if (cleanPincode.length !== 6 || !/^\d{6}$/.test(cleanPincode)) {
    return {
      serviceable: false,
      totalBillableWeightKg: 0,
      shippingFee: 0,
      fragileSurcharge: 0,
      isDelhiNcr: false,
      isFreeShipping: false,
      reason: 'Invalid 6-digit Indian pincode.'
    };
  }

  const isNcr = isDelhiNcrPincode(cleanPincode);
  let totalBillableWeightKg = 0;
  let hasFragile = false;
  let hasBulky = false;

  for (const item of items) {
    if (item.shippingClass === 'made-to-order') {
      return {
        serviceable: false,
        totalBillableWeightKg: 0,
        shippingFee: 0,
        fragileSurcharge: 0,
        isDelhiNcr: isNcr,
        isFreeShipping: false,
        reason: `Item '${item.productSlug}' is Made-to-Order and cannot be shipped via cart. Site measurement required.`
      };
    }

    if (item.shippingClass === 'bulky' && !isNcr) {
      return {
        serviceable: false,
        totalBillableWeightKg: 0,
        shippingFee: 0,
        fragileSurcharge: 0,
        isDelhiNcr: false,
        isFreeShipping: false,
        reason: `Bulky item '${item.productSlug}' is currently restricted to Delhi-NCR delivery pincodes.`
      };
    }

    if (item.shippingClass === 'fragile') hasFragile = true;
    if (item.shippingClass === 'bulky') hasBulky = true;

    totalBillableWeightKg += calculateItemBillableWeight(item);
  }

  // Rate rules
  const FREE_SHIPPING_THRESHOLD = 3000;
  let shippingFee = 0;
  let fragileSurcharge = 0;

  if (hasBulky) {
    shippingFee = 750 + Math.ceil(totalBillableWeightKg) * 50;
  } else if (hasFragile) {
    fragileSurcharge = 250; // Packaging surcharge & transit insurance
    shippingFee = 150 + fragileSurcharge + Math.ceil(totalBillableWeightKg) * 30;
  } else {
    if (subtotal >= FREE_SHIPPING_THRESHOLD) {
      return {
        serviceable: true,
        totalBillableWeightKg,
        shippingFee: 0,
        fragileSurcharge: 0,
        isDelhiNcr: isNcr,
        isFreeShipping: true
      };
    }
    shippingFee = 150 + Math.ceil(totalBillableWeightKg) * 20;
  }

  return {
    serviceable: true,
    totalBillableWeightKg,
    shippingFee,
    fragileSurcharge,
    isDelhiNcr: isNcr,
    isFreeShipping: false
  };
}
