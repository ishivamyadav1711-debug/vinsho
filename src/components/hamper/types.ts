export interface ProductVariant {
  id: number;
  productId: number;
  sku: string;
  size?: string;
  colour?: string;
  mrp: number | null;
  sellingPrice: number;
  stock: number;
  label: string;
}

export interface GiftProduct {
  id?: number;
  slug: string;
  name: string;
  price: number | null;
  image: string;
  collection: string;
  collectionKey: string;
  subcategory: string;
  subcategoryKey: string;
  material?: string;
  giftEligible?: boolean;
  variants?: ProductVariant[];
}

export interface SelectedHamperItem {
  itemKey: string; // Unique key: `${productSlug}_${variantId}`
  productId?: number;
  productSlug: string;
  product: GiftProduct;
  variantId: number | string;
  variant: ProductVariant;
  quantity: number;
}

export interface PackagingOption {
  id: string;
  name: string;
  price: number;
  description: string;
  image?: string;
}

export interface BudgetOption {
  id: string;
  label: string;
  minPrice: number;
  maxPrice: number | null;
}

export interface HamperPersonalizeState {
  recipientName: string;
  senderName: string;
  message: string;
  hidePrices?: boolean;
  packagingId: string;
}

export type HamperStep = 'occasion' | 'products' | 'personalize' | 'preview';
