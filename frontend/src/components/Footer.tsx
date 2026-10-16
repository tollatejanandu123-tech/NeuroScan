import React from 'react';
import { Shield, Brain } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-800 bg-slate-950 text-slate-400 py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1 */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Brain className="w-4 h-4" />
              </div>
              <span className="text-white font-bold tracking-tight">NeuroVision AI</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">v1.0.0</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md">
              Uncertainty-guided deep learning research architecture for multi-compartment brain tumour classification,
              3D U-Net segmentation, Monte Carlo Dropout dispersion quantification, and automated quality assessment.
            </p>
            <div className="text-[11px] text-slate-500 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-amber-500" />
              <span>For scientific evaluation & research decision support only.</span>
            </div>
          </div>

          {/* Col 2 */}
          <div className="space-y-2 text-xs">
            <h4 className="text-slate-200 font-semibold tracking-wider uppercase text-[11px]">Supported Classes</h4>
            <ul className="space-y-1 text-slate-400">
              <li>• Glioblastoma / Glioma (BraTS)</li>
              <li>• Convexity & Skull Base Meningioma</li>
              <li>• Pituitary Macroadenoma</li>
              <li>• Non-Pathological Control Scans</li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-2 text-xs">
            <h4 className="text-slate-200 font-semibold tracking-wider uppercase text-[11px]">Core Architectures</h4>
            <ul className="space-y-1 text-slate-400">
              <li>• Baseline Multi-Stage U-Net (4 Subregions)</li>
              <li>• Compact Depthwise Separable U-Net</li>
              <li>• Monte Carlo Dropout (T=4–16 passes)</li>
              <li>• Marching Cubes 3D Surface Reconstruction</li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-4">
          <p>© 2026 NeuroVision AI Project. Developed for Medical Imaging Research.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-400 cursor-pointer">BraTS 2024 Protocol Compliant</span>
            <span>•</span>
            <span className="hover:text-slate-400 cursor-pointer">PyTorch & FastAPI Backend</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
