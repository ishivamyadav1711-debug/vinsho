import React, { useState, useMemo } from 'react';
import type { GiftProduct, ProductVariant, SelectedHamperItem } from '../types';
import {
  curateHamper,
  getReplacementOptions,
  type CurationPreferences,
  type CuratedHamperResult,
  type CuratedProductSelection
} from './curationEngine';

interface CurateHamperWizardProps {
  products: GiftProduct[];
  onTransferToBuilder: (items: SelectedHamperItem[], step: 'products' | 'personalize') => void;
  onCancel: () => void;
}

type WizardStep = 'occasion' | 'recipient' | 'budget' | 'style' | 'result';

const OCCASIONS = [
  'Birthday', 'Wedding', 'Anniversary', 'Housewarming',
  'Festival', 'Corporate', 'Just Because'
];

const RECIPIENTS = [
  'Friend', 'Partner', 'Parent', 'Couple',
  'Colleague', 'Client', 'Family', 'Someone Special'
];

const BUDGETS = [
  { id: 'under1000', label: 'Under ₹1,000' },
  { id: '1000-2000', label: '₹1,000 – ₹2,000' },
  { id: '2000-5000', label: '₹2,000 – ₹5,000' },
  { id: '5000plus', label: '₹5,000+' },
  { id: 'any', label: "I'll decide later" }
];

const STYLES = [
  'Elegant', 'Minimal', 'Warm & Cozy', 'Festive',
  'Traditional', 'Modern', 'Thoughtful'
];

export const CurateHamperWizard: React.FC<CurateHamperWizardProps> = ({
  products,
  onTransferToBuilder,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('occasion');
  const [prefs, setPrefs] = useState<CurationPreferences>({
    occasion: 'Birthday',
    recipient: 'Friend',
    budgetRange: '2000-5000',
    styles: ['Warm & Cozy', 'Elegant']
  });

  const [seedOffset, setSeedOffset] = useState<number>(0);
  const [customizedResult, setCustomizedResult] = useState<CuratedProductSelection[] | null>(null);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);

  // Compute recommendation result
  const baseResult: CuratedHamperResult = useMemo(() => {
    return curateHamper(products, prefs, seedOffset);
  }, [products, prefs, seedOffset]);

  const activeResultItems = customizedResult !== null ? customizedResult : baseResult.items;

  const currentSubtotal = useMemo(() => {
    return activeResultItems.reduce((sum, item) => sum + (item.variant.sellingPrice), 0);
  }, [activeResultItems]);

  const grandTotal = currentSubtotal + 350; // Packaging cost

  // Replacement items for active target product
  const replacementOptions = useMemo(() => {
    if (replacingIndex === null || !activeResultItems[replacingIndex]) return [];
    const targetSlug = activeResultItems[replacingIndex].product.slug;
    return getReplacementOptions(products, targetSlug, prefs);
  }, [products, replacingIndex, activeResultItems, prefs]);

  const handleNextStep = () => {
    if (currentStep === 'occasion') setCurrentStep('recipient');
    else if (currentStep === 'recipient') setCurrentStep('budget');
    else if (currentStep === 'budget') setCurrentStep('style');
    else if (currentStep === 'style') {
      setCustomizedResult(null);
      setCurrentStep('result');
    }
  };

  const handleRemoveProduct = (index: number) => {
    const updated = activeResultItems.filter((_, i) => i !== index);
    setCustomizedResult(updated);
  };

  const handleSelectReplacement = (newProd: GiftProduct, newVar: ProductVariant) => {
    if (replacingIndex === null) return;
    const updated = [...activeResultItems];
    updated[replacingIndex] = {
      product: newProd,
      variant: newVar,
      whyReason: 'A thoughtfully selected alternative matching your preferred aesthetic.'
    };
    setCustomizedResult(updated);
    setReplacingIndex(null);
  };

  const handleCurateAgain = () => {
    setSeedOffset(prev => prev + 1);
    setCustomizedResult(null);
  };

  const convertToBuilderItems = (): SelectedHamperItem[] => {
    return activeResultItems.map(item => ({
      itemKey: `${item.product.slug}_${item.variant.id}`,
      productId: item.product.id,
      productSlug: item.product.slug,
      product: item.product,
      variantId: item.variant.id,
      variant: item.variant,
      quantity: 1
    }));
  };

  const handleCustomizeInBuilder = () => {
    const items = convertToBuilderItems();
    onTransferToBuilder(items, 'products');
  };

  const handleAddThisHamperDirectly = () => {
    const items = convertToBuilderItems();
    onTransferToBuilder(items, 'personalize');
  };

  const toggleStyle = (style: string) => {
    setPrefs(prev => {
      const exists = prev.styles.includes(style);
      if (exists) {
        if (prev.styles.length === 1) return prev; // Keep at least one
        return { ...prev, styles: prev.styles.filter(s => s !== style) };
      }
      return { ...prev, styles: [...prev.styles, style] };
    });
  };

  return (
    <div className="curate-wizard-root">
      {/* Wizard Header Bar */}
      <div className="curate-wizard-head">
        <div className="head-eyebrow">
          <span className="sparkle-ico">✦</span>
          <span>VINSHO PERSONAL GIFT CONCIERGE</span>
        </div>
        <h2 className="curate-wizard-title">LET VINSHO CURATE MY HAMPER</h2>
        <p className="curate-wizard-sub">Answer 4 quick questions and our studio will arrange a balanced luxury hamper.</p>
        
        {currentStep !== 'result' && (
          <div className="curate-progress-bar">
            <div className={`step-dot ${currentStep === 'occasion' ? 'active' : 'done'}`}>
              <span className="dot-num">01</span>
              <span className="dot-lbl">OCCASION</span>
            </div>
            <div className="step-line"></div>
            <div className={`step-dot ${currentStep === 'recipient' ? 'active' : currentStep === 'budget' || currentStep === 'style' ? 'done' : ''}`}>
              <span className="dot-num">02</span>
              <span className="dot-lbl">RECIPIENT</span>
            </div>
            <div className="step-line"></div>
            <div className={`step-dot ${currentStep === 'budget' ? 'active' : currentStep === 'style' ? 'done' : ''}`}>
              <span className="dot-num">03</span>
              <span className="dot-lbl">BUDGET</span>
            </div>
            <div className="step-line"></div>
            <div className={`step-dot ${currentStep === 'style' ? 'active' : ''}`}>
              <span className="dot-num">04</span>
              <span className="dot-lbl">STYLE</span>
            </div>
          </div>
        )}
      </div>

      {/* STEP 1: OCCASION */}
      {currentStep === 'occasion' && (
        <div className="curate-step-card">
          <h3 className="step-question">WHAT ARE YOU CELEBRATING?</h3>
          
          <div className="chips-grid">
            {OCCASIONS.map(occ => (
              <button
                key={occ}
                type="button"
                className={`chip-btn ${prefs.occasion === occ ? 'selected' : ''}`}
                onClick={() => setPrefs(p => ({ ...p, occasion: occ }))}
              >
                {occ}
              </button>
            ))}
          </div>

          <div className="wizard-actions-row">
            <button type="button" onClick={onCancel} className="btn-wizard-link">Cancel</button>
            <button type="button" onClick={handleNextStep} className="btn-wizard-next">
              CONTINUE TO RECIPIENT &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: RECIPIENT */}
      {currentStep === 'recipient' && (
        <div className="curate-step-card">
          <h3 className="step-question">WHO ARE YOU GIFTING?</h3>
          
          <div className="chips-grid">
            {RECIPIENTS.map(rec => (
              <button
                key={rec}
                type="button"
                className={`chip-btn ${prefs.recipient === rec ? 'selected' : ''}`}
                onClick={() => setPrefs(p => ({ ...p, recipient: rec }))}
              >
                {rec}
              </button>
            ))}
          </div>

          <div className="wizard-actions-row">
            <button type="button" onClick={() => setCurrentStep('occasion')} className="btn-wizard-link">&larr; Back</button>
            <button type="button" onClick={handleNextStep} className="btn-wizard-next">
              CONTINUE TO BUDGET &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: BUDGET */}
      {currentStep === 'budget' && (
        <div className="curate-step-card">
          <h3 className="step-question">WHAT'S YOUR BUDGET?</h3>
          
          <div className="chips-grid">
            {BUDGETS.map(b => (
              <button
                key={b.id}
                type="button"
                className={`chip-btn ${prefs.budgetRange === b.id ? 'selected' : ''}`}
                onClick={() => setPrefs(p => ({ ...p, budgetRange: b.id }))}
              >
                {b.label}
              </button>
            ))}
          </div>

          <div className="wizard-actions-row">
            <button type="button" onClick={() => setCurrentStep('recipient')} className="btn-wizard-link">&larr; Back</button>
            <button type="button" onClick={handleNextStep} className="btn-wizard-next">
              CONTINUE TO STYLE &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: STYLE */}
      {currentStep === 'style' && (
        <div className="curate-step-card">
          <h3 className="step-question">WHAT FEELS RIGHT? (SELECT ONE OR MULTIPLE)</h3>
          
          <div className="chips-grid">
            {STYLES.map(st => {
              const isSel = prefs.styles.includes(st);
              return (
                <button
                  key={st}
                  type="button"
                  className={`chip-btn ${isSel ? 'selected' : ''}`}
                  onClick={() => toggleStyle(st)}
                >
                  {isSel ? '✓ ' : ''}{st}
                </button>
              );
            })}
          </div>

          <div className="wizard-actions-row">
            <button type="button" onClick={() => setCurrentStep('budget')} className="btn-wizard-link">&larr; Back</button>
            <button type="button" onClick={handleNextStep} className="btn-wizard-next">
              CURATE MY HAMPER NOW &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: RECOMMENDATION RESULT SCREEN */}
      {currentStep === 'result' && (
        <div className="curate-result-box">
          <div className="result-header">
            <h3 className="result-title">YOUR VINSHO CURATED HAMPER</h3>
            <p className="result-sub">A thoughtful combination selected around your preferences.</p>
          </div>

          {baseResult.budgetExceededWarning && (
            <div className="budget-warning-banner">
              <span>⚠️ {baseResult.budgetExceededWarning}</span>
              <button type="button" onClick={() => setCurrentStep('budget')} className="btn-adjust-budget">
                ADJUST BUDGET
              </button>
            </div>
          )}

          {activeResultItems.length === 0 ? (
            <div className="no-result-card">
              <h4>WE COULDN'T FIND A MATCH</h4>
              <p>Try adjusting your budget or preferences to discover matching combinations.</p>
              <div className="no-result-actions">
                <button type="button" onClick={() => setCurrentStep('occasion')} className="btn-adjust-prefs">
                  ADJUST PREFERENCES
                </button>
                <a href="/products" className="btn-browse-all">
                  BROWSE GIFTING COLLECTION
                </a>
              </div>
            </div>
          ) : (
            <>
              {/* Product Cards Stack */}
              <div className="curated-items-stack">
                {activeResultItems.map((item, idx) => (
                  <div key={`${item.product.slug}_${idx}`} className="curated-item-card">
                    <div className="item-img-box">
                      <img src={item.product.image || '/placeholder.png'} alt={item.product.name} className="item-img" />
                    </div>

                    <div className="item-info-col">
                      <h4 className="item-title">{item.product.name}</h4>
                      <span className="item-variant">{item.variant.label}</span>
                      <span className="item-price">₹{item.variant.sellingPrice.toLocaleString('en-IN')}</span>
                      
                      <div className="why-box">
                        <span className="why-lbl">Why:</span>
                        <p className="why-txt">{item.whyReason}</p>
                      </div>
                    </div>

                    <div className="item-actions-col">
                      <button
                        type="button"
                        onClick={() => setReplacingIndex(idx)}
                        className="btn-item-replace"
                      >
                        REPLACE
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(idx)}
                        className="btn-item-remove"
                      >
                        REMOVE
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* REPLACEMENT MODAL / DRAWER */}
              {replacingIndex !== null && (
                <div className="replace-drawer-backdrop">
                  <div className="replace-drawer">
                    <div className="replace-head">
                      <h4>REPLACE {activeResultItems[replacingIndex]?.product.name.toUpperCase()}</h4>
                      <button type="button" onClick={() => setReplacingIndex(null)} className="btn-close-replace">&times;</button>
                    </div>

                    <p className="replace-sub">Select an alternative piece compatible with your preferred aesthetic:</p>

                    <div className="replace-options-list">
                      {replacementOptions.map(({ product, variant }) => (
                        <div key={product.slug} className="replace-option-row">
                          <img src={product.image || '/placeholder.png'} alt={product.name} className="replace-img" />
                          <div className="replace-info">
                            <strong>{product.name}</strong>
                            <span>₹{variant.sellingPrice.toLocaleString('en-IN')}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectReplacement(product, variant)}
                            className="btn-select-alt"
                          >
                            SELECT THIS
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Editorial Explanation */}
              <div className="editorial-why-card">
                <span className="editorial-lbl">WHY WE CHOSE THESE</span>
                <p className="editorial-txt">{baseResult.editorialExplanation}</p>
              </div>

              {/* Total Financial Breakdown */}
              <div className="curated-financial-summary">
                <div className="fin-row">
                  <span>Products ({activeResultItems.length} Items)</span>
                  <span>₹{currentSubtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="fin-row">
                  <span>Packaging (Signature Cork Box)</span>
                  <span>₹350</span>
                </div>
                <div className="fin-divider"></div>
                <div className="fin-row total">
                  <span>TOTAL</span>
                  <span>₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="curated-bottom-cta-bar">
                <div className="cta-question">LIKE THE SELECTION?</div>
                <div className="cta-buttons-group">
                  <button
                    type="button"
                    onClick={handleCurateAgain}
                    className="btn-curate-again"
                  >
                    🔄 CURATE AGAIN
                  </button>

                  <button
                    type="button"
                    onClick={handleCustomizeInBuilder}
                    className="btn-customize-it"
                  >
                    CUSTOMIZE IT
                  </button>

                  <button
                    type="button"
                    onClick={handleAddThisHamperDirectly}
                    className="btn-add-hamper-primary"
                  >
                    ADD THIS HAMPER &rarr;
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
