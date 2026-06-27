import React, { useState } from 'react';
import { User, SubscriptionPlan } from '../types';
import { AppStore } from '../lib/store';
import { X, Check, Zap, Sparkles, Building2, Loader2, ArrowRight } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUpgradeSuccess: (user: User) => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
  initialPlanSelection?: SubscriptionPlan;
}

export default function UpgradeModal({
  isOpen,
  onClose,
  currentUser,
  onUpgradeSuccess,
  onOpenAuth,
  initialPlanSelection = 'pro'
}: UpgradeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(initialPlanSelection);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);

  React.useEffect(() => {
    setSelectedPlan(initialPlanSelection);
  }, [initialPlanSelection, isOpen]);

  if (!isOpen) return null;

  const handleCheckout = () => {
    if (!currentUser) {
      onClose();
      onOpenAuth('register');
      return;
    }

    setIsLoading(true);

    // Simulate Stripe Checkout redirection and webhook processing
    setTimeout(() => {
      const updatedUser = AppStore.handleCheckoutSimulation(currentUser.id, selectedPlan);
      setIsLoading(false);
      onUpgradeSuccess(updatedUser);
      onClose();
    }, 1500);
  };

  const proPrice = isAnnual ? '$79/year' : '$9.99/month';
  const bizPrice = isAnnual ? '$199/year' : '$24.99/month';
  const proSavings = isAnnual ? 'Save $40/yr' : null;
  const bizSavings = isAnnual ? 'Save $100/yr' : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" id="upgrade-modal-overlay">
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-900 shadow-2xl p-6 sm:p-8 animate-scale-up overflow-y-auto max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
          id="upgrade-modal-close"
        >
          <X size={18} />
        </button>

        {/* Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 mb-3 uppercase tracking-widest select-none">
            <Sparkles size={12} className="animate-pulse" />
            DocuCraft Premium
          </div>
          <h3 className="font-sans font-extrabold text-2xl text-gray-900 dark:text-white sm:text-3xl">
            Supercharge Your Productivity
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
            {!currentUser ? 'Sign up to get 3 free actions daily, or choose unlimited speeds with Pro or Team access.' : 'You’ve unlocked 100% of your free tier features today. Upgrade for unlimited file sizes, speeds, and processing.'}
          </p>
        </div>

        {/* Toggle Billing Frequency */}
        <div className="flex justify-center items-center gap-3 mb-8 select-none">
          <span className={`text-xs font-semibold ${!isAnnual ? 'text-gray-950 dark:text-white' : 'text-gray-400'}`}>Monthly</span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className="w-12 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-900/50 relative transition-all"
          >
            <div className={`w-4 h-4 rounded-full bg-indigo-600 dark:bg-indigo-400 absolute top-1 left-1 transition-all ${isAnnual ? 'translate-x-6' : ''}`} />
          </button>
          <span className={`text-xs font-semibold flex items-center gap-1.5 ${isAnnual ? 'text-gray-950 dark:text-white' : 'text-gray-400'}`}>
            Yearly 
            <span className="py-0.5 px-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 rounded-full">
              Save up to 30%
            </span>
          </span>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {/* Pro Plan */}
          <div 
            onClick={() => setSelectedPlan('pro')}
            className={`cursor-pointer p-5 rounded-xl border transition-all text-left relative flex flex-col justify-between ${
              selectedPlan === 'pro' 
                ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-lg' 
                : 'border-gray-200 dark:border-gray-800 bg-transparent hover:border-gray-300 dark:hover:border-gray-700'
            }`}
          >
            {selectedPlan === 'pro' && (
              <span className="absolute top-3 right-3 py-0.5 px-2 rounded-full text-[9px] font-bold text-white bg-indigo-600 tracking-wider uppercase select-none">
                Selected
              </span>
            )}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap size={18} className="text-indigo-600 dark:text-indigo-400" />
                <h4 className="font-sans font-bold text-gray-900 dark:text-white text-lg">Pro Plan</h4>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Perfect for freelancers and power users who need fast processing daily.
              </p>
              <div className="flex items-baseline gap-1 mb-4 select-none">
                <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
                  {proPrice.split('/')[0]}
                </span>
                <span className="text-xs text-gray-400">/{proPrice.split('/')[1]}</span>
                {proSavings && (
                  <span className="ml-2 py-0.5 px-1.5 rounded bg-emerald-50 text-[9px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                    {proSavings}
                  </span>
                )}
              </div>
              <ul className="space-y-2.5 text-xs text-gray-600 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                  <span><strong>Unlimited Use</strong> on all 8 tools</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                  <span>Up to <strong>200MB file limit</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                  <span>High-speed servers & priority queue</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                  <span>100% Ad-free processing dashboard</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Business Plan */}
          <div 
            onClick={() => setSelectedPlan('business')}
            className={`cursor-pointer p-5 rounded-xl border transition-all text-left relative flex flex-col justify-between ${
              selectedPlan === 'business' 
                ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-lg' 
                : 'border-gray-200 dark:border-gray-800 bg-transparent hover:border-gray-300 dark:hover:border-gray-700'
            }`}
          >
            {selectedPlan === 'business' && (
              <span className="absolute top-3 right-3 py-0.5 px-2 rounded-full text-[9px] font-bold text-white bg-indigo-600 tracking-wider uppercase select-none">
                Selected
              </span>
            )}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Building2 size={18} className="text-indigo-600 dark:text-indigo-400" />
                <h4 className="font-sans font-bold text-gray-900 dark:text-white text-lg">Business Plan</h4>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Collaborative team accounts with higher volume API tokens and analytics.
              </p>
              <div className="flex items-baseline gap-1 mb-4 select-none">
                <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
                  {bizPrice.split('/')[0]}
                </span>
                <span className="text-xs text-gray-400">/{bizPrice.split('/')[1]}</span>
                {bizSavings && (
                  <span className="ml-2 py-0.5 px-1.5 rounded bg-emerald-50 text-[9px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                    {bizSavings}
                  </span>
                )}
              </div>
              <ul className="space-y-2.5 text-xs text-gray-600 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                  <span>Everything in <strong>Pro Plan</strong> included</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                  <span>Up to <strong>5 team seats</strong> with shared dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                  <span>Global SaaS Developer API Access</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                  <span>Priority 24/7 Slack and Zoom Support</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleCheckout}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 select-none"
          id="upgrade-checkout-btn"
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Securely Opening Stripe Checkout...
            </>
          ) : !currentUser ? (
            <>
              Sign Up To Upgrade
              <ArrowRight size={18} />
            </>
          ) : (
            <>
              Subscribe with Stripe Checkout ({selectedPlan === 'pro' ? proPrice.split('/')[0] : bizPrice.split('/')[0]})
              <ArrowRight size={18} />
            </>
          )}
        </button>

        {/* Security / Trust Seal */}
        <p className="text-[10px] text-center font-mono text-gray-400 uppercase tracking-widest mt-4">
          🔒 SSL SECURE 256-BIT • CANCEL ANYTIME IN STRIPE BILLING PORTAL
        </p>
      </div>
    </div>
  );
}
