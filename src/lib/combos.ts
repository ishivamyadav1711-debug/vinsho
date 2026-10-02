import { prisma } from './db.js';

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
export async function getComboComponents(comboVariantId: number): Promise<any[]> {
  const items = await prisma.comboItems.findMany({
    where: {
      combo_variant_id: comboVariantId,
      component_variant: {
        product: {
          deleted_at: null
        }
      }
    },
    include: {
      component_variant: {
        include: {
          product: true
        }
      }
    }
  });

  return items.map((ci) => ({
    mapping_id: ci.id,
    combo_variant_id: ci.combo_variant_id,
    component_variant_id: ci.component_variant_id,
    quantity: ci.quantity,
    component_sku: ci.component_variant.sku,
    component_stock: ci.component_variant.stock,
    component_price: ci.component_variant.selling_price ? Number(ci.component_variant.selling_price) : 0,
    product_id: ci.component_variant.product.id,
    component_name: ci.component_variant.product.name
  }));
}

/**
 * Computes maximum sellable combos derived from component physical inventory.
 * If combo has components: maxSellable = min_i floor(stock(C_i) / qty_i)
 * If combo has NO components: returns standalone variant stock balance.
 */
export async function getComboAvailability(comboVariantId: number): Promise<ComboAvailability> {
  const components = await getComboComponents(comboVariantId);

  if (components.length === 0) {
    const variant = await prisma.productVariants.findUnique({
      where: { id: comboVariantId }
    });
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
export async function setComboComponents(
  comboVariantId: number,
  components: Array<{ componentVariantId: number; quantity: number }>
): Promise<{ success: boolean; error?: string }> {
  const comboVar = await prisma.productVariants.findUnique({
    where: { id: comboVariantId }
  });

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

    const compVar = await prisma.productVariants.findUnique({
      where: { id: compId }
    });
    if (!compVar) {
      return { success: false, error: `Component variant ID ${compId} does not exist.` };
    }

    // Prevent nested combo (component variant is already a combo variant with mappings)
    const isAlreadyCombo = await prisma.comboItems.count({
      where: { combo_variant_id: compId }
    });
    if (isAlreadyCombo > 0) {
      return { success: false, error: `Nested combos rejected: Component variant ID ${compId} is already a combo.` };
    }
  }

  // Prevent this combo variant from being converted if it's already used as a component in another combo
  const isUsedAsComponent = await prisma.comboItems.count({
    where: { component_variant_id: comboVariantId }
  });
  if (isUsedAsComponent > 0 && components.length > 0) {
    return { success: false, error: `Nested combos rejected: Variant ID ${comboVariantId} is already used as a component in another combo.` };
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.comboItems.deleteMany({
      where: { combo_variant_id: comboVariantId }
    });

    if (components.length > 0) {
      await tx.comboItems.createMany({
        data: components.map(c => ({
          combo_variant_id: comboVariantId,
          component_variant_id: Number(c.componentVariantId),
          quantity: Number(c.quantity),
          created_at: now,
          updated_at: now
        }))
      });
    }
  });

  return { success: true };
}
