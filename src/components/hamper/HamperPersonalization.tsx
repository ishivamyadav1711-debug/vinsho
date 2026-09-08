import React from 'react';
import type { HamperPersonalizeState, PackagingOption } from './types';

interface HamperPersonalizationProps {
  personalizeState: HamperPersonalizeState;
  packagingOptions: PackagingOption[];
  onChangePersonalize: (updated: Partial<HamperPersonalizeState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const MESSAGE_MAX_LENGTH = 250;

export const HamperPersonalization: React.FC<HamperPersonalizationProps> = ({
  personalizeState,
  packagingOptions,
  onChangePersonalize,
  onNext,
  onBack
}) => {
  const currentMsgLength = (personalizeState.message || '').length;

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.length <= MESSAGE_MAX_LENGTH) {
      onChangePersonalize({ message: text });
    }
  };

  return (
    <div className="personalize-step-container">
      <div className="step-head-block">
        <h2 className="step-title">MAKE IT PERSONAL</h2>
        <p className="step-sub">Select your presentation box and include a custom card message for the recipient (optional).</p>
      </div>

      {/* Packaging Selection Section */}
      <section className="packaging-select-section">
        <h3 className="section-sub-title">1. CHOOSE GIFT PACKAGING</h3>
        <div className="packaging-grid">
          {packagingOptions.map((pkg) => {
            const isSelected = personalizeState.packagingId === pkg.id;
            return (
              <div
                key={pkg.id}
                onClick={() => onChangePersonalize({ packagingId: pkg.id })}
                className={`pkg-tile ${isSelected ? 'selected' : ''}`}
              >
                <div className="pkg-head">
                  <span className="pkg-name">{pkg.name}</span>
                  <span className="pkg-price">+ ₹{pkg.price}</span>
                </div>
                <p className="pkg-desc">{pkg.description}</p>
                {isSelected && <span className="pkg-check">Selected ✓</span>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Greeting Card Form Section */}
      <section className="card-message-section">
        <h3 className="section-sub-title">2. GREETING CARD & DETAILS</h3>
        
        <div className="personalize-form">
          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="hamper-to" className="input-label">To (Recipient Name)</label>
              <input
                id="hamper-to"
                type="text"
                placeholder="e.g. Shivam (Optional)"
                value={personalizeState.recipientName}
                onChange={(e) => onChangePersonalize({ recipientName: e.target.value })}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="hamper-from" className="input-label">From (Sender Name)</label>
              <input
                id="hamper-from"
                type="text"
                placeholder="e.g. Ananya (Optional)"
                value={personalizeState.senderName}
                onChange={(e) => onChangePersonalize({ senderName: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <div className="label-counter-row">
              <label htmlFor="hamper-message" className="input-label">Personal Message (Printed on VINSHO Luxury Card)</label>
              <span className={`char-counter ${currentMsgLength >= MESSAGE_MAX_LENGTH ? 'limit-reached' : ''}`}>
                {currentMsgLength} / {MESSAGE_MAX_LENGTH}
              </span>
            </div>
            <textarea
              id="hamper-message"
              rows={4}
              maxLength={MESSAGE_MAX_LENGTH}
              placeholder="Write your note here..."
              value={personalizeState.message}
              onChange={handleMessageChange}
              className="form-textarea"
            />
          </div>
        </div>
      </section>

      <div className="step-nav-bar">
        <button type="button" onClick={onBack} className="btn-back-link">
          &larr; Back to Products
        </button>

        <button
          type="button"
          onClick={onNext}
          className="btn-continue-solid"
        >
          PREVIEW HAMPER &rarr;
        </button>
      </div>
    </div>
  );
};
