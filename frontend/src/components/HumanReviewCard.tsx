import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Info, Stethoscope } from 'lucide-react';
import { HumanReviewRecommendation } from '../types';

interface HumanReviewCardProps {
  humanReview: HumanReviewRecommendation;
}

export const HumanReviewCard: React.FC<HumanReviewCardProps> = ({ humanReview }) => {
  const getUrgencyConfig = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL':
        return {
          cardBg: 'bg-rose-950/40 border-rose-600/60',
          badgeBg: 'bg-rose-950 border-rose-500 text-rose-300',
          titleColor: 'text-rose-300',
          icon: <ShieldAlert className="w-6 h-6 text-rose-400" />,
        };
      case 'HIGH':
        return {
          cardBg: 'bg-rose-950/30 border-rose-500/50',
          badgeBg: 'bg-rose-950 border-rose-500 text-rose-300',
          titleColor: 'text-rose-300',
          icon: <AlertTriangle className="w-6 h-6 text-rose-400" />,
        };
      case 'MODERATE':
        return {
          cardBg: 'bg-amber-950/30 border-amber-500/50',
          badgeBg: 'bg-amber-950 border-amber-500 text-amber-300',
          titleColor: 'text-amber-300',
          icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
        };
      default:
        return {
          cardBg: 'bg-teal-950/30 border-teal-500/50',
          badgeBg: 'bg-teal-950 border-teal-500 text-teal-300',
          titleColor: 'text-teal-300',
          icon: <CheckCircle className="w-6 h-6 text-teal-400" />,
        };
    }
  };

  const config = getUrgencyConfig(humanReview.urgency);

  return (
    <div className={`rounded-2xl border p-6 shadow-xl ${config.cardBg}`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
            {config.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Clinical Workflow Recommendation
              </span>
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold ${config.badgeBg}`}>
                {humanReview.urgency} RISK TIER
              </span>
            </div>
            <h3 className={`text-lg font-bold tracking-tight mt-0.5 ${config.titleColor}`}>
              {humanReview.status_label}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-medium text-slate-300">
          <Stethoscope className="w-4 h-4 text-cyan-400" />
          <span>Radiologist Verification Required</span>
        </div>
      </div>

      {/* Triggered Reasons */}
      {humanReview.reasons.length > 0 ? (
        <div className="space-y-2 mb-4">
          <span className="text-xs font-semibold text-slate-200">
            Automated Audit Triggers:
          </span>
          <ul className="space-y-1.5">
            {humanReview.reasons.map((reason, idx) => (
              <li
                key={idx}
                className="text-xs text-slate-300 flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                <span className="leading-relaxed">{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          No automated technical impediments, boundary dispersions, or diagnostic inconsistencies were detected.
          Standard decision-support review protocol applies.
        </p>
      )}

      {/* Prominent Disclaimer Notice */}
      <div className="pt-3 border-t border-slate-800/80 flex items-start gap-2 text-xs text-slate-400 leading-relaxed">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p>{humanReview.disclaimer}</p>
      </div>
    </div>
  );
};
