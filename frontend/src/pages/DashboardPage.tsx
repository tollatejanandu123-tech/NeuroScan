import React, { useState } from 'react';
import {
  Brain,
  Download,
  RotateCcw,
  BarChart2,
  Clock,
  Layers,
  Box,
  Activity,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Share2
} from 'lucide-react';
import { AnalysisResponse } from '../types';
import { ClassificationCard } from '../components/ClassificationCard';
import { MRIViewer2D } from '../components/MRIViewer2D';
import { UncertaintyHeatmapViewer } from '../components/UncertaintyHeatmapViewer';
import { Tumour3DViewer } from '../components/Tumour3DViewer';
import { MeasurementsTable } from '../components/MeasurementsTable';
import { QualityAssessmentCard } from '../components/QualityAssessmentCard';
import { HumanReviewCard } from '../components/HumanReviewCard';
import { ExportReportModal } from '../components/ExportReportModal';
import { ModelBenchmarkModal } from '../components/ModelBenchmarkModal';

interface DashboardPageProps {
  analysis: AnalysisResponse;
  onNewScan: () => void;
  onOpenBenchmarks: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  analysis,
  onNewScan,
  onOpenBenchmarks,
}) => {
  const [showExportModal, setShowExportModal] = useState(false);
  const [showBenchmarkModal, setShowBenchmarkModal] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Action & Metadata Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800/60 text-cyan-400">
              {analysis.is_3d ? '3D Volumetric Analysis' : '2D Planar Analysis'}
            </span>
            <span className="text-xs text-slate-400 font-mono">Case #{analysis.result_id.substring(0, 8)}</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-1">
            {analysis.filename}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-1">
            <span className="flex items-center gap-1">
              <Brain className="w-3.5 h-3.5 text-cyan-400" />
              Model: <strong className="text-slate-200">{analysis.model_used}</strong>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              Total Latency: <strong className="text-slate-200">{analysis.inference_latency_total_ms} ms</strong>
            </span>
            <span>•</span>
            <span className="text-slate-400">
              {new Date(analysis.created_at).toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={() => setShowExportModal(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Report & Meshes</span>
          </button>

          <button
            onClick={() => setShowBenchmarkModal(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Benchmarks</span>
          </button>

          <button
            onClick={onNewScan}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>New Scan</span>
          </button>
        </div>
      </div>

      {/* Prominent Clinical Recommendation Card */}
      <HumanReviewCard humanReview={analysis.human_review} />

      {/* Section 1: Classification & Quantitative Measurements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ClassificationCard classification={analysis.classification} />
        <MeasurementsTable measurements={analysis.measurements} />
      </div>

      {/* Section 2: Interactive 2D Viewer & Uncertainty Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <MRIViewer2D
          resultId={analysis.result_id}
          is3D={analysis.is_3d}
          totalSlices={analysis.slice_count}
          initialSliceIndex={analysis.current_slice_index}
        />
        <UncertaintyHeatmapViewer
          uncertainty={analysis.uncertainty}
          heatmapBase64={undefined} // Will load dynamic slice heatmaps via 2D viewer
          originalImageBase64={undefined}
        />
      </div>

      {/* Section 3: 3D Surface Reconstruction & Automated Quality Assessment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Tumour3DViewer
          resultId={analysis.result_id}
          is3D={analysis.is_3d}
          totalVolumeMl={analysis.measurements.total_volume_ml}
        />
        <QualityAssessmentCard qa={analysis.quality_assessment} />
      </div>

      {/* Export Report Modal */}
      <ExportReportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        analysis={analysis}
      />

      {/* Model Benchmark Modal */}
      <ModelBenchmarkModal
        isOpen={showBenchmarkModal}
        onClose={() => setShowBenchmarkModal(false)}
      />
    </div>
  );
};
