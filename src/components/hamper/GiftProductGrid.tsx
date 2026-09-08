import React, { useState, useMemo } from 'react';
import type { GiftProduct, ProductVariant, BudgetOption } from './types';
import { GiftProductCard } from './GiftProductCard';

interface GiftProductGridProps {
  products: GiftProduct[];
  selectedItemsMap: Record<string, number>;
  currentSubtotal: number;
  selectedBudgetId: string;
  onSelectBudget: (budgetId: string) => void;
  onAddProduct: (product: GiftProduct, variant: ProductVariant) => void;
  onUpdateQty: (itemKey: string, qty: number) => void;
}

export const MIN_HAMPER_ITEMS = 2;
export const MAX_HAMPER_ITEMS = 8;

export const GiftProductGrid: React.FC<GiftProductGridProps> = ({
  products,
  selectedItemsMap,
  currentSubtotal,
  selectedBudgetId,
  onSelectBudget,
  onAddProduct,
  onUpdateQty
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewProduct, setPreviewProduct] = useState<GiftProduct | null>(null);

  // Total selected items in hamper count
  const totalSelectedCount = useMemo(() => {
    return Object.values(selectedItemsMap).reduce((sum, q) => sum + q, 0);
  }, [selectedItemsMap]);

  const isMaxReached = totalSelectedCount >= MAX_HAMPER_ITEMS;

  // Filter gift-eligible products (isPurchasable !== false and giftEligible !== false)
  const giftEligibleProducts = useMemo(() => {
    return products.filter(p => p.isPurchasable !== false && p.giftEligible !== false);
  }, [products]);

  // Top-level categories for tabs: ALL, GIFTING, HOME DECOR, HOME FURNISHING
  const topCategories = useMemo(() => {
    const counts: Record<string, number> = {
      'all': giftEligibleProducts.length,
      'gifting-collection': 0,
      'home-decor': 0,
      'home-furnishing': 0
    };

    giftEligibleProducts.forEach(p => {
      const key = p.collectionKey || '';
      if (key && counts[key] !== undefined) {
        counts[key]++;
      }
    });

    return [
      { key: 'all', name: 'ALL', count: counts['all'] },
      { key: 'gifting-collection', name: 'GIFTING', count: counts['gifting-collection'] },
      { key: 'home-decor', name: 'HOME DECOR', count: counts['home-decor'] },
      { key: 'home-furnishing', name: 'HOME FURNISHING', count: counts['home-furnishing'] }
    ];
  }, [giftEligibleProducts]);

  const activeBudgetOption = useMemo(() => {
    return BUDGET_OPTIONS.find(b => b.id === selectedBudgetId) || BUDGET_OPTIONS[0];
  }, [selectedBudgetId]);

  const targetBudgetMax = activeBudgetOption.maxPrice || (activeBudgetOption.minPrice > 0 ? activeBudgetOption.minPrice * 1.5 : null);
  const budgetPercentage = targetBudgetMax ? Math.min(100, Math.round((currentSubtotal / targetBudgetMax) * 100)) : 0;

  // Filtered products based on category tab, search query & budget range
  const filteredProducts = useMemo(() => {
    return giftEligibleProducts.filter(p => {
      const matchCat = activeCategory === 'all' || p.collectionKey === activeCategory;
      const matchQuery = !searchQuery.trim() || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.subcategory || '').toLowerCase().includes(searchQuery.toLowerCase());

      let matchBudget = true;
      if (selectedBudgetId !== 'all') {
        const prodPrice = p.price || 0;
        if (activeBudgetOption.minPrice && prodPrice < activeBudgetOption.minPrice) matchBudget = false;
        if (activeBudgetOption.maxPrice && prodPrice > activeBudgetOption.maxPrice) matchBudget = false;
      }

      return matchCat && matchQuery && matchBudget;
    });
  }, [giftEligibleProducts, activeCategory, searchQuery, selectedBudgetId, activeBudgetOption]);

  return (
    <div className="gift-grid-container">
      {/* Header Row & Search Box */}
      <div className="grid-head-row">
        <div>
          <h2 className="step-title">SELECT PRODUCTS FOR YOUR HAMPER</h2>
          <p className="step-sub">Mix handcrafted home decor, furnishings &amp; gifting pieces (Min {MIN_HAMPER_ITEMS}, Max {MAX_HAMPER_ITEMS} items).</p>
        </div>

        <div className="grid-search-box">
          <input
            type="text"
            placeholder="Search products by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Top-Level Collection Category Tabs (ALL | GIFTING | HOME DECOR | HOME FURNISHING) */}
      <div className="hamper-top-cat-pills" role="tablist" aria-label="Hamper Product Collections">
        {topCategories.map(cat => (
          <button
            key={cat.key}
            type="button"
            role="tab"
            aria-selected={activeCategory === cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`cat-pill-btn ${activeCategory === cat.key ? 'active' : ''}`}
          >
            <span>{cat.name}</span>
            <span className="pill-badge">{cat.count}</span>
          </button>
        ))}
      </div>

      {/* Max Limit Warning Banner */}
      {isMaxReached && (
        <div className="hamper-max-warning-banner" role="alert">
          <span>⚠️ Your hamper is full (Maximum {MAX_HAMPER_ITEMS} products reached). Remove an item to add another product.</span>
        </div>
      )}

      {/* Budget Progress Bar & Target Display */}
      <div className="budget-progress-banner">
        <div className="budget-progress-head">
          <span className="budget-lbl">HAMPER VALUE vs TARGET BUDGET</span>
          <span className="budget-val-txt">
            {targetBudgetMax ? (
              <>₹{currentSubtotal.toLocaleString('en-IN')} / ₹{targetBudgetMax.toLocaleString('en-IN')}</>
            ) : (
              <>Current Total: ₹{currentSubtotal.toLocaleString('en-IN')}</>
            )}
          </span>
        </div>
        {targetBudgetMax && (
          <div className="budget-track">
            <div 
              className={`budget-fill ${currentSubtotal > targetBudgetMax ? 'exceeded' : ''}`}
              style={{ width: `${budgetPercentage}%` }}
            />
          </div>
        )}
      </div>

      <div className="gift-grid-layout">
        {/* LEFT: Target Budget Filter */}
        <aside className="gift-filters-sidebar">
          <div className="filter-group-block">
            <h3 className="filter-heading">TARGET BUDGET</h3>
            {BUDGET_OPTIONS.map(b => (
              <button
                key={b.id}
                type="button"
                onClick={() => onSelectBudget(b.id)}
                className={`filter-btn ${selectedBudgetId === b.id ? 'active' : ''}`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </aside>

        {/* RIGHT: Product Grid */}
        <main className="gift-products-main">
          {filteredProducts.length === 0 ? (
            <div className="no-products-card">
              <p>No products match your current budget &amp; category filter.</p>
              <button 
                type="button" 
                onClick={() => { setActiveCategory('all'); onSelectBudget('all'); setSearchQuery(''); }}
                className="btn-reset-filters"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="gift-cards-grid">
              {filteredProducts.map(prod => {
                const defaultVariantId = prod.variants && prod.variants.length > 0 ? prod.variants[0].id : 0;
                const defaultItemKey = `${prod.slug}_${defaultVariantId}`;
                const qtyInHamper = selectedItemsMap[defaultItemKey] || 0;

                return (
                  <GiftProductCard
                    key={prod.slug}
                    product={prod}
                    quantityInHamper={qtyInHamper}
                    isMaxReached={isMaxReached}
                    onAdd={onAddProduct}
                    onUpdateQty={onUpdateQty}
                    onQuickView={(p) => setPreviewProduct(p)}
                  />
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* QUICK VIEW / PRODUCT DETAIL PREVIEW MODAL */}
      {previewProduct && (
        <div className="quickview-modal-backdrop" onClick={() => setPreviewProduct(null)}>
          <div className="quickview-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className="quickview-modal-close"
              onClick={() => setPreviewProduct(null)}
              aria-label="Close product preview"
            >
              &times;
            </button>

            <div className="quickview-content-grid">
              <div className="quickview-img-col">
                <img 
                  src={previewProduct.image || '/placeholder.png'} 
                  alt={previewProduct.name} 
                  className="quickview-prod-img" 
                />
              </div>

              <div className="quickview-info-col">
                <span className="quickview-cat-tag">
                  {previewProduct.collection || previewProduct.subcategory || 'VINSHO LUXURY'}
                </span>
                <h3 className="quickview-title">{previewProduct.name}</h3>
                <p className="quickview-price">₹{(previewProduct.price || 0).toLocaleString('en-IN')}</p>

                {previewProduct.tagline && (
                  <p className="quickview-tagline"><em>{previewProduct.tagline}</em></p>
                )}

                <p className="quickview-desc">{previewProduct.description}</p>

                {/* Available Variants */}
                {previewProduct.variants && previewProduct.variants.length > 1 && (
                  <div className="quickview-variants-block">
                    <label className="qv-label">Available Variants / Sizes:</label>
                    <div className="qv-variant-chips">
                      {previewProduct.variants.map(v => (
                        <span key={v.id} className="qv-vchip">
                          {v.label} — ₹{v.sellingPrice.toLocaleString('en-IN')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="quickview-actions">
                  <button
                    type="button"
                    disabled={isMaxReached}
                    onClick={() => {
                      const variant = (previewProduct.variants && previewProduct.variants.length > 0)
                        ? previewProduct.variants[0]
                        : {
                            id: 0,
                            productId: previewProduct.id || 0,
                            sku: `SKU-${previewProduct.slug}`,
                            sellingPrice: previewProduct.price || 0,
                            mrp: null,
                            stock: 100,
                            label: 'Standard Option'
                          };
                      onAddProduct(previewProduct, variant);
                      setPreviewProduct(null);
                    }}
                    className="btn-add-hamper-qv"
                  >
                    {isMaxReached ? 'HAMPER FULL (8 MAX)' : 'ADD TO HAMPER →'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
