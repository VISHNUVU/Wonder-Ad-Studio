
import React from 'react';
import { PLANS } from '../constants';
import { PlanType } from '../types';
import { Check, X, Zap } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlanCode: string;
  onUpgrade: (planCode: PlanType) => void;
  reason?: string;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ 
  isOpen, onClose, currentPlanCode, onUpgrade, reason 
}) => {
  if (!isOpen) return null;

  const handleUpgrade = (code: string) => {
    onUpgrade(code as PlanType);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl my-8">
        <div className="p-6 md:p-10">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">
                         {reason ? "Limit Reached" : "Upgrade Your Plan"}
                    </h2>
                    <p className="text-slate-400 max-w-xl">
                        {reason || "Unlock more AI power, higher quality video rendering, and unlimited brand profiles."}
                    </p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.values(PLANS).map((plan) => {
                    const isCurrent = currentPlanCode === plan.code;
                    const isFree = plan.code === 'free';
                    const isPro = plan.code === 'pro';

                    return (
                        <div 
                           key={plan.code} 
                           className={`relative rounded-xl border p-6 flex flex-col ${isCurrent ? 'bg-slate-800/50 border-indigo-500 ring-1 ring-indigo-500/50' : 'bg-slate-900 border-slate-700'} ${isPro ? 'md:-mt-4 md:mb-4 shadow-xl shadow-indigo-900/20' : ''}`}
                        >
                            {isPro && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                    Best Value
                                </div>
                            )}

                            <div className="mb-4">
                                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                                <div className="flex items-baseline gap-1 mt-2">
                                    <span className="text-3xl font-extrabold text-white">
                                        ${plan.price / 100}
                                    </span>
                                    <span className="text-slate-500">/month</span>
                                </div>
                            </div>

                            <div className="flex-grow space-y-3 mb-8">
                                <div className="flex items-center gap-3 text-sm text-slate-300">
                                    <Zap className="w-4 h-4 text-indigo-400" />
                                    <span>
                                        {plan.maxGenerationsPerMonth} Scripts <span className="text-slate-500">/ mo</span>
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-300">
                                    <Zap className="w-4 h-4 text-purple-400" />
                                    <span>
                                        {plan.maxVideosPerMonth} Video Renders <span className="text-slate-500">/ mo</span>
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-300">
                                    <Check className="w-4 h-4 text-green-400" />
                                    <span>
                                        {plan.maxBrands >= 9999 ? 'Unlimited' : plan.maxBrands} Brands
                                    </span>
                                </div>
                                {plan.features.slice(2).map((feat, i) => (
                                    <div key={i} className="flex items-center gap-3 text-sm text-slate-300">
                                        <Check className="w-4 h-4 text-slate-500" />
                                        <span>{feat}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => handleUpgrade(plan.code)}
                                disabled={isCurrent}
                                className={`w-full py-3 rounded-lg font-bold transition-all ${
                                    isCurrent 
                                    ? 'bg-slate-800 text-slate-500 cursor-default'
                                    : isPro 
                                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg'
                                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                                }`}
                            >
                                {isCurrent ? 'Current Plan' : `Upgrade to ${plan.name}`}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>
    </div>
  );
};
