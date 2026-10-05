import { prisma } from './db.js';
import { logCrmActivity } from './crm.js';
import { getComboComponents } from './combos.js';

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

export async function requestReturn(params: RequestReturnParams): Promise<{ success: boolean; returnRecord?: any; error?: string }> {
  // 1. Fetch Order Item & Associated Product Details
  const orderItem = await prisma.orderItems.findFirst({
    where: { id: params.orderItemId, order_id: params.orderId },
    include: {
      order: true,
      variant: {
        include: { product: true }
      }
    }
  });

  if (!orderItem) {
    return { success: false, error: 'Order line item not found.' };
  }

  const p = orderItem.variant?.product;

  // 2. Made-to-order and bulky products are non-returnable. Enforced at request time!
  if (p && (p.shipping_class === 'made-to-order' || p.shipping_class === 'bulky' || !p.returnable)) {
    return {
      success: false,
      error: `Return rejected: Items with shipping class '${p.shipping_class}' are non-returnable.`
    };
  }

  // 3. Policy Window Check (14 Days from order placement)
  const placedDate = new Date(orderItem.order.placed_at).getTime();
  const daysDiff = (Date.now() - placedDate) / (1000 * 60 * 60 * 24);
  if (params.type !== 'RTO' && daysDiff > 14) {
    return { success: false, error: 'Return request window (14 days) has expired for this order.' };
  }

  if (params.qty > orderItem.qty) {
    return { success: false, error: `Requested return quantity (${params.qty}) exceeds ordered quantity (${orderItem.qty}).` };
  }

  // Calculate Proportionate Refund Amount (Unit Price + Tax)
  const unitPrice = Number(orderItem.unit_price_snapshot);
  const unitTax = Number(orderItem.tax_amount) / orderItem.qty;
  const lineRefundAmount = Number(((unitPrice + unitTax) * params.qty).toFixed(2));
  const isRto = params.type === 'RTO';
  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    // Insert Return Record
    const returnRecord = await tx.returns.create({
      data: {
        order_id: params.orderId,
        customer_id: params.customerId,
        type: params.type || 'CUSTOMER_INITIATED',
        reason: params.reason,
        status: 'REQUESTED',
        refund_amount: lineRefundAmount,
        is_rto: isRto,
        created_at: now,
        updated_at: now
      }
    });

    const returnId = returnRecord.id;

    // Insert Return Line Item
    await tx.returnItems.create({
      data: {
        return_id: returnId,
        order_item_id: params.orderItemId,
        variant_id: orderItem.variant_id ?? 0,
        qty: params.qty,
        unit_price: unitPrice,
        tax_amount: unitTax * params.qty,
        line_total: lineRefundAmount
      }
    });

    await logCrmActivity({
      entityType: 'customer',
      entityId: params.customerId,
      actorId: null,
      type: 'RETURN_REQUESTED',
      summary: `Return requested for Order #${orderItem.order_id} (${params.qty}x ${orderItem.product_name_snapshot}). Reason: ${params.reason}`
    });

    return { success: true, returnRecord };
  });
}

/**
 * Execute Return Goods Inspection (Stock is restored ONLY IF inspection passes!)
 * Supports component restoration for returned combo bundles.
 */
export async function inspectAndProcessReturn(params: ReturnInspectionParams): Promise<{ success: boolean; returnRecord?: any; error?: string }> {
  const returnRow = await prisma.returns.findUnique({
    where: { id: params.returnId }
  });
  if (!returnRow) {
    return { success: false, error: 'Return record not found.' };
  }

  const returnItems = await prisma.returnItems.findMany({
    where: { return_id: params.returnId }
  });
  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    if (params.result === 'PASS') {
      // Restore Stock to sellable inventory
      for (const item of returnItems) {
        const comboComponents = await getComboComponents(item.variant_id);
        if (comboComponents.length > 0) {
          // Restore component inventory for combos
          for (const comp of comboComponents) {
            const restoreQty = comp.quantity * item.qty;
            await tx.productVariants.update({
              where: { id: comp.component_variant_id },
              data: { stock: { increment: restoreQty } }
            });
            const variant = await tx.productVariants.findUnique({
              where: { id: comp.component_variant_id },
              select: { stock: true }
            });

            await tx.inventoryTxns.create({
              data: {
                variant_id: comp.component_variant_id,
                delta: restoreQty,
                reason: 'RESTOCK',
                order_id: returnRow.order_id,
                actor_id: params.inspectedBy,
                balance_after: variant?.stock ?? 0,
                created_at: now
              }
            });
          }
        } else {
          // Restore standalone product stock
          await tx.productVariants.update({
            where: { id: item.variant_id },
            data: { stock: { increment: item.qty } }
          });
          const variant = await tx.productVariants.findUnique({
            where: { id: item.variant_id },
            select: { stock: true }
          });

          await tx.inventoryTxns.create({
            data: {
              variant_id: item.variant_id,
              delta: item.qty,
              reason: 'RESTOCK',
              order_id: returnRow.order_id,
              actor_id: params.inspectedBy,
              balance_after: variant?.stock ?? 0,
              created_at: now
            }
          });
        }
      }
    } else {
      // Inspection FAIL: Log Damaged Return Write-off (Do NOT restore sellable stock!)
      for (const item of returnItems) {
        const comboComponents = await getComboComponents(item.variant_id);
        if (comboComponents.length > 0) {
          for (const comp of comboComponents) {
            const variant = await tx.productVariants.findUnique({
              where: { id: comp.component_variant_id },
              select: { stock: true }
            });
            await tx.inventoryTxns.create({
              data: {
                variant_id: comp.component_variant_id,
                delta: 0,
                reason: 'WRITE_OFF_DAMAGED_RETURN',
                order_id: returnRow.order_id,
                actor_id: params.inspectedBy,
                balance_after: variant?.stock ?? 0,
                created_at: now
              }
            });
          }
        } else {
          const variant = await tx.productVariants.findUnique({
            where: { id: item.variant_id },
            select: { stock: true }
          });
          await tx.inventoryTxns.create({
            data: {
              variant_id: item.variant_id,
              delta: 0,
              reason: 'WRITE_OFF_DAMAGED_RETURN',
              order_id: returnRow.order_id,
              actor_id: params.inspectedBy,
              balance_after: variant?.stock ?? 0,
              created_at: now
            }
          });
        }
      }
    }

    // Update Return Record Status
    const updated = await tx.returns.update({
      where: { id: params.returnId },
      data: {
        status: 'INSPECTED',
        inspected_by: params.inspectedBy,
        inspection_result: params.result,
        inspection_notes: params.notes || '',
        updated_at: now
      }
    });

    // Update Order Status
    await tx.orders.update({
      where: { id: returnRow.order_id },
      data: {
        status: 'Returned',
        updated_at: now
      }
    });

    await logCrmActivity({
      entityType: 'customer',
      entityId: returnRow.customer_id,
      actorId: params.inspectedBy,
      type: 'RETURN_INSPECTED',
      summary: `Return #${params.returnId} inspected: ${params.result} ${params.result === 'PASS' ? '(Stock restored)' : '(Damaged write-off logged)'}`
    });

    return { success: true, returnRecord: updated };
  });
}
