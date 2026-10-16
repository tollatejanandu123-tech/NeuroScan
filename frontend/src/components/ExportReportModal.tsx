import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  X,
  FileText,
  Download,
  FileSpreadsheet,
  FileCode,
  Box,
  CheckCircle2,
  Printer
} from 'lucide-react';
import { AnalysisResponse } from '../types';
import { getExportUrls } from '../services/api';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: AnalysisResponse;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  analysis,
}) => {
  const [generatingPdf, setGeneratingPdf] = useState(false);

  if (!isOpen) return null;

  const exportUrls = getExportUrls(analysis.result_id);

  const generatePdfReport = () => {
    setGeneratingPdf(true);
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'letter' });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header Banner
      doc.setFillColor(15, 23, 42); // #0f172a
      doc.rect(0, 0, pageWidth, 80, 'F');

      doc.setTextColor(34, 211, 238); // Cyan
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('NeuroVision AI', 40, 42);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Research Decision-Support Analysis Report', 40, 60);

      doc.setTextColor(148, 163, 184);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date(analysis.created_at).toLocaleString()}`, pageWidth - 200, 42);
      doc.text(`Case ID: ${analysis.result_id.substring(0, 8)}`, pageWidth - 200, 60);

      let y = 110;

      // Section 1: Scan & Model Metadata
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('1. Scan & Pipeline Metadata', 40, y);
      y += 18;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      doc.text(`Input Scan: ${analysis.filename}`, 45, y);
      doc.text(`Scan Dimension: ${analysis.is_3d ? '3D Volumetric MRI' : '2D Planar MRI Slice'}`, 280, y);
      y += 16;
      doc.text(`Inference Model: ${analysis.model_used}`, 45, y);
      doc.text(`Total Inference Latency: ${analysis.inference_latency_total_ms} ms`, 280, y);
      y += 24;

      // Section 2: Tumour Classification
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('2. Neural Classification', 40, y);
      y += 18;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Predicted Category: ${analysis.classification.predicted_class}`, 45, y);
      doc.text(`Softmax Confidence: ${(analysis.classification.confidence * 100).toFixed(1)}%`, 280, y);
      y += 16;

      const probText = analysis.classification.probabilities
        .map((p) => `${p.class_name}: ${(p.probability * 100).toFixed(1)}%`)
        .join('  |  ');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Posterior Distribution: ${probText}`, 45, y);
      y += 24;

      // Section 3: Quantitative Measurements
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('3. Quantitative Tumour Measurements', 40, y);
      y += 18;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      if (analysis.is_3d) {
        doc.text(`Total Tumour Volume: ${analysis.measurements.total_volume_ml} mL (${analysis.measurements.total_volume_cm3} cm³)`, 45, y);
        doc.text(`Total Segmented Voxels: ${analysis.measurements.total_count.toLocaleString()}`, 320, y);
        y += 16;
        if (analysis.measurements.max_extent_mm) {
          doc.text(`Maximum 3D Diagonal Span: ${analysis.measurements.max_extent_mm.maximum_diagonal_mm} mm`, 45, y);
          y += 16;
        }
      } else {
        doc.text(`Total Tumour Pixel Count: ${analysis.measurements.total_count.toLocaleString()} pixels`, 45, y);
        doc.text(`Field-of-View Occupancy: ${analysis.measurements.area_percentage_2d}%`, 320, y);
        y += 16;
      }

      // Subregion table
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text('Subregion Breakdown:', 45, y);
      y += 14;

      doc.setFont('helvetica', 'normal');
      analysis.measurements.subregions.forEach((sub) => {
        const volStr = sub.volume_ml !== null && sub.volume_ml !== undefined ? ` | ${sub.volume_ml} mL` : '';
        doc.text(`• ${sub.name}: ${sub.count.toLocaleString()} elements${volStr} (${sub.percentage_of_tumour}%)`, 55, y);
        y += 13;
      });
      y += 14;

      // Section 4: Uncertainty Estimation
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('4. Uncertainty Estimation (Monte Carlo Dropout)', 40, y);
      y += 18;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      doc.text(`Boundary Margin Uncertainty: ${analysis.uncertainty.boundary_uncertainty.toFixed(3)}`, 45, y);
      doc.text(`Mean Uncertainty: ${analysis.uncertainty.mean_uncertainty.toFixed(3)}`, 280, y);
      y += 16;
      doc.text(`Stochastic Forward Passes: ${analysis.uncertainty.mc_passes}`, 45, y);
      doc.text(`Threshold Exceeded: ${analysis.uncertainty.threshold_exceeded ? 'Yes (Elevated)' : 'No (Stable)'}`, 280, y);
      y += 24;

      // Section 5: Automated Quality Assessment
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('5. Quality Assessment & Technical Audits', 40, y);
      y += 18;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Overall QA Status: ${analysis.quality_assessment.overall_status}`, 45, y);
      doc.text(`Heuristic Quality Score: ${analysis.quality_assessment.overall_score} / 100`, 280, y);
      y += 16;
      doc.text(`Next Recommended Action: ${analysis.quality_assessment.suggested_action}`, 45, y);
      y += 24;

      // Section 6: Human Review Recommendation
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('6. Clinical Workflow Recommendation', 40, y);
      y += 18;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Status: ${analysis.human_review.status_label}`, 45, y);
      doc.text(`Risk Urgency: ${analysis.human_review.urgency}`, 320, y);
      y += 16;

      if (analysis.human_review.reasons.length > 0) {
        doc.setFontSize(9);
        doc.text('Review Triggers:', 45, y);
        y += 14;
        analysis.human_review.reasons.forEach((r) => {
          doc.text(`• ${r}`, 55, y);
          y += 13;
        });
      }
      y += 24;

      // Regulatory Disclaimer Box
      doc.setFillColor(248, 250, 252);
      doc.rect(40, y, pageWidth - 80, 50, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.rect(40, y, pageWidth - 80, 50, 'S');

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('RESEARCH DECISION-SUPPORT NOTICE:', 50, y + 16);
      doc.text(
        'This document is an automated research report generated for scientific decision-support. It is not an FDA-cleared diagnostic device.',
        50,
        y + 28
      );
      doc.text(
        'All volumetric metrics, boundary segmentations, and classifications require verification by a board-certified medical specialist.',
        50,
        y + 38
      );

      // Save PDF
      doc.save(`NeuroVision_Report_${analysis.result_id.substring(0, 8)}.pdf`);
      setGeneratingPdf(false);
    } catch (err) {
      console.error('PDF generation error:', err);
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Export Analysis Results</h2>
              <p className="text-xs text-slate-400">
                Download structured data, measurements, 3D meshes, and printable PDF reports
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Action: Comprehensive PDF Research Report */}
        <div className="p-5 bg-gradient-to-br from-cyan-950/40 via-slate-950/80 to-slate-950/90 border border-cyan-500/30 rounded-xl mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Full Research PDF Report</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              Complete multi-page clinical research summary including metadata, classification probabilities,
              volumetric measurements, uncertainty findings, and QA checks.
            </p>
          </div>

          <button
            onClick={generatePdfReport}
            disabled={generatingPdf}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/20 shrink-0 disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>{generatingPdf ? 'Generating...' : 'Download PDF Report'}</span>
          </button>
        </div>

        {/* Grid of Other Export Formats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {/* JSON Summary */}
          <a
            href={exportUrls.json}
            download
            className="p-4 bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-between group transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-900 rounded-lg text-amber-400 group-hover:scale-105 transition-transform">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Analysis Summary (JSON)</h4>
                <p className="text-[11px] text-slate-400">Full model output & QA payload</p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
          </a>

          {/* CSV Measurements */}
          <a
            href={exportUrls.csv}
            download
            className="p-4 bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-between group transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-900 rounded-lg text-emerald-400 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Quantitative Metrics (CSV)</h4>
                <p className="text-[11px] text-slate-400">Subregion volumes & voxels</p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
          </a>

          {/* 3D STL Mesh */}
          {analysis.has_3d_mesh && (
            <a
              href={exportUrls.stl}
              download
              className="p-4 bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-between group transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900 rounded-lg text-cyan-400 group-hover:scale-105 transition-transform">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Reconstructed Mesh (STL)</h4>
                  <p className="text-[11px] text-slate-400">3D print & CAD isosurface</p>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            </a>
          )}

          {/* 3D OBJ Mesh */}
          {analysis.has_3d_mesh && (
            <a
              href={exportUrls.obj}
              download
              className="p-4 bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-between group transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900 rounded-lg text-purple-400 group-hover:scale-105 transition-transform">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Reconstructed Mesh (OBJ)</h4>
                  <p className="text-[11px] text-slate-400">Wavefront 3D surface model</p>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            </a>
          )}
        </div>

        {/* Footer info */}
        <div className="text-[11px] text-slate-500 text-center">
          Exports are generated client-side and from secure local backend endpoints. No patient data is transmitted externally.
        </div>
      </div>
    </div>
  );
};
