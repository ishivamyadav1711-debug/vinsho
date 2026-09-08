export interface CouponValidationResult {
  valid: boolean;
  code?: string;
  discountAmount: number;
  message?: string;
  error?: string;
}

/**
 * Validates promo codes and calculates server-authoritative discount.
 * Supported codes:
 * - WELCOME10: 10% percentage discount on subtotal
 * - VINSHO100: ₹100 flat discount
 * - LUXURY200: ₹200 flat discount (minimum order subtotal ₹1,000 required)
 */
export function validateAndCalculateCoupon(
  code: string | undefined | null,
  subtotal: number
): CouponValidationResult {
  if (!code || typeof code !== 'string' || !code.trim()) {
    return { valid: false, discountAmount: 0, error: 'No coupon code provided.' };
  }

  const cleanCode = code.trim().toUpperCase();
  const safeSubtotal = Math.max(0, Number(subtotal) || 0);

  if (cleanCode === 'WELCOME10') {
    const calculatedDiscount = Math.round(safeSubtotal * 0.10);
    const safeDiscount = Math.min(calculatedDiscount, safeSubtotal);
    return {
      valid: true,
      code: 'WELCOME10',
      discountAmount: Math.max(0, safeDiscount),
      message: '10% Welcome Discount applied!'
    };
  }

  if (cleanCode === 'VINSHO100') {
    const safeDiscount = Math.min(100, safeSubtotal);
    return {
      valid: true,
      code: 'VINSHO100',
      discountAmount: Math.max(0, safeDiscount),
      message: '₹100 Flat Discount applied!'
    };
  }

  if (cleanCode === 'LUXURY200') {
    if (safeSubtotal < 1000) {
      return {
        valid: false,
        discountAmount: 0,
        error: 'LUXURY200 requires a minimum order subtotal of ₹1,000.'
      };
    }
    const safeDiscount = Math.min(200, safeSubtotal);
    return {
      valid: true,
      code: 'LUXURY200',
      discountAmount: Math.max(0, safeDiscount),
      message: '₹200 Luxury Order Discount applied!'
    };
  }

  return {
    valid: false,
    discountAmount: 0,
    error: 'Invalid or expired coupon code.'
  };
}
