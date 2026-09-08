import React, { useState } from 'react';
import type { SelectedHamperItem, PackagingOption } from './types';

interface HamperSummaryProps {
  selectedItems: SelectedHamperItem[];
  occasion: string;
  selectedPackaging: PackagingOption;
  onUpdateQty: (itemKey: string, qty: number) => void;
  onRemoveItem: (itemKey: string) => void;
  onProceed: () => void;
  canProceed: boolean;
  proceedLabel?: string;
}

export const HamperSummary: React.FC<HamperSummaryProps> = ({
  selectedItems,
  occasion,
  selectedPackaging,
  onUpdateQty,
  onRemoveItem,
  onProceed,
  canProceed,
  proceedLabel = 'CONTINUE'
}) => {
  const [isMobileExpanded, setIsMobileExpanded] = useState<boolean>(false);

  const totalItemCount = selectedItems.reduce((sum, i) => sum + i.quantity, 0);
  const itemsSubtotal = selectedItems.reduce((sum, i) => sum + (i.variant.sellingPrice * i.quantity), 0);
  const hamperTotal = itemsSubtotal + selectedPackaging.price;

  return (
    <aside className="hamper-summary-panel">
      {/* Mobile Collapsible Bar Header */}
      <div 
        className="mobile-summary-toggle-bar"
        onClick={() => setIsMobileExpanded(!isMobileExpanded)}
      >
        <div className="toggle-left">
          <span className="summary-title-sm">YOUR HAMPER</span>
          <span className="summary-cnt-sm">({totalItemCount} ITEMS)</span>
        </div>
        <div className="toggle-right">
          <span className="summary-price-sm">₹{hamperTotal.toLocaleString('en-IN')}</span>
          <span className="toggle-arrow">{isMobileExpanded ? '▲' : '▼'}</span>
        </div>
      </div>

      <div className={`summary-content-body ${isMobileExpanded ? 'mobile-open' : ''}`}>
        <div className="summary-header">
          <h2 className="summary-title">YOUR HAMPER</h2>
          <span className="summary-count-badge">
            {totalItemCount} ITEM{totalItemCount === 1 ? '' : 'S'}
          </span>
        </div>

        {occasion && (
          <div className="occasion-tag-row">
            <span className="lbl">Occasion:</span>
            <span className="val">{occasion}</span>
          </div>
        )}

        <div className="summary-items-list">
          {selectedItems.length === 0 ? (
            <div className="empty-summary-state">
              <p>Your hamper is waiting for its first piece.</p>
            </div>
          ) : (
            selectedItems.map(({ itemKey, product, variant, quantity }) => (
              <div key={itemKey} className="summary-item-row">
                <img
                  src={product.image || '/placeholder.png'}
                  alt={product.name}
                  className="summary-item-img"
                />
                <div className="summary-item-info">
                  <span className="summary-item-name">{product.name}</span>
                  <span className="summary-item-variant-label">{variant.label}</span>
                  <span className="summary-item-unit-price">₹{variant.sellingPrice.toLocaleString('en-IN')} each</span>
                  <div className="summary-qty-row">
                    <div className="mini-stepper">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(itemKey, quantity - 1)}
                        className="m-step-btn"
                        aria-label="Decrease quantity"
                      >
                        &minus;
                      </button>
                      <span className="m-step-val">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(itemKey, quantity + 1)}
                        className="m-step-btn"
                        aria-label="Increase quantity"
                      >
                        &plus;
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(itemKey)}
                      className="summary-remove-btn"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <span className="summary-line-price">
                  ₹{(variant.sellingPrice * quantity).toLocaleString('en-IN')}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="summary-divider"></div>

        {/* Pricing Breakdown */}
        <div className="summary-pricing-rows">
          <div className="price-row">
            <span>Items Subtotal</span>
            <span>₹{itemsSubtotal.toLocaleString('en-IN')}</span>
          </div>
          <div className="price-row">
            <span>Packaging ({selectedPackaging.name})</span>
            <span>₹{selectedPackaging.price.toLocaleString('en-IN')}</span>
          </div>

          <div className="summary-total-row">
            <span className="total-lbl">Total Hamper Value</span>
            <span className="total-val">₹{hamperTotal.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="summary-cta-box">
          <button
            type="button"
            disabled={!canProceed}
            onClick={onProceed}
            className="btn-summary-proceed"
          >
            {proceedLabel} &rarr;
          </button>
        </div>
      </div>
    </aside>
  );
};
