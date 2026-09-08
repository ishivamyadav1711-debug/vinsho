import React from 'react';
import type { SelectedHamperItem, PackagingOption, HamperPersonalizeState } from './types';

interface HamperPreviewProps {
  selectedItems: SelectedHamperItem[];
  occasion: string;
  selectedPackaging: PackagingOption;
  personalizeState: HamperPersonalizeState;
  onEdit: () => void;
  onAddToCart?: () => void;
}

export const HamperPreview: React.FC<HamperPreviewProps> = ({
  selectedItems,
  occasion,
  selectedPackaging,
  personalizeState,
  onEdit,
  onAddToCart
}) => {
  const totalItemCount = selectedItems.reduce((sum, i) => sum + i.quantity, 0);
  const productsSubtotal = selectedItems.reduce((sum, i) => sum + (i.variant.sellingPrice * i.quantity), 0);
  const packagingCost = selectedPackaging ? selectedPackaging.price : 0;
  const grandTotal = productsSubtotal + packagingCost;

  return (
    <div className="hamper-preview-root">
      <div className="step-head-block">
        <h2 className="step-title">YOUR VINSHO HAMPER</h2>
        <p className="step-sub">A curated luxury arrangement, handcrafted for unforgettable gifting moments.</p>
      </div>

      <div className="preview-luxury-card">
        {/* Top Header Banner */}
        <div className="preview-header-bar">
          <div className="header-brand-tag">
            <span className="brand-dot"></span>
            <span>VINSHO LUXURY GIFTING</span>
          </div>

          <div className="header-meta-tags">
            {occasion && <span className="occ-pill">OCCASION: {occasion.toUpperCase()}</span>}
            <span className="count-pill">{totalItemCount} ITEM{totalItemCount === 1 ? '' : 'S'}</span>
          </div>
        </div>

        {/* Empty State */}
        {selectedItems.length === 0 ? (
          <div className="preview-empty-box">
            <h3 className="empty-title">NO PRODUCTS SELECTED</h3>
            <p className="empty-sub">Your hamper requires at least 1 product piece before previewing.</p>
            <button type="button" onClick={onEdit} className="btn-edit-hamper">
              &larr; Return to Product Selection
            </button>
          </div>
        ) : (
          <div className="preview-main-body">
            {/* SECTION 1: Product Showcase Gallery */}
            <div className="preview-showcase-section">
              <h3 className="section-label">SELECTED PRODUCTS</h3>

              <div className="showcase-grid">
                {selectedItems.map(({ itemKey, product, variant, quantity }) => (
                  <div key={itemKey} className="showcase-item-card">
                    <div className="showcase-img-box">
                      <img
                        src={product.image || '/placeholder.png'}
                        alt={product.name}
                        className="showcase-img"
                      />
                      <span className="showcase-qty-badge">× {quantity}</span>
                    </div>

                    <div className="showcase-details">
                      <h4 className="showcase-item-title">{product.name}</h4>
                      <span className="showcase-variant-lbl">{variant.label}</span>
                      <span className="showcase-price-val">
                        ₹{(variant.sellingPrice * quantity).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 2: Personalization Card & Packaging */}
            <div className="preview-personal-section">
              {/* Printed Card Mockup */}
              <div className="luxury-card-mockup">
                <div className="card-inner-frame">
                  <div className="card-top-seal">VINSHO CREATIONS</div>
                  
                  <div className="card-to-line">
                    <span className="label-txt">To:</span>
                    <span className="val-txt">{personalizeState.recipientName.trim() || 'Dear Friend'}</span>
                  </div>

                  <div className="card-message-body">
                    "{personalizeState.message.trim() || 'Wishing you joy, warmth, and beautiful moments.'}"
                  </div>

                  <div className="card-from-line">
                    <span className="label-txt">From:</span>
                    <span className="val-txt">{personalizeState.senderName.trim() || 'Warm regards'}</span>
                  </div>
                </div>
              </div>

              {/* Packaging Selection Info */}
              <div className="packaging-preview-box">
                <div className="pkg-icon-box">🎁</div>
                <div className="pkg-info-txt">
                  <span className="pkg-title-lbl">PACKAGING</span>
                  <span className="pkg-name-val">{selectedPackaging.name}</span>
                  <span className="pkg-desc-txt">{selectedPackaging.description}</span>
                </div>
                <span className="pkg-cost-val">+ ₹{packagingCost}</span>
              </div>
            </div>

            {/* SECTION 3: Financial Summary Table */}
            <div className="preview-summary-section">
              <h3 className="section-label">ORDER BREAKDOWN</h3>

              <div className="price-table">
                <div className="price-table-row">
                  <span className="lbl-txt">Products ({totalItemCount} Items)</span>
                  <span className="val-txt">₹{productsSubtotal.toLocaleString('en-IN')}</span>
                </div>

                <div className="price-table-row">
                  <span className="lbl-txt">Packaging ({selectedPackaging.name})</span>
                  <span className="val-txt">₹{packagingCost.toLocaleString('en-IN')}</span>
                </div>

                <div className="price-table-divider"></div>

                <div className="price-table-row total-row">
                  <span className="total-lbl">TOTAL</span>
                  <span className="total-val">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Actions Bar */}
        <div className="preview-footer-actions">
          <button
            type="button"
            onClick={onEdit}
            className="btn-edit-hamper"
          >
            EDIT HAMPER
          </button>

          <button
            type="button"
            onClick={() => {
              if (onAddToCart) {
                onAddToCart();
              }
            }}
            disabled={selectedItems.length === 0}
            className="btn-add-cart-cta"
          >
            ENQUIRE VIA WHATSAPP &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
