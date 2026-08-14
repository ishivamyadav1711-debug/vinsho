export interface LocalCartItem {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  variantTitle?: string;
  variantId?: string;
}

export interface LocalCartState {
  cartId: string | null;
  checkoutUrl: string | null;
  totalQuantity: number;
  subtotal: number;
  items: LocalCartItem[];
}

const STORAGE_KEY = 'vinsho_shopify_cart_state_v1';

export function getLocalCartState(): LocalCartState {
  if (typeof window === 'undefined') {
    return { cartId: null, checkoutUrl: null, totalQuantity: 0, subtotal: 0, items: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to parse local cart state:', err);
  }
  return { cartId: null, checkoutUrl: null, totalQuantity: 0, subtotal: 0, items: [] };
}

export function saveLocalCartState(state: LocalCartState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('vinsho:cart-updated', { detail: state }));
  } catch (err) {
    console.warn('Failed to save local cart state:', err);
  }
}

export function addLocalCartItem(item: Omit<LocalCartItem, 'id'> & { id?: string }): LocalCartState {
  const current = getLocalCartState();
  const itemId = item.id || item.slug || `item_${Date.now()}`;
  
  const existingIdx = current.items.findIndex(i => i.id === itemId || i.slug === item.slug);
  if (existingIdx > -1) {
    current.items[existingIdx].quantity += item.quantity || 1;
  } else {
    current.items.push({
      ...item,
      id: itemId,
      quantity: item.quantity || 1
    });
  }

  current.totalQuantity = current.items.reduce((sum, i) => sum + i.quantity, 0);
  current.subtotal = current.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);

  saveLocalCartState(current);
  return current;
}

export function updateLocalCartItemQty(id: string, quantity: number): LocalCartState {
  const current = getLocalCartState();
  if (quantity <= 0) {
    current.items = current.items.filter(i => i.id !== id);
  } else {
    const idx = current.items.findIndex(i => i.id === id);
    if (idx > -1) {
      current.items[idx].quantity = quantity;
    }
  }

  current.totalQuantity = current.items.reduce((sum, i) => sum + i.quantity, 0);
  current.subtotal = current.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);

  saveLocalCartState(current);
  return current;
}

export function removeLocalCartItem(id: string): LocalCartState {
  return updateLocalCartItemQty(id, 0);
}

export function openCartDrawer(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vinsho:open-cart-drawer'));
  }
}
