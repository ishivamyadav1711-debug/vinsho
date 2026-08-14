import { db } from './db.js';
import { logCrmActivity } from './crm.js';

export interface RequestReturnParams {
  orderId: number;
  customerId: number;
  orderItemId: number;
  qty: number;
  reason: string;
  type?: 'CUSTOMER_INITIATED' | 'RTO';
}

export interface ReturnInspectionParams {
  returnId: number;
  inspectedBy: number;
  result: 'PASS' | 'FAIL';
  notes?: string;
}

export function requestReturn(params: RequestReturnParams): { success: boolean; returnRecord?: any; error?: string } {
  // 1. Fetch Order Item & Associated Product Details
  const orderItem = db.prepare(`
    SELECT oi.*, o.placed_at, o.status as order_status, o.customer_id as order_customer_id,
           p.shipping_class, p.returnable
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN product_variants v ON oi.variant_id = v.id
    JOIN products p ON v.product_id = p.id
    WHERE oi.id = ? AND oi.order_id = ?
  `).get(params.orderItemId, params.orderId) as any;

  if (!orderItem) {
    return { success: false, error: 'Order line item not found.' };
  }

  // 2. Section 1 Rule: Made-to-order and bulky products are non-returnable. Enforced at request time!
  if (orderItem.shipping_class === 'made-to-order' || orderItem.shipping_class === 'bulky' || orderItem.returnable === 0) {
    return {
      success: false,
      error: `Return rejected: Items with shipping class '${orderItem.shipping_class}' are non-returnable.`
    };
  }

  // 3. Policy Window Check (14 Days from order placement)
  const placedDate = new Date(orderItem.placed_at).getTime();
  const daysDiff = (Date.now() - placedDate) / (1000 * 60 * 60 * 24);
  if (params.type !== 'RTO' && daysDiff > 14) {
    return { success: false, error: 'Return request window (14 days) has expired for this order.' };
  }

  if (params.qty > orderItem.qty) {
    return { success: false, error: `Requested return quantity (${params.qty}) exceeds ordered quantity (${orderItem.qty}).` };
  }

  // Calculate Proportionate Refund Amount (Unit Price + Tax)
  const unitPrice = orderItem.unit_price_snapshot;
  const unitTax = orderItem.tax_amount / orderItem.qty;
  const lineRefundAmount = Number(((unitPrice + unitTax) * params.qty).toFixed(2));
  const isRto = params.type === 'RTO' ? 1 : 0;
  const now = new Date().toISOString();

  return db.transaction(() => {
    // Insert Return Record
    const returnRes = db.prepare(`
      INSERT INTO returns (order_id, customer_id, type, reason, status, refund_amount, is_rto, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'REQUESTED', ?, ?, ?, ?)
    `).run(params.orderId, params.customerId, params.type || 'CUSTOMER_INITIATED', params.reason, lineRefundAmount, isRto, now, now);

    const returnId = returnRes.lastInsertRowid as number;

    // Insert Return Line Item
    db.prepare(`
      INSERT INTO return_items (return_id, order_item_id, variant_id, qty, unit_price, tax_amount, line_total)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(returnId, params.orderItemId, orderItem.variant_id, params.qty, unitPrice, unitTax * params.qty, lineRefundAmount);

    logCrmActivity({
      entityType: 'customer',
      entityId: params.customerId,
      actorId: null,
      type: 'RETURN_REQUESTED',
      summary: `Return requested for Order #${orderItem.order_id} (${params.qty}x ${orderItem.product_name_snapshot}). Reason: ${params.reason}`
    });

    const returnRecord = db.prepare('SELECT * FROM returns WHERE id = ?').get(returnId);
    return { success: true, returnRecord };
  })();
}

/**
 * Execute Return Goods Inspection (§1 Rule: Stock is restored ONLY IF inspection passes!)
 */
export function inspectAndProcessReturn(params: ReturnInspectionParams): { success: boolean; returnRecord?: any; error?: string } {
  const returnRow = db.prepare('SELECT * FROM returns WHERE id = ?').get(params.returnId) as any;
  if (!returnRow) {
    return { success: false, error: 'Return record not found.' };
  }

  const returnItems = db.prepare('SELECT * FROM return_items WHERE return_id = ?').all(params.returnId) as any[];
  const now = new Date().toISOString();

  return db.transaction(() => {
    if (params.result === 'PASS') {
      // Restore Stock to sellable inventory
      for (const item of returnItems) {
        db.prepare('UPDATE product_variants SET stock = stock + ? WHERE id = ?').run(item.qty, item.variant_id);
        const variant = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(item.variant_id) as any;

        db.prepare(`
          INSERT INTO inventory_txns (variant_id, delta, reason, order_id, actor_id, balance_after, created_at)
          VALUES (?, ?, 'RESTOCK', ?, ?, ?, ?)
        `).run(item.variant_id, item.qty, returnRow.order_id, params.inspectedBy, variant ? variant.stock : 0, now);
      }
    } else {
      // Inspection FAIL: Log Damaged Return Write-off (Do NOT restore sellable stock!)
      for (const item of returnItems) {
        const variant = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(item.variant_id) as any;
        db.prepare(`
          INSERT INTO inventory_txns (variant_id, delta, reason, order_id, actor_id, balance_after, created_at)
          VALUES (?, 0, 'WRITE_OFF_DAMAGED_RETURN', ?, ?, ?, ?)
        `).run(item.variant_id, returnRow.order_id, params.inspectedBy, variant ? variant.stock : 0, now);
      }
    }

    // Update Return Record Status
    db.prepare(`
      UPDATE returns SET
        status = 'INSPECTED',
        inspected_by = ?,
        inspection_result = ?,
        inspection_notes = ?,
        updated_at = ?
      WHERE id = ?
    `).run(params.inspectedBy, params.result, params.notes || '', now, params.returnId);

    // Update Order Status
    db.prepare('UPDATE orders SET status = "Returned", updated_at = ? WHERE id = ?').run(now, returnRow.order_id);

    logCrmActivity({
      entityType: 'customer',
      entityId: returnRow.customer_id,
      actorId: params.inspectedBy,
      type: 'RETURN_INSPECTED',
      summary: `Return #${params.returnId} inspected: ${params.result} ${params.result === 'PASS' ? '(Stock restored)' : '(Damaged write-off logged)'}`
    });

    const updated = db.prepare('SELECT * FROM returns WHERE id = ?').get(params.returnId);
    return { success: true, returnRecord: updated };
  })();
}
