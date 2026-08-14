import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { getSessionUser } from '../../../lib/auth';

export const GET: APIRoute = async ({ request }) => {
  const user = getSessionUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const totalLeads = (db.prepare('SELECT COUNT(*) as cnt FROM leads').get() as any).cnt;
  const newLeads = (db.prepare("SELECT COUNT(*) as cnt FROM leads WHERE status = 'NEW'").get() as any).cnt;
  const qualifiedLeads = (db.prepare("SELECT COUNT(*) as cnt FROM leads WHERE status = 'QUALIFIED'").get() as any).cnt;
  const convertedLeads = (db.prepare("SELECT COUNT(*) as cnt FROM leads WHERE status = 'CONVERTED'").get() as any).cnt;
  const lostLeads = (db.prepare("SELECT COUNT(*) as cnt FROM leads WHERE status = 'LOST'").get() as any).cnt;

  const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) + '%' : '0.0%';

  // Lead Sources breakdown
  const sources = db.prepare(`
    SELECT source, COUNT(*) as count
    FROM leads
    GROUP BY source
    ORDER BY count DESC
  `).all();

  // Collection Interest breakdown
  const collectionInterest = db.prepare(`
    SELECT collection_key, COUNT(*) as count
    FROM leads
    WHERE collection_key != ''
    GROUP BY collection_key
    ORDER BY count DESC
  `).all();

  // Top Product Interest breakdown
  const productInterest = db.prepare(`
    SELECT product_slug, COUNT(*) as count
    FROM leads
    WHERE product_slug != ''
    GROUP BY product_slug
    ORDER BY count DESC
    LIMIT 6
  `).all();

  // Status breakdown
  const statusBreakdown = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM leads
    GROUP BY status
  `).all();

  return new Response(JSON.stringify({
    metrics: {
      totalLeads,
      newLeads,
      qualifiedLeads,
      convertedLeads,
      lostLeads,
      conversionRate
    },
    sources,
    collectionInterest,
    productInterest,
    statusBreakdown
  }), { status: 200 });
};
