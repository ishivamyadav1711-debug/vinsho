import type { APIRoute } from 'astro';
import { prisma } from '../../../../lib/db.js';
import { getSessionUser } from '../../../../lib/auth.js';

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export const GET: APIRoute = async ({ request }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized admin access.' }), { status: 401 });
  }

  const products = await prisma.products.findMany({
    where: { deleted_at: null },
    include: {
      collection: { select: { name: true } },
      subcategory: { select: { name: true } },
      ProductVariants: true
    },
    orderBy: { name: 'asc' }
  });

  const lowStockThreshold = 5;

  const rows: string[] = [];
  rows.push([
    'Product ID',
    'Product Name',
    'SKU',
    'Category / Collection',
    'Selling Price',
    'Stock Quantity',
    'Low Stock Threshold',
    'Stock Status',
    'Online Availability',
    'Last Updated'
  ].join(','));

  for (const p of products) {
    const primaryVariant = p.ProductVariants[0];
    const totalStock = p.ProductVariants.reduce((sum, v) => sum + (v.stock ?? 0), 0);
    const sku = primaryVariant?.sku || p.sku || `PRD-${p.id}`;
    const price = primaryVariant?.selling_price ? `INR ${primaryVariant.selling_price}` : 'Price on Request';
    const category = p.collection?.name ? `${p.collection.name}${p.subcategory?.name ? ` / ${p.subcategory.name}` : ''}` : 'Uncategorized';
    
    let stockStatus = 'IN STOCK';
    if (totalStock <= 0) {
      stockStatus = 'OUT OF STOCK';
    } else if (totalStock <= lowStockThreshold) {
      stockStatus = 'LOW STOCK';
    }

    const onlineAvail = p.sellable_online && p.is_purchasable ? 'Available Online' : (p.sellable_online ? 'Gated / Store Consultation' : 'Not Available Online');

    rows.push([
      escapeCsv(p.id),
      escapeCsv(p.name),
      escapeCsv(sku),
      escapeCsv(category),
      escapeCsv(price),
      escapeCsv(totalStock),
      escapeCsv(lowStockThreshold),
      escapeCsv(stockStatus),
      escapeCsv(onlineAvail),
      escapeCsv(new Date(p.updated_at).toISOString())
    ].join(','));
  }

  const csvContent = rows.join('\r\n');

  return new Response(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="vinsho_inventory_export_${Date.now()}.csv"`
    }
  });
};
