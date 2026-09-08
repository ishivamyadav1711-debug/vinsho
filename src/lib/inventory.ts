import { db } from './db.js';
import { getComboComponents } from './combos.js';

export interface InventoryTxnParams {
  variantId: number;
  delta: number; // Negative for sale/reservation, positive for restock/release
  reason: 'INITIAL_STOCK' | 'SALE' | 'RESERVATION' | 'RESERVATION_RELEASE' | 'RESTOCK' | 'ADJUSTMENT';
  orderId?: number | null;
  actorId?: number | null;
}

/**
 * Executes atomic conditional stock reduction.
 * Negative stock is impossible!
 */
export function atomicDecrementStock(params: InventoryTxnParams): { success: boolean; balanceAfter: number; error?: string } {
  return db.transaction(() => {
    const qtyToDecrement = Math.abs(params.delta);

    // Atomic conditional update
    const result = db.prepare(`
      UPDATE product_variants
      SET stock = stock - ?
      WHERE id = ? AND stock >= ?
    `).run(qtyToDecrement, params.variantId, qtyToDecrement);

    if (result.changes === 0) {
      const variant = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(params.variantId) as any;
      const currentStock = variant ? variant.stock : 0;
      return {
        success: false,
        balanceAfter: currentStock,
        error: `Insufficient stock balance (Requested: ${qtyToDecrement}, Available: ${currentStock}).`
      };
    }

    const updatedVariant = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(params.variantId) as any;
    const balanceAfter = updatedVariant ? updatedVariant.stock : 0;
    const now = new Date().toISOString();

    // Log immutable inventory transaction
    db.prepare(`
      INSERT INTO inventory_txns (variant_id, delta, reason, order_id, actor_id, balance_after, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      params.variantId,
      -qtyToDecrement,
      params.reason,
      params.orderId || null,
      params.actorId || null,
      balanceAfter,
      now
    );

    return { success: true, balanceAfter };
  })();
}

/**
 * Reserve stock for a cart during checkout session (expires in 15 mins).
 * Supports both standalone items and combo component reservations.
 */
export function reserveStock(cartId: number, variantId: number, qty: number): boolean {
  const expiryMs = 15 * 60 * 1000;
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + expiryMs).toISOString();

  const comboComponents = getComboComponents(variantId);

  return db.transaction(() => {
    if (comboComponents.length > 0) {
      for (const comp of comboComponents) {
        const compQty = comp.quantity * qty;
        const res = atomicDecrementStock({
          variantId: comp.component_variant_id,
          delta: -compQty,
          reason: 'RESERVATION'
        });
        if (!res.success) return false;

        db.prepare(`
          INSERT INTO stock_reservations (variant_id, cart_id, qty, expires_at, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(comp.component_variant_id, cartId, compQty, expiresAt, now);
      }
      return true;
    } else {
      const res = atomicDecrementStock({
        variantId,
        delta: -qty,
        reason: 'RESERVATION'
      });
      if (!res.success) return false;

      db.prepare(`
        INSERT INTO stock_reservations (variant_id, cart_id, qty, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(variantId, cartId, qty, expiresAt, now);

      return true;
    }
  })();
}

/**
 * Release expired stock reservations back into available inventory.
 */
export function releaseExpiredReservations(): number {
  const now = new Date().toISOString();
  const expired = db.prepare('SELECT * FROM stock_reservations WHERE expires_at < ?').all(now) as any[];

  let releasedCount = 0;
  for (const res of expired) {
    db.transaction(() => {
      db.prepare('UPDATE product_variants SET stock = stock + ? WHERE id = ?').run(res.qty, res.variant_id);
      const variant = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(res.variant_id) as any;

      db.prepare(`
        INSERT INTO inventory_txns (variant_id, delta, reason, order_id, actor_id, balance_after, created_at)
        VALUES (?, ?, 'RESERVATION_RELEASE', NULL, NULL, ?, ?)
      `).run(res.variant_id, res.qty, variant ? variant.stock : 0, now);

      db.prepare('DELETE FROM stock_reservations WHERE id = ?').run(res.id);
      releasedCount++;
    })();
  }
  return releasedCount;
}
