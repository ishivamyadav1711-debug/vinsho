export function createWhatsAppOrderUrl(params: {
  productName: string;
  price: number;
  quantity?: number;
  variantTitle?: string;
}): string {
  const phone = '919625515351';
  const qty = params.quantity || 1;
  const rawName = params.productName;
  const productName = params.variantTitle && params.variantTitle !== 'Standard Variant' && params.variantTitle !== 'Default'
    ? `${rawName} (${params.variantTitle})`
    : rawName;

  const itemPriceFormatted = Math.round(params.price).toLocaleString('en-IN');
  const totalFormatted = Math.round(params.price * qty).toLocaleString('en-IN');

  const message = `Hey, I want to buy this item.

Product: ${productName}
Price: ₹${itemPriceFormatted}
Quantity: ${qty}
Total: ₹${totalFormatted}

Is this available?`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
