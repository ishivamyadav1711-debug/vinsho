import taxonomyData from '../../vinsho-taxonomy.json';
import contentData from '../../vinsho-content.json';
import { db } from '../lib/db.js';
import { isProductPurchasable } from '../lib/purchasability';

export interface Subcategory {
  key: string;
  name: string;
  blurb?: string;
  count?: number;
  products?: string[];
}

export interface Collection {
  key: string;
  name: string;
  order?: number;
  blurb: string;
  count?: number;
  subcategories: Subcategory[];
}

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

export interface ProductItem {
  id?: number;
  slug: string;
  name: string;
  collectionKey: string;
  collection: string;
  subcategoryKey: string;
  subcategory: string;
  mainCategory?: string;
  subCategory?: string;
  isPurchasable?: boolean;
  giftEligible?: boolean;
  availabilityStatus?: 'store' | 'online' | 'out_of_stock' | 'selected_stores';
  price?: number | null;
  previousCollection?: string;
  moved?: boolean;
  mergedTo?: string;
  image: string;
  material: string;
  description: string;
  tagline?: string;
  features?: Array<{ title: string; description: string }>;
  highlights?: Array<{ title: string; description: string }>;
  closing_line?: string;
  closingLine?: string;
  highlightsTagline?: string;
  variants?: ProductVariant[];
}

export interface AvailabilityInfo {
  status: 'store' | 'online' | 'out_of_stock' | 'selected_stores';
  label: string;
  locationNote?: string;
}

export function getProductAvailability(product?: Partial<ProductItem>): AvailabilityInfo {
  const status = product?.availabilityStatus || 'store';
  
  if (status === 'out_of_stock') {
    return { status: 'out_of_stock', label: 'Out of Stock' };
  }
  if (status === 'online') {
    return { status: 'online', label: 'Available Online' };
  }
  if (status === 'selected_stores') {
    return { status: 'selected_stores', label: 'Available at Selected Stores' };
  }

  return {
    status: 'store',
    label: 'In Stock',
    locationNote: 'VINSHO Studio'
  };
}

const collectionKeyAliases: Record<string, string> = {
  'gifting-collection': 'gifting-collection',
  'gifting': 'gifting-collection',
  'home-decor': 'home-decor',
  'decor': 'home-decor',
  'home-furnishing': 'home-furnishing',
  'home-furnishings': 'home-furnishing'
};

const subcategoryKeyAliases: Record<string, string> = {
  'bedsheet': 'bedsheet',
  'blanket': 'blanket',
  'curtains': 'curtains',
  'bathmat': 'bathmat',
  'cushion': 'cushion',
  'wall-art': 'wall-art',
  'wall-clock': 'wall-clock',
  'artificial-flowers': 'artificial-flowers',
  'showpiece': 'showpiece',
  'candles': 'candles',
  'photo-frame': 'photo-frame',
  'diary': 'diary',
  'pen': 'pen',
  'gift-items': 'gift-items'
};

export function normalizeCollectionKey(key: string): string {
  return collectionKeyAliases[key.toLowerCase()] || key;
}

export function normalizeSubcategoryKey(key: string): string {
  return subcategoryKeyAliases[key.toLowerCase()] || key;
}

export function getTaxonomy() {
  return taxonomyData;
}

export function getCollections(): Collection[] {
  try {
    const dbCols = db.prepare('SELECT * FROM collections WHERE deleted_at IS NULL ORDER BY order_index ASC').all() as any[];
    if (dbCols && dbCols.length > 0) {
      return dbCols.map((c) => {
        const subRows = db.prepare('SELECT * FROM subcategories WHERE collection_id = ? AND deleted_at IS NULL ORDER BY order_index ASC').all(c.id) as any[];
        return {
          key: c.key,
          name: c.name,
          blurb: c.blurb || '',
          order: c.order_index,
          subcategories: subRows.map((s) => ({
            key: s.key,
            name: s.name,
            blurb: s.blurb || ''
          }))
        };
      });
    }
  } catch (err) {
    console.warn('DB taxonomy read fallback to JSON:', err);
  }
  return taxonomyData.collections as Collection[];
}

export function getAllProducts(): ProductItem[] {
  try {
    const dbProducts = db.prepare(`
      SELECT 
        p.id, p.slug, p.name, p.description, p.tagline, p.features, p.closing_line, p.material, p.is_purchasable, p.gift_eligible,
        c.name as collection, c.key as collection_key,
        s.name as subcategory, s.key as subcategory_key,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image,
        (SELECT selling_price FROM product_variants WHERE product_id = p.id LIMIT 1) as price
      FROM products p
      JOIN collections c ON p.collection_id = c.id
      JOIN subcategories s ON p.subcategory_id = s.id
      WHERE p.deleted_at IS NULL
      ORDER BY p.name ASC
    `).all() as any[];

    if (dbProducts && dbProducts.length > 0) {
      return dbProducts.map((p) => {
        let parsedFeatures: Array<{ title: string; description: string }> = [];
        if (p.features) {
          try {
            parsedFeatures = typeof p.features === 'string' ? JSON.parse(p.features) : p.features;
          } catch {
            parsedFeatures = [];
          }
        }

        const variantRows = db.prepare(`
          SELECT id, product_id, sku, size, colour, mrp, selling_price, stock
          FROM product_variants
          WHERE product_id = ?
          ORDER BY position ASC, id ASC
        `).all(p.id) as any[];

        const imgRows = db.prepare(`
          SELECT url FROM product_images WHERE product_id = ? ORDER BY position ASC, id ASC
        `).all(p.id) as any[];
        const imageList = imgRows.map((r) => r.url).filter(Boolean);
        const primaryImage = imageList[0] || p.image || '';
        const allImages = imageList.length > 0 ? imageList : (primaryImage ? [primaryImage] : []);

        const variants: ProductVariant[] = variantRows.map((v) => {
          const label = [v.size, v.colour].filter(Boolean).join(' / ') || 'Standard Variant';
          return {
            id: v.id,
            productId: v.product_id,
            sku: v.sku || `SKU-${p.slug}`,
            size: v.size || undefined,
            colour: v.colour || undefined,
            mrp: v.mrp || null,
            sellingPrice: v.selling_price || p.price || 0,
            stock: v.stock !== null && v.stock !== undefined ? v.stock : 100,
            label
          };
        });

        const activePrice = variants[0]?.sellingPrice || p.price || null;

        const normColKey = normalizeCollectionKey(p.collection_key);
        const isPurchasable = isProductPurchasable({
          slug: p.slug,
          name: p.name,
          collectionKey: normColKey,
          collection: p.collection,
          subcategoryKey: p.subcategory_key,
          subcategory: p.subcategory,
          isPurchasable: Boolean(p.is_purchasable)
        });
        const finalPrice = isPurchasable ? (activePrice || 499) : null;

        return {
          id: p.id,
          slug: p.slug,
          name: p.name,
          collectionKey: normColKey,
          collection: p.collection,
          subcategoryKey: normalizeSubcategoryKey(p.subcategory_key),
          subcategory: p.subcategory,
          mainCategory: p.collection,
          subCategory: p.subcategory,
          isPurchasable,
          giftEligible: Boolean(p.gift_eligible),
          price: finalPrice,
          image: primaryImage,
          images: allImages,
          material: p.material || '',
          description: p.description !== undefined && p.description !== null ? p.description : '',
          tagline: p.tagline || '',
          features: parsedFeatures,
          closing_line: p.closing_line || '',
          closingLine: p.closing_line || '',
          variants
        };
      });
    }
  } catch (err) {
    console.warn('DB product read fallback to JSON:', err);
  }

  const contentDescMap = Object.fromEntries(
    (contentData.products || []).map(p => [p.slug, p.description])
  );

  return (seedProducts as any[]).map(p => {
    const colKey = normalizeCollectionKey(p.collectionKey || p.collection || '');
    const isPurchasable = isProductPurchasable({
      slug: p.slug,
      name: p.name,
      collectionKey: colKey,
      collection: p.collection || p.mainCategory,
      subcategoryKey: p.subcategoryKey,
      subcategory: p.subcategory || p.subCategory,
      isPurchasable: Boolean(p.isPurchasable)
    });
    const activePrice = isPurchasable ? (p.sellingPrice || p.price || 499) : null;

    const seedImgs = p.images && p.images.length > 0 ? p.images : (p.image ? [p.image] : []);
    return {
      ...p,
      collectionKey: colKey,
      collection: p.collection || p.mainCategory,
      subcategoryKey: normalizeSubcategoryKey(p.subcategoryKey),
      subcategory: p.subcategory || p.subCategory,
      mainCategory: p.mainCategory || p.collection,
      subCategory: p.subCategory || p.subcategory,
      isPurchasable,
      price: activePrice,
      image: seedImgs[0] || p.image || '',
      images: seedImgs,
      description: p.description !== undefined && p.description !== null ? p.description : (contentDescMap[p.slug] || ''),
      tagline: p.tagline || '',
      features: p.features || [],
      closing_line: p.closing_line || p.closingLine || '',
      closingLine: p.closingLine || p.closing_line || ''
    };
  });
}

export function getActiveProducts(): ProductItem[] {
  return getAllProducts().filter(p => !p.mergedTo);
}

export function getCollectionByKey(key: string): Collection | undefined {
  const norm = normalizeCollectionKey(key);
  return getCollections().find(c => c.key === norm || c.key === key);
}

export function getSubcategoryByKey(collectionKey: string, subKey: string): Subcategory | undefined {
  const col = getCollectionByKey(collectionKey);
  const normSub = normalizeSubcategoryKey(subKey);
  return col?.subcategories.find(s => s.key === normSub || s.key === subKey);
}

export function getCollectionProductCount(collectionKey: string): number {
  const normCol = normalizeCollectionKey(collectionKey);
  return getActiveProducts().filter(p => p.collectionKey === normCol).length;
}

export function getSubcategoryProductCount(collectionKey: string, subcategoryKey: string): number {
  const normCol = normalizeCollectionKey(collectionKey);
  const normSub = normalizeSubcategoryKey(subcategoryKey);
  return getActiveProducts().filter(
    p => p.collectionKey === normCol && p.subcategoryKey === normSub
  ).length;
}

export function getProductsByCollection(collectionKey: string): ProductItem[] {
  const normCol = normalizeCollectionKey(collectionKey);
  return getActiveProducts().filter(p => p.collectionKey === normCol);
}

export function getProductsBySubcategory(collectionKey: string, subcategoryKey: string): ProductItem[] {
  const normCol = normalizeCollectionKey(collectionKey);
  const normSub = normalizeSubcategoryKey(subcategoryKey);
  return getActiveProducts().filter(
    p => p.collectionKey === normCol && p.subcategoryKey === normSub
  );
}

export function getProductBySlug(slug: string): ProductItem | undefined {
  return getAllProducts().find(p => p.slug === slug);
}

