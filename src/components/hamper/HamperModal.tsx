import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { GiftProduct, ProductVariant, SelectedHamperItem, PackagingOption, HamperPersonalizeState } from './types';
import { CurateHamperWizard } from './curate/CurateHamperWizard';
import { GiftProductGrid } from './GiftProductGrid';
import { HamperPersonalization } from './HamperPersonalization';
import { HamperPreview } from './HamperPreview';
import { getLocalCartState, addLocalCartItem, openCartDrawer, triggerToast, saveLocalCartState } from '../../scripts/cart-store';

interface HamperModalProps {
  products: GiftProduct[];
  autoOpenDelay?: number;
}

const STORAGE_CLOSED_KEY = 'vinsho_hamper_modal_closed_v1';
const DRAFT_STORAGE_KEY = 'vinsho_hamper_modal_draft_v1';

const PACKAGING_OPTIONS: PackagingOption[] = [
  {
    id: 'box_signature_cork',
    name: 'Signature Cork Box',
    price: 350,
    description: 'Eco-conscious sustainable cork veneer presentation box with magnetic clasp.'
  },
  {
    id: 'basket_artisanal_jute',
    name: 'Artisanal Jute Basket',
    price: 450,
    description: 'Handwoven natural jute basket lined with organic cotton and botanical accents.'
  },
  {
    id: 'box_velvet_maroon',
    name: 'Velvet & Gold Chest',
    price: 650,
    description: 'Luxurious deep maroon velvet chest with foil-embossed VINSHO seal.'
  }
];

export const HamperModal: React.FC<HamperModalProps> = ({ products }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'manual' | 'intro'>('manual');
  const [modalStep, setModalStep] = useState<'products' | 'personalize' | 'preview'>('products');

  // Global trigger listener for data-open-hamper-modal or custom event
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOpenEvent = () => {
      setIsOpen(true);
    };

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const openBtn = target.closest('[data-open-hamper-modal]') || target.closest('a[href*="/gifting/create-your-hamper"]');
      if (openBtn) {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('vinsho:open-hamper-modal', handleOpenEvent);
    document.addEventListener('click', handleGlobalClick);

    return () => {
      window.removeEventListener('vinsho:open-hamper-modal', handleOpenEvent);
      document.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isOpen) {
      document.body.classList.add('v-hamper-modal-active');
    } else {
      document.body.classList.remove('v-hamper-modal-active');
    }
    return () => {
      document.body.classList.remove('v-hamper-modal-active');
    };
  }, [isOpen]);

  // ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleCloseModal = () => {
    setIsOpen(false);
    try {
      sessionStorage.setItem(STORAGE_CLOSED_KEY, 'true');
    } catch {
      // Ignore storage error
    }
  };

  // Selected items map for quick quantity lookup
  const selectedItemsMap = useMemo(() => {
    const map: Record<string, number> = {};
    selectedItems.forEach(item => {
      map[item.itemKey] = item.quantity;
    });
    return map;
  }, [selectedItems]);

  const currentSubtotal = useMemo(() => {
    return selectedItems.reduce((sum, i) => sum + (i.variant.sellingPrice * i.quantity), 0);
  }, [selectedItems]);

  const selectedPackaging = useMemo(() => {
    return PACKAGING_OPTIONS.find(p => p.id === personalizeState.packagingId) || PACKAGING_OPTIONS[0];
  }, [personalizeState.packagingId]);

  // Product Selection Handlers
  const handleAddProduct = (product: GiftProduct, variant: ProductVariant) => {
    const itemKey = `${product.slug}_${variant.id}`;
    setSelectedItems(prev => {
      const existingIdx = prev.findIndex(i => i.itemKey === itemKey);
      if (existingIdx > -1) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + 1
        };
        return next;
      }
      return [
        ...prev,
        {
          itemKey,
          productId: product.id,
          productSlug: product.slug,
          product,
          variantId: variant.id,
          variant,
          quantity: 1
        }
      ];
    });
  };

  const handleUpdateQty = (itemKey: string, qty: number) => {
    setSelectedItems(prev => {
      if (qty <= 0) {
        return prev.filter(i => i.itemKey !== itemKey);
      }
      return prev.map(i => i.itemKey === itemKey ? { ...i, quantity: qty } : i);
    });
  };

  const handleRemoveItem = (itemKey: string) => {
    handleUpdateQty(itemKey, 0);
  };

  const handleUpdatePersonalize = (updated: Partial<HamperPersonalizeState>) => {
    setPersonalizeState(prev => ({ ...prev, ...updated }));
  };

  // Transfer from Curator Wizard into Modal Flow
  const handleTransferFromCurator = (items: SelectedHamperItem[], targetStep: 'products' | 'personalize') => {
    setSelectedItems(items);
    setModalMode('manual');
    setModalStep(targetStep);
  };

  // ADD HAMPER TO CART INTEGRATION
  const handleAddToCart = async () => {
    if (selectedItems.length === 0) {
      setValidationError('Please select at least 1 product before adding your hamper to cart.');
      return;
    }

    setIsValidating(true);
    setValidationError(null);

    try {
      const hamperId = `hamper_${Date.now()}`;
      const payloadItems = selectedItems.map(i => ({
        productId: i.productId,
        productSlug: i.productSlug,
        variantId: i.variantId,
        quantity: i.quantity,
        unitPrice: i.variant.sellingPrice,
        productName: i.product.name,
        variantLabel: i.variant.label,
        image: i.product.image
      }));

      const rawPayload = {
        hamperId,
        occasion: selectedOccasion || 'Special Occasion',
        items: payloadItems,
        packaging: {
          id: selectedPackaging.id,
          name: selectedPackaging.name,
          price: selectedPackaging.price
        },
        recipientName: personalizeState.recipientName.trim(),
        senderName: personalizeState.senderName.trim(),
        message: personalizeState.message.trim(),
        selectedBudgetId,
        subtotal: currentSubtotal,
        packagingCost: selectedPackaging.price,
        total: currentSubtotal + selectedPackaging.price
      };

      // Server inventory & pricing validation API
      const res = await fetch('/api/hamper/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rawPayload)
      });

      const data = await res.json();

      if (!data.success) {
        setValidationError(data.error || 'Failed to validate hamper items against available inventory.');
        setIsValidating(false);
        return;
      }

      const verifiedConfig = data.validatedConfig;
      const totalItemCount = verifiedConfig.items.reduce((s: number, i: any) => s + i.quantity, 0);

      const cartItemName = `CUSTOM GIFTING HAMPER (${verifiedConfig.occasion.toUpperCase()})`;
      const summaryText = `${totalItemCount} ITEMS: ${verifiedConfig.items.map((i: any) => `${i.productName} × ${i.quantity}`).join(', ')}`;
      const primaryImage = verifiedConfig.items[0]?.image || '/placeholder.png';

      addLocalCartItem({
        id: hamperId,
        slug: 'gifting-hamper',
        name: cartItemName,
        price: data.verifiedTotal,
        image: primaryImage,
        quantity: 1,
        variantTitle: summaryText,
        hamperData: verifiedConfig
      });

      triggerToast(`Added ${cartItemName} to your Bag!`);
      openCartDrawer();
      handleCloseModal();
    } catch (err) {
      console.error('Add hamper to cart error:', err);
      setValidationError('Server connection failed. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const totalSelectedCount = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      {/* Main Popup Modal Overlay */}
      {isOpen && (
        <div className="v-hamper-modal-backdrop" onClick={handleCloseModal}>
          <div
            className="v-hamper-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="VINSHO Gifting Concierge — Create Your Own Hamper"
          >
            {/* Close Button */}
            <button
              type="button"
              className="v-hamper-modal-close"
              onClick={handleCloseModal}
              aria-label="Close Hamper Modal"
            >
              &times;
            </button>

            {/* SCREEN 1: INTRO CONCIERGE SCREEN */}
            {modalMode === 'intro' && (
              <div className="v-hamper-intro-screen">
                <div className="v-intro-visual-col">
                  <span className="v-badge-tag">VINSHO GIFTING CONCIERGE</span>
                  <h2 className="v-intro-heading">CREATE YOUR OWN HAMPER</h2>
                  <p className="v-intro-quote">
                    “Select your favourite pieces and build a luxury hamper that feels uniquely personal.”
                  </p>
                  <div className="v-intro-features">
                    <div className="feat-chip">✦ Handcrafted Home Décor &amp; Candles</div>
                    <div className="feat-chip">✦ Custom Gift Note &amp; Packaging</div>
                    <div className="feat-chip">✦ All-India Express Delivery</div>
                  </div>
                </div>

                <div className="v-intro-options-col">
                  <h3 className="v-options-title">Begin Crafting Your Hamper</h3>
                  <div className="v-options-stack">
                    <button
                      type="button"
                      className="v-btn-intro-primary"
                      onClick={() => {
                        setModalMode('manual');
                        setModalStep('products');
                      }}
                    >
                      <span>CREATE YOUR OWN HAMPER</span>
                      <span className="arrow">&rarr;</span>
                    </button>
                  </div>

                  <p className="v-intro-footnote">
                    Custom hampers start with pure handcrafted items &amp; eco-luxury packaging.
                  </p>
                </div>
              </div>
            )}

            {/* SCREEN 2: CURATED RECOMMENDATION WIZARD */}
            {modalMode === 'curated' && (
              <div className="v-hamper-modal-body">
                <CurateHamperWizard
                  products={products}
                  onTransferToBuilder={handleTransferFromCurator}
                  onCancel={() => setModalMode('intro')}
                />
              </div>
            )}

            {/* SCREEN 3: MANUAL STEP-BY-STEP BUILDER */}
            {modalMode === 'manual' && (
              <div className="v-hamper-modal-body">
                {/* Modal Sub-Header & Progress */}
                <div className="v-modal-step-header">
                  <div className="v-modal-top-nav">
                    <button
                      type="button"
                      className="v-btn-back-intro"
                      onClick={() => setModalMode('intro')}
                    >
                      &larr; Return to Options
                    </button>
                    
                    <div className="v-modal-stepper">
                      <button
                        type="button"
                        className={`v-mstep ${modalStep === 'products' ? 'active' : ''}`}
                        onClick={() => setModalStep('products')}
                      >
                        1. Select Items ({totalSelectedCount})
                      </button>
                      <span className="step-sep">&rsaquo;</span>
                      <button
                        type="button"
                        className={`v-mstep ${modalStep === 'personalize' ? 'active' : ''}`}
                        onClick={() => {
                          if (selectedItems.length > 0) setModalStep('personalize');
                        }}
                        disabled={selectedItems.length === 0}
                      >
                        2. Personalize
                      </button>
                      <span className="step-sep">&rsaquo;</span>
                      <button
                        type="button"
                        className={`v-mstep ${modalStep === 'preview' ? 'active' : ''}`}
                        onClick={() => {
                          if (selectedItems.length > 0) setModalStep('preview');
                        }}
                        disabled={selectedItems.length === 0}
                      >
                        3. Review
                      </button>
                    </div>
                  </div>

                  {validationError && (
                    <div className="v-modal-error-bar">
                      <span>⚠️ {validationError}</span>
                      <button type="button" onClick={() => setValidationError(null)}>&times;</button>
                    </div>
                  )}
                </div>

                {/* Step 1: Products */}
                {modalStep === 'products' && (
                  <div className="v-modal-step-pane">
                    <div className="v-modal-live-bar">
                      <div>
                        <span className="bar-lbl">YOUR HAMPER:</span>
                        <strong className="bar-cnt"> {totalSelectedCount} items selected</strong>
                      </div>
                      <div>
                        <span className="bar-lbl">SUBTOTAL: </span>
                        <strong className="bar-price">₹{currentSubtotal.toLocaleString('en-IN')}</strong>
                      </div>
                      <button
                        type="button"
                        className="v-btn-next-step"
                        disabled={selectedItems.length === 0}
                        onClick={() => setModalStep('personalize')}
                      >
                        CONTINUE TO PERSONALIZE &rarr;
                      </button>
                    </div>

                    <GiftProductGrid
                      products={products}
                      selectedItemsMap={selectedItemsMap}
                      currentSubtotal={currentSubtotal}
                      selectedBudgetId={selectedBudgetId}
                      onSelectBudget={setSelectedBudgetId}
                      onAddProduct={handleAddProduct}
                      onUpdateQty={handleUpdateQty}
                    />
                  </div>
                )}

                {/* Step 2: Personalization */}
                {modalStep === 'personalize' && (
                  <div className="v-modal-step-pane">
                    <HamperPersonalization
                      personalizeState={personalizeState}
                      packagingOptions={PACKAGING_OPTIONS}
                      onChangePersonalize={handleUpdatePersonalize}
                      onNext={() => setModalStep('preview')}
                      onBack={() => setModalStep('products')}
                    />
                  </div>
                )}

                {/* Step 3: Review & Add to Cart */}
                {modalStep === 'preview' && (
                  <div className="v-modal-step-pane">
                    <HamperPreview
                      selectedItems={selectedItems}
                      occasion={selectedOccasion}
                      selectedPackaging={selectedPackaging}
                      personalizeState={personalizeState}
                      onEdit={() => setModalStep('products')}
                      onAddToCart={handleAddToCart}
                    />
                  </div>
                )}

              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
};
