export interface LocalCartItem {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  variantId?: number;
  variantTitle?: string;
  collectionKey?: string;
  selected?: boolean;
  hamperData?: any;
}

export interface LocalCartState {
  items: LocalCartItem[];
  subtotal: number;
  totalMrp?: number;
  totalQuantity: number;
  couponCode?: string;
  discountTotal?: number;
  sessionToken: string;
}

const STORAGE_KEY = 'vinsho_shopify_cart_state_v1';

export function getOrCreateSessionToken(): string {
  if (typeof window === 'undefined') return 'server_session';
  try {
    let token = localStorage.getItem('vinsho_session_token');
    if (!token) {
      token = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      localStorage.setItem('vinsho_session_token', token);
    }
    return token;
  } catch {
    return 'guest_session_' + Date.now();
  }
}

export function getLocalCartState(): LocalCartState {
  if (typeof window === 'undefined') {
    return { items: [], subtotal: 0, totalQuantity: 0, sessionToken: 'server' };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.items)) {
        return recalculateCartState(parsed);
      }
    }
  } catch (e) {
    console.warn('Failed to parse cart state from localStorage:', e);
  }
  return { items: [], subtotal: 0, totalQuantity: 0, sessionToken: getOrCreateSessionToken() };
}

export function recalculateCartState(state: Partial<LocalCartState>): LocalCartState {
  const rawItems = state.items || [];
  let subtotal = 0;
  let totalQuantity = 0;

  const items = rawItems.map(item => {
    const slug = item.slug || 'product';
    const cleanName = (item.name && item.name !== slug)
      ? item.name
      : slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    const cleanImg = (item.image && item.image !== '/placeholder.png')
      ? item.image
      : `/images/candles/${slug}.jpg`;

    subtotal += (item.price || 0) * (item.quantity || 1);
    totalQuantity += (item.quantity || 1);

    return {
      ...item,
      name: cleanName,
      image: cleanImg
    };
  });

  const sessionToken = state.sessionToken || getOrCreateSessionToken();
  const couponCode = state.couponCode;
  const discountTotal = state.discountTotal || 0;

  return {
    items,
    subtotal,
    totalQuantity,
    couponCode,
    discountTotal,
    sessionToken
  };
}

export function saveLocalCartState(state: LocalCartState) {
  if (typeof window === 'undefined') return;
  try {
    const recalculated = recalculateCartState(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recalculated));
    updateHeaderCartBadges(recalculated.totalQuantity);
    window.dispatchEvent(new CustomEvent('vinsho:cart-updated', { detail: recalculated }));
    syncCartWithBackend(recalculated);
  } catch (e) {
    console.warn('Failed to save cart state:', e);
  }
}

export function updateHeaderCartBadges(count: number) {
  if (typeof document === 'undefined') return;
  const badges = document.querySelectorAll('#cartN, .badge');
  badges.forEach(b => {
    b.textContent = String(count);
  });
}

export function getCartCount(): number {
  return getLocalCartState().totalQuantity;
}

export function triggerToast(msg: string) {
  if (typeof document === 'undefined') return;
  const toast = document.getElementById('v-toast') || document.getElementById('toast');
  if (toast) {
    toast.textContent = msg;
    toast.classList.add('on');
    setTimeout(() => toast.classList.remove('on'), 2500);
  }
}

export function addLocalCartItem(item: Partial<LocalCartItem>) {
  const state = getLocalCartState();

  const id = item.id || (item.variantId ? `var_${item.variantId}` : `prod_${item.slug}`);
  const qtyToAdd = item.quantity || 1;

  const existingIdx = state.items.findIndex(i => i.id === id || (i.slug === item.slug && (!item.variantId || i.variantId === item.variantId)));

  if (existingIdx > -1) {
    state.items[existingIdx].quantity += qtyToAdd;
  } else {
    state.items.push({
      id,
      slug: item.slug || 'product',
      name: item.name || 'Handcrafted VINSHO Item',
      price: item.price || 499,
      image: item.image || '/placeholder.png',
      quantity: qtyToAdd,
      variantId: item.variantId,
      variantTitle: item.variantTitle || 'Standard Variant',
      collectionKey: item.collectionKey,
      selected: true,
      hamperData: item.hamperData
    });
  }

  saveLocalCartState(state);
  triggerToast(`Added "${item.name || 'Item'}" to your cart.`);
}

export function updateLocalCartItemQty(id: string, qty: number) {
  const state = getLocalCartState();
  if (qty <= 0) {
    state.items = state.items.filter(i => i.id !== id);
  } else {
    const target = state.items.find(i => i.id === id);
    if (target) target.quantity = qty;
  }
  saveLocalCartState(state);
}

export function removeLocalCartItem(id: string) {
  const state = getLocalCartState();
  state.items = state.items.filter(i => i.id !== id);
  saveLocalCartState(state);
}

export function clearCart() {
  const state = getLocalCartState();
  state.items = [];
  state.subtotal = 0;
  state.totalQuantity = 0;
  state.discountTotal = 0;
  saveLocalCartState(state);
}

export function openCartDrawer() {
  if (typeof window === 'undefined') return;
  window.location.href = '/cart';
}

export function applyCoupon(code: string, discountAmount: number) {
  const state = getLocalCartState();
  state.couponCode = code;
  state.discountTotal = discountAmount;
  saveLocalCartState(state);
}

export async function syncCartWithBackend(state: LocalCartState) {
  try {
    await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken: state.sessionToken,
        items: state.items
      })
    });
  } catch (e) {
    console.warn('Failed to sync cart with backend:', e);
  }
}

export function buildWhatsAppOrderUrl(
  items: LocalCartItem[],
  cartTotal: number
): string {
  const phone = '919625515351';
  let message = '';

  if (items.length === 1) {
    const item = items[0];
    const rawName = (item.name && item.name !== item.slug)
      ? item.name
      : (item.slug ? item.slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Item');
    const productName = (item.variantTitle && item.variantTitle !== 'Standard Variant' && item.variantTitle !== 'Default')
      ? `${rawName} (${item.variantTitle})`
      : rawName;

    const itemPriceFormatted = Math.round(item.price).toLocaleString('en-IN');
    const totalFormatted = Math.round(cartTotal).toLocaleString('en-IN');

    message = `Hey, I want to buy this item.

Product: ${productName}
Price: ₹${itemPriceFormatted}
Quantity: ${item.quantity}
Total: ₹${totalFormatted}

Is this available?`;
  } else {
    const productLines = items.map(item => {
      const rawName = (item.name && item.name !== item.slug)
        ? item.name
        : (item.slug ? item.slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Item');
      const productName = (item.variantTitle && item.variantTitle !== 'Standard Variant' && item.variantTitle !== 'Default')
        ? `${rawName} (${item.variantTitle})`
        : rawName;
      const itemPriceFormatted = Math.round(item.price).toLocaleString('en-IN');
      return `${productName} - ₹${itemPriceFormatted} x ${item.quantity}`;
    }).join('\n');

    const totalFormatted = Math.round(cartTotal).toLocaleString('en-IN');

    message = `Hey, I want to place an order.

${productLines}

Total: ₹${totalFormatted}

Is everything available?`;
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function initCartStore() {
  if (typeof window === 'undefined') return;
  const state = getLocalCartState();
  updateHeaderCartBadges(state.totalQuantity);
}
