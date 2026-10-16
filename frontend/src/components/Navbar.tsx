import React from 'react';
import { Activity, Brain, BarChart3, UploadCloud, FileText } from 'lucide-react';

interface NavbarProps {
  currentPage: 'landing' | 'upload' | 'dashboard';
  setCurrentPage: (page: 'landing' | 'upload' | 'dashboard') => void;
  hasActiveResult: boolean;
  onOpenBenchmarks: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  setCurrentPage,
  hasActiveResult,
  onOpenBenchmarks,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => setCurrentPage('landing')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Brain className="w-6 h-6 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white tracking-tight">NeuroVision</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-400 font-mono font-semibold">
                AI
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Uncertainty-Guided Brain Tumour Suite</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setCurrentPage('landing')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              currentPage === 'landing'
                ? 'text-cyan-400 bg-cyan-950/50 border border-cyan-800/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            Overview
          </button>

          <button
            onClick={() => setCurrentPage('upload')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              currentPage === 'upload'
                ? 'text-cyan-400 bg-cyan-950/50 border border-cyan-800/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Scan</span>
          </button>

          {hasActiveResult && (
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentPage === 'dashboard'
                  ? 'text-cyan-400 bg-cyan-950/50 border border-cyan-800/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Analysis Dashboard</span>
            </button>
          )}

          <button
            onClick={onOpenBenchmarks}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-cyan-400 hover:bg-slate-900 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Model Benchmarks</span>
          </button>
        </nav>

        {/* System Status Indicator */}
        <div className="hidden lg:flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            <span>PyTorch 2.14 Backend Active</span>
          </div>
        </div>
      </div>
    </header>
  );
};
