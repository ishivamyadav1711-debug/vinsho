import React, { useState, useEffect, useMemo } from 'react';
import type { GiftProduct, ProductVariant, SelectedHamperItem, PackagingOption, HamperPersonalizeState, HamperStep } from './types';
import { HamperProgress } from './HamperProgress';
import { OccasionSelector } from './OccasionSelector';
import { GiftProductGrid } from './GiftProductGrid';
import { HamperSummary } from './HamperSummary';
import { HamperPersonalization } from './HamperPersonalization';
import { HamperPreview } from './HamperPreview';
import { CurateHamperWizard } from './curate/CurateHamperWizard';

interface HamperBuilderProps {
  products: GiftProduct[];
}

const STORAGE_KEY = 'vinsho_hamper_builder_draft_v1';

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

export const HamperBuilder: React.FC<HamperBuilderProps> = ({ products }) => {
  const [viewMode, setViewMode] = useState<'manual' | 'curated'>('manual');
  const [currentStep, setCurrentStep] = useState<HamperStep>('occasion');
  const [editingHamperId, setEditingHamperId] = useState<string | null>(null);
  const [selectedOccasion, setSelectedOccasion] = useState<string>('Birthday');
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<SelectedHamperItem[]>([]);
  const [personalizeState, setPersonalizeState] = useState<HamperPersonalizeState>({
    recipientName: '',
    senderName: '',
    message: '',
    packagingId: 'box_signature_cork'
  });
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Check URL query parameters for ?edit=hamper_id or ?mode=curated
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const mode = urlParams.get('mode');
      if (mode === 'curated') {
        setViewMode('curated');
      }

      const editId = urlParams.get('edit');

      if (editId) {
        // EDIT HAMPER FLOW: Restore existing hamper item from local cart state
        const cartState = getLocalCartState();
        const existingHamperItem = cartState.items.find(i => i.id === editId || (i.hamperData && i.hamperData.hamperId === editId));

        if (existingHamperItem && existingHamperItem.hamperData) {
          const hData = existingHamperItem.hamperData;
          setEditingHamperId(existingHamperItem.id);
          setSelectedOccasion(hData.occasion || 'Birthday');
          setSelectedBudgetId(hData.selectedBudgetId || 'all');
          setPersonalizeState({
            recipientName: hData.recipientName || '',
            senderName: hData.senderName || '',
            message: hData.message || '',
            packagingId: hData.packaging?.id || 'box_signature_cork'
          });

          // Reconstruct selected items by matching products & variants
          const restoredItems: SelectedHamperItem[] = [];
          hData.items.forEach(hItem => {
            const foundProd = products.find(p => p.slug === hItem.productSlug);
            if (foundProd) {
              const foundVariant = (foundProd.variants && foundProd.variants.length > 0)
                ? (foundProd.variants.find(v => v.id === Number(hItem.variantId) || v.id === hItem.variantId) || foundProd.variants[0])
                : {
                    id: 0,
                    productId: foundProd.id || 0,
                    sku: `SKU-${foundProd.slug}`,
                    sellingPrice: foundProd.price || 0,
                    mrp: null,
                    stock: 100,
                    label: 'Standard Variant'
                  };

              restoredItems.push({
                itemKey: `${foundProd.slug}_${foundVariant.id}`,
                productId: foundProd.id,
                productSlug: foundProd.slug,
                product: foundProd,
                variantId: foundVariant.id,
                variant: foundVariant,
                quantity: hItem.quantity
              });
            }
          });

          setSelectedItems(restoredItems);
          setCurrentStep('products');
          return;
        }
      }

      // Normal Draft Restore from sessionStorage
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.currentStep) setCurrentStep(parsed.currentStep);
        if (parsed.selectedOccasion !== undefined) setSelectedOccasion(parsed.selectedOccasion);
        if (parsed.selectedBudgetId) setSelectedBudgetId(parsed.selectedBudgetId);
        if (parsed.selectedItems && Array.isArray(parsed.selectedItems)) setSelectedItems(parsed.selectedItems);
        if (parsed.personalizeState) setPersonalizeState(parsed.personalizeState);
      }
    } catch (e) {
      console.warn('Failed to restore hamper draft state:', e);
    }
  }, [products]);

  // Auto-save state changes to sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const draft = {
        currentStep,
        selectedOccasion,
        selectedBudgetId,
        selectedItems,
        personalizeState
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn('Failed to save hamper draft state:', e);
    }
  }, [currentStep, selectedOccasion, selectedBudgetId, selectedItems, personalizeState]);

  // Selected items map for O(1) lookup: itemKey -> quantity
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

  // Handle transfer from CurateHamperWizard into HamperBuilder
  const handleTransferFromCurator = (items: SelectedHamperItem[], targetStep: 'products' | 'personalize') => {
    setSelectedItems(items);
    setViewMode('manual');
    setCurrentStep(targetStep);
  };

  // Add product variant to hamper
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

  // ENQUIRE VIA WHATSAPP INTEGRATION
  const handleAddToCart = async () => {
    if (selectedItems.length === 0) {
      setValidationError('Please select at least 1 product before inquiring about your hamper.');
      return;
    }

    const itemsSummary = selectedItems.map(i => `${i.product.name} × ${i.quantity}`).join(', ');
    const msgText = `Hi VINSHO, I would like a custom quote for a Gifting Hamper (${selectedOccasion}).\nItems: ${itemsSummary}\nPackaging: ${selectedPackaging.name}\nTotal: ₹${currentSubtotal + selectedPackaging.price}`;
    
    if (typeof window !== 'undefined') {
      window.open(`https://wa.me/919625515351?text=${encodeURIComponent(msgText)}`, '_blank');
    }
  };

  // Step transition logic
  const handleProceedFromStep = () => {
    if (currentStep === 'occasion') {
      setCurrentStep('products');
    } else if (currentStep === 'products') {
      setCurrentStep('personalize');
    } else if (currentStep === 'personalize') {
      setCurrentStep('preview');
    }
  };

  const proceedLabel = useMemo(() => {
    if (currentStep === 'occasion') return 'CONTINUE TO PRODUCTS';
    if (currentStep === 'products') return 'PERSONALIZE HAMPER';
    if (currentStep === 'personalize') return 'PREVIEW HAMPER';
    return 'ENQUIRE VIA WHATSAPP';
  }, [currentStep]);

  const canProceed = useMemo(() => {
    if (currentStep === 'occasion') return true;
    if (currentStep === 'products') return selectedItems.length > 0;
    if (currentStep === 'personalize') return true;
    return true;
  }, [currentStep, selectedItems]);

  if (viewMode === 'curated') {
    return (
      <div className="hamper-builder-root">
        <CurateHamperWizard
          products={products}
          onTransferToBuilder={handleTransferFromCurator}
          onCancel={() => setViewMode('manual')}
        />
      </div>
    );
  }

  return (
    <div className="hamper-builder-root">
      {/* Page Header */}
      <header className="hamper-header">
        <h1 className="hamper-main-heading">
          {editingHamperId ? 'EDIT YOUR GIFTING HAMPER' : 'CREATE YOUR OWN HAMPER'}
        </h1>
        <p className="hamper-supporting-text">
          Choose your products, personalize your gift, and create something uniquely yours.
        </p>

        {/* 4-Step Progress Bar */}
        <HamperProgress
          currentStep={currentStep}
          onSelectStep={(step) => setCurrentStep(step)}
        />
      </header>

      {validationError && (
        <div className="hamper-error-banner" role="alert">
          <span>⚠️ {validationError}</span>
          <button type="button" onClick={() => setValidationError(null)} className="error-close-btn">&times;</button>
        </div>
      )}

      {/* Main Two-Column Layout (Step View + Persistent Summary Sidebar) */}
      <div className="hamper-builder-grid">
        <div className="builder-step-content">
          {currentStep === 'occasion' && (
            <OccasionSelector
              selectedOccasion={selectedOccasion}
              onSelectOccasion={setSelectedOccasion}
              onNext={() => setCurrentStep('products')}
            />
          )}

          {currentStep === 'products' && (
            <GiftProductGrid
              products={products}
              selectedItemsMap={selectedItemsMap}
              currentSubtotal={currentSubtotal}
              selectedBudgetId={selectedBudgetId}
              onSelectBudget={setSelectedBudgetId}
              onAddProduct={handleAddProduct}
              onUpdateQty={handleUpdateQty}
            />
          )}

          {currentStep === 'personalize' && (
            <HamperPersonalization
              personalizeState={personalizeState}
              packagingOptions={PACKAGING_OPTIONS}
              onChangePersonalize={handleUpdatePersonalize}
              onNext={() => setCurrentStep('preview')}
              onBack={() => setCurrentStep('products')}
            />
          )}

          {currentStep === 'preview' && (
            <HamperPreview
              selectedItems={selectedItems}
              occasion={selectedOccasion}
              selectedPackaging={selectedPackaging}
              personalizeState={personalizeState}
              onEdit={() => setCurrentStep('products')}
              onAddToCart={handleAddToCart}
            />
          )}
        </div>

        {/* Persistent Summary Panel (Desktop Right Column / Mobile Collapsible) */}
        {currentStep !== 'preview' && (
          <HamperSummary
            selectedItems={selectedItems}
            occasion={selectedOccasion}
            selectedPackaging={selectedPackaging}
            onUpdateQty={handleUpdateQty}
            onRemoveItem={handleRemoveItem}
            onProceed={handleProceedFromStep}
            canProceed={canProceed}
            proceedLabel={proceedLabel}
          />
        )}
      </div>
    </div>
  );
};
