import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { UploadPage } from './pages/UploadPage';
import { DashboardPage } from './pages/DashboardPage';
import { ModelBenchmarkModal } from './components/ModelBenchmarkModal';
import { AnalysisResponse } from './types';

export function App() {
  const [currentPage, setCurrentPage] = useState<'landing' | 'upload' | 'dashboard'>('landing');
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisResponse | null>(null);
  const [showBenchmarks, setShowBenchmarks] = useState(false);

  const handleStartAnalysis = () => {
    setCurrentPage('upload');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExploreCapabilities = () => {
    const el = document.getElementById('capabilities');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      setCurrentPage('landing');
    }
  };

  const handleAnalysisComplete = (result: AnalysisResponse) => {
    setActiveAnalysis(result);
    setCurrentPage('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNewScan = () => {
    setCurrentPage('upload');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Navbar */}
      <Navbar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        hasActiveResult={activeAnalysis !== null}
        onOpenBenchmarks={() => setShowBenchmarks(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentPage === 'landing' && (
          <LandingPage
            onStartAnalysis={handleStartAnalysis}
            onExploreCapabilities={handleExploreCapabilities}
            onOpenBenchmarks={() => setShowBenchmarks(true)}
          />
        )}

        {currentPage === 'upload' && (
          <UploadPage onAnalysisComplete={handleAnalysisComplete} />
        )}

        {currentPage === 'dashboard' && activeAnalysis && (
          <DashboardPage
            analysis={activeAnalysis}
            onNewScan={handleNewScan}
            onOpenBenchmarks={() => setShowBenchmarks(true)}
          />
        )}
      </main>

      {/* Global Model Benchmark Modal */}
      <ModelBenchmarkModal
        isOpen={showBenchmarks}
        onClose={() => setShowBenchmarks(false)}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
