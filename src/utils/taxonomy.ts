import taxonomyData from '../../vinsho-taxonomy.json';
import contentData from '../../vinsho-content.json';
import { prisma } from '../lib/db.js';
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

/** Async: Fetch collections from PostgreSQL, fallback to JSON seed. */
export async function getCollections(): Promise<Collection[]> {
  try {
    const dbCols = await prisma.collections.findMany({
      where: { deleted_at: null },
      orderBy: { order_index: 'asc' }
    });

    if (dbCols && dbCols.length > 0) {
      const result: Collection[] = await Promise.all(
        dbCols.map(async (c) => {
          const subRows = await prisma.subcategories.findMany({
            where: { collection_id: c.id, deleted_at: null },
            orderBy: { order_index: 'asc' }
          });
          return {
            key: c.key,
            name: c.name,
            blurb: c.blurb || '',
            order: c.order_index ?? undefined,
            subcategories: subRows.map((s) => ({
              key: s.key,
              name: s.name,
              blurb: s.blurb || ''
            }))
          };
        })
      );
      return result;
    }
  } catch (err) {
    console.warn('DB taxonomy read fallback to JSON:', err);
  }
  return taxonomyData.collections as Collection[];
}

/** Async: Fetch all products from PostgreSQL, fallback to JSON seed. */
export async function getAllProducts(): Promise<ProductItem[]> {
  try {
    const dbProducts = await prisma.products.findMany({
      where: { deleted_at: null },
      include: {
        collections: true,
        subcategories: true,
        product_images: { orderBy: [{ position: 'asc' }, { id: 'asc' }] },
        product_variants: { orderBy: [{ position: 'asc' }, { id: 'asc' }] }
      },
      orderBy: { name: 'asc' }
    });

    if (dbProducts && dbProducts.length > 0) {
      return dbProducts.map((p) => {
        let parsedFeatures: Array<{ title: string; description: string }> = [];
        if (p.features) {
          try {
            parsedFeatures = typeof p.features === 'string' ? JSON.parse(p.features as string) : (p.features as any);
          } catch {
            parsedFeatures = [];
          }
        }

        const imageList = p.product_images.map((img) => img.url).filter(Boolean);
        const primaryImage = imageList[0] || '';
        const allImages = imageList.length > 0 ? imageList : (primaryImage ? [primaryImage] : []);

        const variants: ProductVariant[] = p.product_variants.map((v) => {
          const label = [v.size, v.colour].filter(Boolean).join(' / ') || 'Standard Variant';
          return {
            id: v.id,
            productId: v.product_id,
            sku: v.sku || `SKU-${p.slug}`,
            size: v.size || undefined,
            colour: v.colour || undefined,
            mrp: v.mrp !== null ? Number(v.mrp) : null,
            sellingPrice: v.selling_price !== null ? Number(v.selling_price) : 0,
            stock: v.stock !== null && v.stock !== undefined ? v.stock : 100,
            label
          };
        });

        const normColKey = normalizeCollectionKey(p.collections?.key || '');
        const firstPrice = variants[0]?.sellingPrice || null;

        const isPurchasable = isProductPurchasable({
          slug: p.slug,
          name: p.name,
          collectionKey: normColKey,
          collection: p.collections?.name || '',
          subcategoryKey: p.subcategories?.key || '',
          subcategory: p.subcategories?.name || '',
          isPurchasable: Boolean(p.is_purchasable)
        });
        const finalPrice = isPurchasable ? (firstPrice || 499) : null;

        return {
          id: p.id,
          slug: p.slug,
          name: p.name,
          collectionKey: normColKey,
          collection: p.collections?.name || '',
          subcategoryKey: normalizeSubcategoryKey(p.subcategories?.key || ''),
          subcategory: p.subcategories?.name || '',
          mainCategory: p.collections?.name || '',
          subCategory: p.subcategories?.name || '',
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
        } as ProductItem;
      });
    }
  } catch (err) {
    console.warn('DB product read fallback to JSON:', err);
  }

  const contentDescMap = Object.fromEntries(
    (contentData.products || []).map(p => [p.slug, p.description])
  );

  const seedProducts = (taxonomyData as any).products || [];
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

export async function getActiveProducts(): Promise<ProductItem[]> {
  const all = await getAllProducts();
  return all.filter(p => !p.mergedTo);
}

export async function getCollectionByKey(key: string): Promise<Collection | undefined> {
  const norm = normalizeCollectionKey(key);
  const cols = await getCollections();
  return cols.find(c => c.key === norm || c.key === key);
}

export async function getSubcategoryByKey(collectionKey: string, subKey: string): Promise<Subcategory | undefined> {
  const col = await getCollectionByKey(collectionKey);
  const normSub = normalizeSubcategoryKey(subKey);
  return col?.subcategories.find(s => s.key === normSub || s.key === subKey);
}

export async function getCollectionProductCount(collectionKey: string): Promise<number> {
  const normCol = normalizeCollectionKey(collectionKey);
  const active = await getActiveProducts();
  return active.filter(p => p.collectionKey === normCol).length;
}

export async function getSubcategoryProductCount(collectionKey: string, subcategoryKey: string): Promise<number> {
  const normCol = normalizeCollectionKey(collectionKey);
  const normSub = normalizeSubcategoryKey(subcategoryKey);
  const active = await getActiveProducts();
  return active.filter(
    p => p.collectionKey === normCol && p.subcategoryKey === normSub
  ).length;
}

export async function getProductsByCollection(collectionKey: string): Promise<ProductItem[]> {
  const normCol = normalizeCollectionKey(collectionKey);
  const active = await getActiveProducts();
  return active.filter(p => p.collectionKey === normCol);
}

export async function getProductsBySubcategory(collectionKey: string, subcategoryKey: string): Promise<ProductItem[]> {
  const normCol = normalizeCollectionKey(collectionKey);
  const normSub = normalizeSubcategoryKey(subcategoryKey);
  const active = await getActiveProducts();
  return active.filter(
    p => p.collectionKey === normCol && p.subcategoryKey === normSub
  );
}

export async function getProductBySlug(slug: string): Promise<ProductItem | undefined> {
  const all = await getAllProducts();
  return all.find(p => p.slug === slug);
}
