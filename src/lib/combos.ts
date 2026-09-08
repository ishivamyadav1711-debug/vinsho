import { db } from './db.js';

export interface ComponentDetail {
  componentVariantId: number;
  componentName: string;
  sku: string;
  requiredQty: number;
  stock: number;
  maxCombosPossible: number;
}

export interface ComboAvailability {
  comboVariantId: number;
  isBundle: boolean;
  hasComponents: boolean;
  maxSellableCombos: number;
  components: ComponentDetail[];
}

/**
 * Retrieves the raw component rows for a combo variant.
 */
export function getComboComponents(comboVariantId: number): any[] {
  return db.prepare(`
    SELECT ci.id as mapping_id, ci.combo_variant_id, ci.component_variant_id, ci.quantity,
           pv.sku as component_sku, pv.stock as component_stock, pv.selling_price as component_price,
           p.id as product_id, p.name as component_name
    FROM combo_items ci
    JOIN product_variants pv ON ci.component_variant_id = pv.id
    JOIN products p ON pv.product_id = p.id
    WHERE ci.combo_variant_id = ? AND p.deleted_at IS NULL
  `).all(comboVariantId) as any[];
}

/**
 * Computes maximum sellable combos derived from component physical inventory.
 * If combo has components: maxSellable = min_i floor(stock(C_i) / qty_i)
 * If combo has NO components: returns standalone variant stock balance.
 */
export function getComboAvailability(comboVariantId: number): ComboAvailability {
  const components = getComboComponents(comboVariantId);

  if (components.length === 0) {
    const variant = db.prepare('SELECT stock FROM product_variants WHERE id = ?').get(comboVariantId) as any;
    const standaloneStock = variant && variant.stock !== null && variant.stock !== undefined ? variant.stock : 100;
    return {
      comboVariantId,
      isBundle: false,
      hasComponents: false,
      maxSellableCombos: standaloneStock,
      components: []
    };
  }

  let maxSellableCombos = Infinity;
  const details: ComponentDetail[] = components.map((c) => {
    const stock = c.component_stock !== null && c.component_stock !== undefined ? c.component_stock : 0;
    const requiredQty = c.quantity;
    const maxCombosPossible = Math.floor(stock / requiredQty);

    if (maxCombosPossible < maxSellableCombos) {
      maxSellableCombos = maxCombosPossible;
    }

    return {
      componentVariantId: c.component_variant_id,
      componentName: c.component_name,
      sku: c.component_sku || `SKU-${c.component_variant_id}`,
      requiredQty,
      stock,
      maxCombosPossible
    };
  });

  if (maxSellableCombos === Infinity) maxSellableCombos = 0;
  maxSellableCombos = Math.max(0, maxSellableCombos);

  return {
    comboVariantId,
    isBundle: true,
    hasComponents: true,
    maxSellableCombos,
    components: details
  };
}

/**
 * Sets component mappings for a combo variant.
 * Enforces business constraints:
 * 1. Self-reference check (combo cannot contain itself).
 * 2. Nested combo check (component cannot be a combo, and combo cannot be used as a component elsewhere).
 * 3. Duplicate component check.
 * 4. Positive quantity check.
 */
export function setComboComponents(
  comboVariantId: number,
  components: Array<{ componentVariantId: number; quantity: number }>
): { success: boolean; error?: string } {
  const comboVar = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(comboVariantId) as any;
  if (!comboVar) {
    return { success: false, error: 'Combo variant not found in database.' };
  }

  const seen = new Set<number>();
  for (const c of components) {
    const compId = Number(c.componentVariantId);
    const qty = Number(c.quantity);

    if (compId === comboVariantId) {
      return { success: false, error: 'Self-reference rejected: A combo cannot contain itself as a component.' };
    }

    if (isNaN(qty) || qty <= 0) {
      return { success: false, error: 'Component quantity must be a positive integer greater than zero.' };
    }

    if (seen.has(compId)) {
      return { success: false, error: `Duplicate component variant ID ${compId} provided.` };
    }
    seen.add(compId);

    const compVar = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(compId) as any;
    if (!compVar) {
      return { success: false, error: `Component variant ID ${compId} does not exist.` };
    }

    // Prevent nested combo (component variant is already a combo variant with mappings)
    const isAlreadyCombo = db.prepare('SELECT COUNT(*) as cnt FROM combo_items WHERE combo_variant_id = ?').get(compId) as any;
    if (isAlreadyCombo && isAlreadyCombo.cnt > 0) {
      return { success: false, error: `Nested combos rejected: Component variant ID ${compId} is already a combo.` };
    }
  }

  // Prevent this combo variant from being converted if it's already used as a component in another combo
  const isUsedAsComponent = db.prepare('SELECT COUNT(*) as cnt FROM combo_items WHERE component_variant_id = ?').get(comboVariantId) as any;
  if (isUsedAsComponent && isUsedAsComponent.cnt > 0 && components.length > 0) {
    return { success: false, error: `Nested combos rejected: Variant ID ${comboVariantId} is already used as a component in another combo.` };
  }

  const now = new Date().toISOString();

  return db.transaction(() => {
    db.prepare('DELETE FROM combo_items WHERE combo_variant_id = ?').run(comboVariantId);

    const insertStmt = db.prepare(`
      INSERT INTO combo_items (combo_variant_id, component_variant_id, quantity, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const c of components) {
      insertStmt.run(comboVariantId, Number(c.componentVariantId), Number(c.quantity), now, now);
    }

    return { success: true };
  })();
}
