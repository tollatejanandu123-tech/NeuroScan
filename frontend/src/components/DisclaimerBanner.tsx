import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface DisclaimerBannerProps {
  compact?: boolean;
}

export const DisclaimerBanner: React.FC<DisclaimerBannerProps> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="bg-amber-950/40 border border-amber-600/30 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs text-amber-200">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          <strong>Research Decision-Support Prototype:</strong> AI predictions are experimental and do not constitute a confirmed medical diagnosis.
        </span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-4 shadow-lg flex items-start gap-3 text-sm text-slate-300">
      <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 shrink-0 mt-0.5">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <div className="flex-1 space-y-1">
        <h4 className="text-amber-300 font-semibold text-xs tracking-wider uppercase">
          Clinical & Regulatory Notice
        </h4>
        <p className="text-xs leading-relaxed text-slate-300">
          NeuroVision AI is an experimental decision-support research application designed to assist qualified neuro-radiologists.
          This software is not FDA-approved or CE-cleared as a primary diagnostic device. All volumetric measurements, classification probabilities,
          and segmentation contours are computational approximations that require direct specialist review and clinical correlation.
        </p>
      </div>
    </div>
  );
};
