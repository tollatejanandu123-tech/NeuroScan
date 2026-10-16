import React from 'react';
import {
  Brain,
  Layers,
  Flame,
  Box,
  CheckCircle2,
  Zap,
  ArrowRight,
  ShieldAlert,
  UploadCloud,
  Cpu,
  BarChart2,
  Stethoscope,
  Activity
} from 'lucide-react';
import { DisclaimerBanner } from '../components/DisclaimerBanner';

interface LandingPageProps {
  onStartAnalysis: () => void;
  onExploreCapabilities: () => void;
  onOpenBenchmarks: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartAnalysis,
  onExploreCapabilities,
  onOpenBenchmarks,
}) => {
  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative pt-12 pb-16 overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-6 px-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-cyan-500/30 text-cyan-400 text-xs font-semibold tracking-wide shadow-md">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Research & Clinical Decision-Support Suite</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
            NeuroVision <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-sky-400">AI</span>
          </h1>

          <p className="text-lg sm:text-xl font-medium text-slate-300 tracking-wide">
            Uncertainty-Guided Brain Tumour Segmentation & Automatic Quality Assessment
          </p>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            A state-of-the-art deep learning research system integrating multi-compartment brain tumour classification,
            3D U-Net segmentation, Monte Carlo Dropout boundary dispersion estimation, Marching Cubes 3D surface reconstruction,
            and rule-based automated quality assessment for enhanced clinical transparency.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={onStartAnalysis}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/25 hover:scale-102 cursor-pointer"
            >
              <span>Start MRI Analysis</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onExploreCapabilities}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-semibold rounded-xl text-sm transition-all hover:scale-102 cursor-pointer"
            >
              <span>Explore Capabilities</span>
            </button>

            <button
              onClick={onOpenBenchmarks}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900/90 hover:bg-slate-800 text-cyan-400 border border-cyan-800/50 font-semibold rounded-xl text-sm transition-all hover:scale-102 cursor-pointer"
            >
              <BarChart2 className="w-4 h-4" />
              <span>Model Benchmarks</span>
            </button>
          </div>

          {/* Prominent Regulatory Disclaimer */}
          <div className="pt-6 max-w-2xl mx-auto">
            <DisclaimerBanner />
          </div>
        </div>
      </section>

      {/* Workflow Architecture Section */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
            Pipeline Architecture
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
            End-to-End Decision Support Workflow
          </h2>
          <p className="text-xs text-slate-400 mt-2 max-w-xl mx-auto">
            From raw DICOM / NIfTI input ingestion to uncertainty-aware boundary assessment and human radiologist review.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 relative">
          {/* Step 1 */}
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl flex flex-col items-center text-center space-y-2 relative">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
              1
            </div>
            <h4 className="text-sm font-bold text-white">Upload & Validate</h4>
            <p className="text-[11px] text-slate-400">
              Ingest 3D NIfTI or 2D MRI; check dimensions, spacing, contrast, and artifacts.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl flex flex-col items-center text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold">
              2
            </div>
            <h4 className="text-sm font-bold text-white">AI Classification</h4>
            <p className="text-[11px] text-slate-400">
              Categorize into Glioma, Meningioma, Pituitary, or No Tumour with softmax distribution.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl flex flex-col items-center text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
              3
            </div>
            <h4 className="text-sm font-bold text-white">Subregion Segmentation</h4>
            <p className="text-[11px] text-slate-400">
              Segment Enhancing Core, Tumour Core, and Peritumoral Oedema with 3D U-Net.
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl flex flex-col items-center text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              4
            </div>
            <h4 className="text-sm font-bold text-white">Uncertainty & QA</h4>
            <p className="text-[11px] text-slate-400">
              Monte Carlo Dropout boundary dispersion & 8 automated clinical validity audits.
            </p>
          </div>

          {/* Step 5 */}
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl flex flex-col items-center text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
              5
            </div>
            <h4 className="text-sm font-bold text-white">Human Review</h4>
            <p className="text-[11px] text-slate-400">
              Risk-stratified recommendation for radiologist review and 3D STL/OBJ/PDF exports.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section id="capabilities" className="max-w-6xl mx-auto px-4 pt-4">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
            System Modules
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
            Engineered for Radiological Precision
          </h2>
          <p className="text-xs text-slate-400 mt-2 max-w-xl mx-auto">
            Modular deep learning and medical imaging components designed for safety, explainability, and speed.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-6 space-y-3 hover:border-cyan-500/40 transition-colors group">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Brain className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">AI Tumour Classification</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              CNN transfer-learning pipeline predicting Glioma, Meningioma, Pituitary Tumour, or Normal control,
              paired with full posterior class probabilities and inference timing.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-6 space-y-3 hover:border-teal-500/40 transition-colors group">
            <div className="w-11 h-11 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Precision Multi-Subregion Segmentation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Delineates 3 distinct anatomical subregions according to BraTS protocols: Active Enhancing Tumour,
              Necrotic Tumour Core, and Peritumoral Vasogenic Oedema with opacity controls.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-6 space-y-3 hover:border-amber-500/40 transition-colors group">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Flame className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Uncertainty-Guided Boundary Analysis</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real Monte Carlo Dropout with stochastic forward passes computing predictive entropy and boundary
              dispersion maps to highlight infiltrative or ambiguous resection margins.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-6 space-y-3 hover:border-cyan-500/40 transition-colors group">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Box className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Interactive 3D Reconstruction</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Extracts 3D polygonal isosurface meshes using Marching Cubes calibrated to physical voxel spacing (mm).
              Full Three.js orbital viewer with 3D print STL and CAD OBJ export.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-6 space-y-3 hover:border-teal-500/40 transition-colors group">
            <div className="w-11 h-11 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Automated Quality Assessment</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Rigorous 8-point clinical audit checking Laplacian motion blur, soft-tissue contrast, fragmentation,
              cranial field-of-view, and classifier-segmenter congruency.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-6 space-y-3 hover:border-cyan-500/40 transition-colors group">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Lightweight High-Efficiency Inference</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Includes an ultra-compact Depthwise-Separable U-Net with 88% parameter reduction and 3.4x faster latency
              for bedside screening and low-power edge deployment.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
