import { prisma } from './db.js';
import { getComboComponents } from './combos.js';

export interface InventoryTxnParams {
  variantId: number;
  delta: number; // Negative for sale/reservation/removal, positive for restock/addition/release
  reason: 
    | 'INITIAL_STOCK' 
    | 'SALE' 
    | 'RESERVATION' 
    | 'RESERVATION_RELEASE' 
    | 'RESTOCK' 
    | 'ADJUSTMENT' 
    | 'WRITE_OFF_DAMAGED_RETURN'
    | 'STOCK_ADDED'
    | 'STOCK_REMOVED'
    | 'STOCK_SET'
    | 'ORDER_DEDUCTION'
    | 'ORDER_CANCELLATION_RESTORATION'
    | 'REFUND_RESTORATION'
    | 'MANUAL_OUT_OF_STOCK'
    | 'MANUAL_IN_STOCK';
  orderId?: number | null;
  actorId?: number | null;
}

/**
 * Executes atomic conditional stock reduction.
 * Negative stock is impossible due to PostgreSQL conditional updates or Prisma transactions.
 */
export async function atomicDecrementStock(
  params: InventoryTxnParams,
  txClient?: any
): Promise<{ success: boolean; balanceAfter: number; error?: string }> {
  const client = txClient || prisma;

  const qtyToDecrement = Math.abs(params.delta);

  // We perform an atomic update using raw SQL query inside transaction or conditional update
  // to ensure PostgreSQL row-level locking and prevent race conditions.
  const executeAtomic = async (tx: any) => {
    // Check if variant exists and has enough stock
    // Using raw SQL for atomic conditional update with row-level safety
    const updated = await tx.$queryRaw`
      UPDATE product_variants
      SET stock = stock - ${qtyToDecrement}
      WHERE id = ${params.variantId} AND stock >= ${qtyToDecrement}
      RETURNING stock
    ` as Array<{ stock: number }>;

    if (!updated || updated.length === 0) {
      const current = await tx.productVariants.findUnique({
        where: { id: params.variantId },
        select: { stock: true }
      });
      const currentStock = current?.stock ?? 0;
      return {
        success: false,
        balanceAfter: currentStock,
        error: `Insufficient stock balance (Requested: ${qtyToDecrement}, Available: ${currentStock}).`
      };
    }

    const balanceAfter = updated[0].stock;
    const now = new Date();

    // Log immutable inventory transaction
    await tx.inventoryTxns.create({
      data: {
        variant_id: params.variantId,
        delta: -qtyToDecrement,
        reason: params.reason,
        order_id: params.orderId || null,
        actor_id: params.actorId || null,
        balance_after: balanceAfter,
        created_at: now
      }
    });

    return { success: true, balanceAfter };
  };

  if (txClient) {
    return await executeAtomic(txClient);
  } else {
    return await prisma.$transaction(async (tx) => {
      return await executeAtomic(tx);
    });
  }
}

/**
 * Reserve stock for a cart during checkout session (expires in 15 mins).
 * Supports both standalone items and combo component reservations.
 */
export async function reserveStock(cartId: number, variantId: number, qty: number): Promise<boolean> {
  const expiryMs = 15 * 60 * 1000;
  const now = new Date();
  const expiresAt = BigInt(Date.now() + expiryMs);

  const comboComponents = await getComboComponents(variantId);

  return await prisma.$transaction(async (tx) => {
    if (comboComponents.length > 0) {
      for (const comp of comboComponents) {
        const compQty = comp.quantity * qty;
        const res = await atomicDecrementStock({
          variantId: comp.component_variant_id,
          delta: -compQty,
          reason: 'RESERVATION'
        }, tx);
        if (!res.success) throw new Error(res.error || 'Failed stock decrement for combo component');

        await tx.stockReservations.create({
          data: {
            variant_id: comp.component_variant_id,
            cart_id: cartId,
            qty: compQty,
            expires_at: expiresAt,
            created_at: now
          }
        });
      }
      return true;
    } else {
      const res = await atomicDecrementStock({
        variantId,
        delta: -qty,
        reason: 'RESERVATION'
      }, tx);
      if (!res.success) throw new Error(res.error || 'Failed stock decrement');

      await tx.stockReservations.create({
        data: {
          variant_id: variantId,
          cart_id: cartId,
          qty,
          expires_at: expiresAt,
          created_at: now
        }
      });

      return true;
    }
  }).then(() => true).catch(() => false);
}

/**
 * Release expired stock reservations back into available inventory.
 */
export async function releaseExpiredReservations(): Promise<number> {
  const now = BigInt(Date.now());
  const expired = await prisma.stockReservations.findMany({
    where: { expires_at: { lt: now } }
  });

  let releasedCount = 0;
  for (const res of expired) {
    await prisma.$transaction(async (tx) => {
      await tx.productVariants.update({
        where: { id: res.variant_id },
        data: { stock: { increment: res.qty } }
      });

      const variant = await tx.productVariants.findUnique({
        where: { id: res.variant_id },
        select: { stock: true }
      });

      await tx.inventoryTxns.create({
        data: {
          variant_id: res.variant_id,
          delta: res.qty,
          reason: 'RESERVATION_RELEASE',
          order_id: null,
          actor_id: null,
          balance_after: variant?.stock ?? 0,
          created_at: new Date()
        }
      });

      await tx.stockReservations.delete({
        where: { id: res.id }
      });

      releasedCount++;
    }).catch(err => {
      console.error(`Failed to release reservation ${res.id}:`, err);
    });
  }
  return releasedCount;
}

/**
 * Adjusts a variant's stock quantity directly (Add, Remove, Set, In/Out of Stock)
 * Concurrency-safe via Prisma interactive transaction and creates an audit inventory transaction.
 */
export async function adjustVariantStock(params: {
  variantId: number;
  mode: 'ADD' | 'REMOVE' | 'SET' | 'MARK_OUT_OF_STOCK' | 'MARK_IN_STOCK';
  quantity?: number;
  actorId?: number | null;
  reasonText?: string;
}): Promise<{ success: boolean; previousStock: number; newStock: number; delta: number; error?: string }> {
  return await prisma.$transaction(async (tx) => {
    const variant = await tx.productVariants.findUnique({
      where: { id: params.variantId },
      include: { product: true }
    });

    if (!variant) {
      return { success: false, previousStock: 0, newStock: 0, delta: 0, error: 'Product variant not found.' };
    }

    const currentStock = variant.stock ?? 0;
    let targetStock = currentStock;
    let delta = 0;
    let reasonType: InventoryTxnParams['reason'] = 'ADJUSTMENT';

    const qty = params.quantity !== undefined ? Math.floor(Number(params.quantity)) : 0;

    if (params.mode === 'ADD') {
      if (qty <= 0) {
        return { success: false, previousStock: currentStock, newStock: currentStock, delta: 0, error: 'Quantity to add must be greater than zero.' };
      }
      targetStock = currentStock + qty;
      delta = qty;
      reasonType = 'STOCK_ADDED';
    } else if (params.mode === 'REMOVE') {
      if (qty <= 0) {
        return { success: false, previousStock: currentStock, newStock: currentStock, delta: 0, error: 'Quantity to remove must be greater than zero.' };
      }
      if (qty > currentStock) {
        return { success: false, previousStock: currentStock, newStock: currentStock, delta: 0, error: `Cannot remove ${qty} units. Only ${currentStock} available in stock.` };
      }
      targetStock = currentStock - qty;
      delta = -qty;
      reasonType = 'STOCK_REMOVED';
    } else if (params.mode === 'SET') {
      if (qty < 0) {
        return { success: false, previousStock: currentStock, newStock: currentStock, delta: 0, error: 'Stock quantity cannot be negative.' };
      }
      targetStock = qty;
      delta = targetStock - currentStock;
      reasonType = 'STOCK_SET';
    } else if (params.mode === 'MARK_OUT_OF_STOCK') {
      targetStock = 0;
      delta = -currentStock;
      reasonType = 'MANUAL_OUT_OF_STOCK';
    } else if (params.mode === 'MARK_IN_STOCK') {
      if (qty <= 0) {
        return { success: false, previousStock: currentStock, newStock: currentStock, delta: 0, error: 'Please specify an actual positive quantity when marking item in stock.' };
      }
      targetStock = qty;
      delta = targetStock - currentStock;
      reasonType = 'MANUAL_IN_STOCK';
    }

    if (targetStock < 0) {
      return { success: false, previousStock: currentStock, newStock: currentStock, delta: 0, error: 'Resulting stock quantity cannot be negative.' };
    }

    // Update variant stock
    await tx.productVariants.update({
      where: { id: params.variantId },
      data: {
        stock: targetStock,
        updated_at: new Date()
      }
    });

    // Create immutable inventory transaction log
    await tx.inventoryTxns.create({
      data: {
        variant_id: params.variantId,
        delta: delta,
        reason: reasonType,
        order_id: null,
        actor_id: params.actorId || null,
        balance_after: targetStock,
        created_at: new Date()
      }
    });

    return {
      success: true,
      previousStock: currentStock,
      newStock: targetStock,
      delta
    };
  });
}
