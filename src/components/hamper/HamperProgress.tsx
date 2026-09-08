import React from 'react';
import type { HamperStep } from './types';

interface HamperProgressProps {
  currentStep: HamperStep;
  onSelectStep: (step: HamperStep) => void;
}

const STEPS: { id: HamperStep; label: string; num: string }[] = [
  { id: 'occasion', num: '01', label: 'OCCASION' },
  { id: 'products', num: '02', label: 'PRODUCTS' },
  { id: 'personalize', num: '03', label: 'PERSONALIZE' },
  { id: 'preview', num: '04', label: 'PREVIEW' }
];

export const HamperProgress: React.FC<HamperProgressProps> = ({ currentStep, onSelectStep }) => {
  const currentIndex = STEPS.findIndex(s => s.id === currentStep);

  return (
    <nav className="hamper-progress-nav" aria-label="Hamper Builder Steps">
      <div className="progress-steps-wrapper">
        {STEPS.map((step, idx) => {
          const isActive = step.id === currentStep;
          const isCompleted = idx < currentIndex;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onSelectStep(step.id)}
              className={`progress-step-btn ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              aria-current={isActive ? 'step' : undefined}
            >
              <span className="step-num">{step.num}</span>
              <span className="step-label">{step.label}</span>
              {idx < STEPS.length - 1 && <span className="step-divider" aria-hidden="true">/</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
