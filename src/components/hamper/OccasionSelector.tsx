import React from 'react';

interface OccasionSelectorProps {
  selectedOccasion: string;
  onSelectOccasion: (occasion: string) => void;
  onNext: () => void;
}

const OCCASIONS = [
  { id: 'Birthday', title: 'Birthday', blurb: 'Celebrate personal milestones' },
  { id: 'Wedding', title: 'Wedding', blurb: 'Timeless luxury for couples' },
  { id: 'Anniversary', title: 'Anniversary', blurb: 'Honour years of togetherness' },
  { id: 'Housewarming', title: 'Housewarming', blurb: 'Warm pieces for new beginnings' },
  { id: 'Festival', title: 'Festival', blurb: 'Festive warmth & celebration' },
  { id: 'Corporate', title: 'Corporate', blurb: 'Refined professional gifting' },
  { id: 'Just Because', title: 'Just Because', blurb: 'Thoughtful everyday surprises' }
];

export const OccasionSelector: React.FC<OccasionSelectorProps> = ({
  selectedOccasion,
  onSelectOccasion,
  onNext
}) => {
  return (
    <div className="occasion-step-container">
      <div className="step-head-block">
        <h2 className="step-title">WHAT ARE YOU GIFTING FOR?</h2>
        <p className="step-sub">Select an occasion to help us curate recommended pieces, or skip to explore all eligible products.</p>
      </div>

      <div className="occasion-grid">
        {OCCASIONS.map((occ) => {
          const isSelected = selectedOccasion === occ.id;
          return (
            <button
              key={occ.id}
              type="button"
              onClick={() => {
                onSelectOccasion(occ.id);
              }}
              className={`occasion-tile ${isSelected ? 'selected' : ''}`}
            >
              <span className="occ-title">{occ.title}</span>
              <span className="occ-blurb">{occ.blurb}</span>
              {isSelected && <span className="occ-check">✓</span>}
            </button>
          );
        })}
      </div>

      <div className="step-actions-bar">
        <button
          type="button"
          onClick={() => {
            onSelectOccasion('');
            onNext();
          }}
          className="btn-skip-link"
        >
          Skip this step &rarr;
        </button>

        {selectedOccasion && (
          <button
            type="button"
            onClick={onNext}
            className="btn-continue-solid"
          >
            CONTINUE TO PRODUCTS &rarr;
          </button>
        )}
      </div>
    </div>
  );
};
