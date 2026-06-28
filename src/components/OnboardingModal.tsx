import React, { useState } from 'react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowUpgrade: () => void;
}

export default function OnboardingModal({ isOpen, onClose, onShowUpgrade }: OnboardingModalProps) {
  const [currentSlide, setCurrentSlide] = useState(1);
  const [slidingOut, setSlidingOut] = useState(false);
  const totalSlides = 3;

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentSlide < totalSlides) {
      setSlidingOut(true);
      setTimeout(() => {
        setCurrentSlide(prev => prev + 1);
        setSlidingOut(false);
      }, 250);
    }
  };

  const handleBack = () => {
    if (currentSlide > 1) {
      setSlidingOut(true);
      setTimeout(() => {
        setCurrentSlide(prev => prev - 1);
        setSlidingOut(false);
      }, 250);
    }
  };

  const handleFinish = () => {
    localStorage.setItem('doculux_onboarded', '1');
    onClose();
  };

  return (
    <div className="onboarding-overlay" id="onboardingOverlay">
      <div className="onboarding-modal">
        <div className="onboarding-progress">
          <div className={`onboarding-step-dot ${currentSlide === 1 ? 'active' : ''}`} data-step="1"></div>
          <div className={`onboarding-step-dot ${currentSlide === 2 ? 'active' : ''}`} data-step="2"></div>
          <div className={`onboarding-step-dot ${currentSlide === 3 ? 'active' : ''}`} data-step="3"></div>
        </div>

        {/* Step 1 */}
        <div 
          className={`onboarding-slide ${currentSlide === 1 ? (slidingOut ? 'sliding-out' : 'active') : ''}`} 
          data-slide="1"
        >
          <div className="onboarding-illustration">🎉</div>
          <h2>Welcome to Doculux</h2>
          <p>The premium, secured PDF suite that runs entirely in your browser. Your files never leave your device.</p>
        </div>

        {/* Step 2 */}
        <div 
          className={`onboarding-slide ${currentSlide === 2 ? (slidingOut ? 'sliding-out' : 'active') : ''}`} 
          data-slide="2"
        >
          <div className="onboarding-illustration">🤖</div>
          <h2>Try AI Chat PDF</h2>
          <p>Upload any PDF and chat with it. Ask questions, get summaries, extract key data — powered by AI. It's the most powerful tool we offer.</p>
          <a href="#/ai-chat" className="onboarding-feature-link" onClick={handleFinish}>Open AI Chat PDF →</a>
        </div>

        {/* Step 3 */}
        <div 
          className={`onboarding-slide ${currentSlide === 3 ? (slidingOut ? 'sliding-out' : 'active') : ''}`} 
          data-slide="3"
        >
          <div className="onboarding-illustration">⚡</div>
          <h2>Free Credit Balance</h2>
          <p>Doculux is powered by credits. You start with <strong>10 free credits</strong> to run operations! Get more credits instantly by inviting friends, logging in daily, or upgrading your account.</p>
          <button 
            type="button"
            className="plan-cta plan-cta--primary" 
            onClick={() => {
              handleFinish();
              onShowUpgrade();
            }} 
            style={{ width: 'auto', padding: '10px 24px', marginTop: 'var(--space-3)' }}
          >
            Get More Credits →
          </button>
        </div>

        <div className="onboarding-nav">
          <button 
            type="button"
            className="onboarding-back" 
            id="onboardingBack" 
            style={{ display: currentSlide > 1 ? 'block' : 'none' }}
            onClick={handleBack}
          >
            ← Back
          </button>
          <button 
            type="button"
            className="onboarding-next" 
            id="onboardingNext" 
            style={{ display: currentSlide < totalSlides ? 'block' : 'none' }}
            onClick={handleNext}
          >
            Next →
          </button>
          <button 
            type="button"
            className="onboarding-finish" 
            id="onboardingFinish" 
            style={{ display: currentSlide === totalSlides ? 'block' : 'none' }}
            onClick={handleFinish}
          >
            Get Started ✓
          </button>
        </div>

        <button 
          type="button"
          className="onboarding-skip" 
          onClick={handleFinish}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
