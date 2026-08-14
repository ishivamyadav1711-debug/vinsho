import taxonomyData from '../../vinsho-taxonomy.json';
import contentData from '../../vinsho-content.json';
import { db } from '../lib/db.js';

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

export interface ProductItem {
  slug: string;
  name: string;
  collectionKey: string;
  collection: string;
  subcategoryKey: string;
  subcategory: string;
  mainCategory?: string;
  subCategory?: string;
  isPurchasable?: boolean;
  price?: number | null;
  previousCollection?: string;
  moved?: boolean;
  mergedTo?: string;
  image: string;
  material: string;
  description: string;
}

const collectionKeyAliases: Record<string, string> = {
  'gifting-collection': 'gifting-collection',
  'gifting': 'gifting-collection',
  'home-decor': 'home-decor',
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
        p.slug, p.name, p.description, p.material, p.is_purchasable,
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
      return dbProducts.map((p) => ({
        slug: p.slug,
        name: p.name,
        collectionKey: normalizeCollectionKey(p.collection_key),
        collection: p.collection,
        subcategoryKey: normalizeSubcategoryKey(p.subcategory_key),
        subcategory: p.subcategory,
        mainCategory: p.collection,
        subCategory: p.subcategory,
        isPurchasable: Boolean(p.is_purchasable),
        price: p.price || null,
        image: p.image || '',
        material: p.material || '',
        description: p.description || 'Curated to blend elegance, comfort and functionality in everyday rooms.'
      }));
    }
  } catch (err) {
    console.warn('DB product read fallback to JSON:', err);
  }

  const contentDescMap = Object.fromEntries(
    (contentData.products || []).map(p => [p.slug, p.description])
  );

  const seedProducts = (seedData.products || []);
  const seedMap = Object.fromEntries(seedProducts.map(p => [p.slug, p]));

  return (seedProducts as any[]).map(p => ({
    ...p,
    collectionKey: normalizeCollectionKey(p.collectionKey),
    collection: p.collection || p.mainCategory,
    subcategoryKey: normalizeSubcategoryKey(p.subcategoryKey),
    subcategory: p.subcategory || p.subCategory,
    mainCategory: p.mainCategory || p.collection,
    subCategory: p.subCategory || p.subcategory,
    isPurchasable: Boolean(p.isPurchasable),
    price: p.sellingPrice || p.price || null,
    description: p.description || contentDescMap[p.slug] || 'Curated to blend elegance, comfort and functionality in everyday rooms.'
  }));
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

