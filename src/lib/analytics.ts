/**
 * GA4 & Meta Pixel E-Commerce Analytics Event Dispatcher for VINSHO.
 */

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export function trackViewItem(product: {
  slug: string;
  name: string;
  category?: string;
  price?: number | null;
}) {
  if (typeof window === 'undefined') return;

  const itemData = {
    item_id: product.slug,
    item_name: product.name,
    item_category: product.category || 'Home Décor',
    price: product.price || 0,
    currency: 'INR'
  };

  // GA4 Event
  if (window.gtag) {
    window.gtag('event', 'view_item', {
      currency: 'INR',
      value: product.price || 0,
      items: [itemData]
    });
  }

  // Meta Pixel Event
  if (window.fbq) {
    window.fbq('track', 'ViewContent', {
      content_ids: [product.slug],
      content_name: product.name,
      content_category: product.category || 'Home Décor',
      value: product.price || 0,
      currency: 'INR'
    });
  }
}

export function trackAddToCart(product: {
  slug: string;
  name: string;
  category?: string;
  price?: number | null;
  quantity: number;
}) {
  if (typeof window === 'undefined') return;

  const itemData = {
    item_id: product.slug,
    item_name: product.name,
    item_category: product.category || 'Home Décor',
    price: product.price || 0,
    quantity: product.quantity,
    currency: 'INR'
  };

  const totalValue = (product.price || 0) * product.quantity;

  // GA4 Event
  if (window.gtag) {
    window.gtag('event', 'add_to_cart', {
      currency: 'INR',
      value: totalValue,
      items: [itemData]
    });
  }

  // Meta Pixel Event
  if (window.fbq) {
    window.fbq('track', 'AddToCart', {
      content_ids: [product.slug],
      content_name: product.name,
      value: totalValue,
      currency: 'INR'
    });
  }
}

export function trackBeginCheckout(items: Array<{
  slug: string;
  name: string;
  price: number;
  quantity: number;
}>) {
  if (typeof window === 'undefined') return;

  const totalValue = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // GA4 Event
  if (window.gtag) {
    window.gtag('event', 'begin_checkout', {
      currency: 'INR',
      value: totalValue,
      items: items.map((i) => ({
        item_id: i.slug,
        item_name: i.name,
        price: i.price,
        quantity: i.quantity,
        currency: 'INR'
      }))
    });
  }

  // Meta Pixel Event
  if (window.fbq) {
    window.fbq('track', 'InitiateCheckout', {
      content_ids: items.map((i) => i.slug),
      value: totalValue,
      currency: 'INR',
      num_items: items.reduce((cnt, i) => cnt + i.quantity, 0)
    });
  }
}
