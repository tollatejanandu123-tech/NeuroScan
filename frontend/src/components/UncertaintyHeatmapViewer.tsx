import React, { useState } from 'react';
import { HelpCircle, AlertTriangle, ShieldCheck, Flame } from 'lucide-react';
import { UncertaintySummary } from '../types';

interface UncertaintyHeatmapViewerProps {
  uncertainty: UncertaintySummary;
  heatmapBase64?: string;
  originalImageBase64?: string;
}

export const UncertaintyHeatmapViewer: React.FC<UncertaintyHeatmapViewerProps> = ({
  uncertainty,
  heatmapBase64,
  originalImageBase64,
}) => {
  const [threshold, setThreshold] = useState(uncertainty.threshold_used);
  const [showOriginal, setShowOriginal] = useState(false);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Uncertainty Heatmap</h3>
              <p className="text-xs text-slate-400">{uncertainty.method}</p>
            </div>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              uncertainty.threshold_exceeded
                ? 'bg-amber-950/80 border border-amber-600/50 text-amber-300'
                : 'bg-teal-950/80 border border-teal-600/50 text-teal-300'
            }`}
          >
            {uncertainty.threshold_exceeded ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Boundary Dispersion Elevated</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>Stable Boundary Definition</span>
              </>
            )}
          </div>
        </div>

        {/* Heatmap Image Container */}
        <div className="relative w-full aspect-square bg-slate-950 rounded-xl border border-slate-800/80 overflow-hidden flex items-center justify-center mb-4">
          {heatmapBase64 ? (
            <img
              src={showOriginal && originalImageBase64 ? originalImageBase64 : heatmapBase64}
              alt="Uncertainty Heatmap"
              className="max-h-full max-w-full object-contain filter contrast-110"
            />
          ) : (
            <div className="text-slate-500 text-sm">Generating stochastic uncertainty map...</div>
          )}

          {/* Toggle Raw MRI Overlay button */}
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            className="absolute top-3 right-3 px-2.5 py-1 bg-slate-900/90 border border-slate-700/80 rounded-md text-xs font-medium text-slate-300 hover:text-white backdrop-blur-md transition-colors"
          >
            {showOriginal ? 'Show Heatmap' : 'Show Raw Slice'}
          </button>
        </div>

        {/* Color Scale Legend */}
        <div className="mb-5 p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
          <div className="flex justify-between text-[11px] font-medium text-slate-400 mb-1.5">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              Low Dispersion (&lt; 0.20)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              Moderate (0.20–0.45)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              High Ambiguity (&gt; 0.45)
            </span>
          </div>
          {/* Gradient Bar */}
          <div className="w-full h-2 rounded-full bg-gradient-to-r from-cyan-500 via-amber-400 to-rose-600" />
        </div>

        {/* Key Uncertainty Metrics */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-center">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              Mean Uncertainty
            </span>
            <div className="text-lg font-bold text-white mt-0.5">
              {uncertainty.mean_uncertainty.toFixed(3)}
            </div>
          </div>

          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-center">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              Boundary Margin
            </span>
            <div
              className={`text-lg font-bold mt-0.5 ${
                uncertainty.boundary_uncertainty > uncertainty.threshold_used
                  ? 'text-amber-400'
                  : 'text-teal-400'
              }`}
            >
              {uncertainty.boundary_uncertainty.toFixed(3)}
            </div>
          </div>

          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-center">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              Uncertain Voxels
            </span>
            <div className="text-lg font-bold text-white mt-0.5">
              {uncertainty.uncertain_voxels_pct.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Scientific Rationale Card */}
      <div className="pt-3 border-t border-slate-800/80 space-y-2">
        <p className="text-xs text-slate-300 leading-relaxed">
          {uncertainty.interpretation}
        </p>
        <div className="flex items-start gap-1.5 text-[11px] text-slate-400 italic">
          <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
          <span>
            Uncertainty reflects epistemic model variance across forward passes; it is not a calibrated probability of tumour presence.
          </span>
        </div>
      </div>
    </div>
  );
};
