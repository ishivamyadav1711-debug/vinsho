import React, { useState } from 'react';
import type { GiftProduct, ProductVariant } from './types';

interface GiftProductCardProps {
  product: GiftProduct;
  quantityInHamper: number;
  selectedVariantId?: number | string;
  isMaxReached?: boolean;
  onAdd: (product: GiftProduct, variant: ProductVariant) => void;
  onUpdateQty: (itemKey: string, qty: number) => void;
  onQuickView?: (product: GiftProduct) => void;
}

export const GiftProductCard: React.FC<GiftProductCardProps> = ({
  product,
  quantityInHamper,
  selectedVariantId,
  isMaxReached = false,
  onAdd,
  onUpdateQty,
  onQuickView
}) => {
  const variants = product.variants && product.variants.length > 0
    ? product.variants
    : [{
        id: 0,
        productId: product.id || 0,
        sku: `SKU-${product.slug}`,
        sellingPrice: product.price || 0,
        mrp: null,
        stock: 100,
        label: 'Standard Variant'
      }];

  const [activeVariantId, setActiveVariantId] = useState<number | string>(
    selectedVariantId || variants[0].id
  );

  const activeVariant = variants.find(v => v.id === activeVariantId) || variants[0];
  const itemKey = `${product.slug}_${activeVariant.id}`;
  const isAdded = quantityInHamper > 0;
  const displayPrice = `₹${activeVariant.sellingPrice.toLocaleString('en-IN')}`;

  const handleVariantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const numVal = Number(val);
    const newId = isNaN(numVal) ? val : numVal;
    setActiveVariantId(newId);
  };

  return (
    <div className={`gift-prod-card ${isAdded ? 'added' : ''}`}>
      <div 
        className="card-img-wrapper" 
        onClick={() => onQuickView && onQuickView(product)}
        style={{ cursor: 'pointer' }}
        title="Click to preview details"
      >
        <img
          src={product.image || '/placeholder.png'}
          alt={product.name}
          loading="lazy"
          className="card-prod-img"
        />
        <button 
          type="button" 
          className="card-quickview-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (onQuickView) onQuickView(product);
          }}
        >
          🔍 Quick View
        </button>
      </div>

      <div className="card-body-block">
        <h3 
          className="card-prod-name"
          onClick={() => onQuickView && onQuickView(product)}
          style={{ cursor: 'pointer' }}
        >
          {product.name}
        </h3>

        {/* Variant Dropdown if multiple variants exist */}
        {variants.length > 1 && (
          <div className="variant-select-wrapper">
            <select
              id={`variant-select-${product.slug}`}
              value={activeVariantId}
              onChange={handleVariantChange}
              className="card-variant-select"
            >
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} — ₹{v.sellingPrice.toLocaleString('en-IN')}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="card-price-row">
          <span className="card-prod-price">{displayPrice}</span>
          {activeVariant.mrp && activeVariant.mrp > activeVariant.sellingPrice && (
            <span className="card-mrp-price">₹{activeVariant.mrp.toLocaleString('en-IN')}</span>
          )}
        </div>

        {!isAdded ? (
          <button
            type="button"
            onClick={() => onAdd(product, activeVariant)}
            className="btn-add-hamper"
            disabled={isMaxReached}
            title={isMaxReached ? 'Hamper is full (8 items max)' : 'Add to Hamper'}
          >
            {isMaxReached ? 'HAMPER FULL' : 'ADD TO HAMPER'}
          </button>
        ) : (
          <div className="added-qty-controls">
            <span className="added-badge">ADDED ✓</span>
            <div className="card-stepper">
              <button
                type="button"
                onClick={() => onUpdateQty(itemKey, quantityInHamper - 1)}
                className="step-btn"
                aria-label="Decrease quantity"
              >
                &minus;
              </button>
              <span className="step-val">{quantityInHamper}</span>
              <button
                type="button"
                onClick={() => !isMaxReached && onUpdateQty(itemKey, quantityInHamper + 1)}
                className="step-btn"
                disabled={isMaxReached}
                aria-label="Increase quantity"
              >
                &plus;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
