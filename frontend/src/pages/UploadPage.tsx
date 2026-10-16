import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Layers,
  Sparkles,
  Sliders,
  ArrowRight,
  Zap,
  Box,
  Image as ImageIcon
} from 'lucide-react';
import {
  uploadScan,
  loadDemoScan,
  runAnalysis,
  fetchDemoScans
} from '../services/api';
import {
  FileUploadResponse,
  DemoScanItem,
  AnalysisResponse
} from '../types';
import { DisclaimerBanner } from '../components/DisclaimerBanner';

interface UploadPageProps {
  onAnalysisComplete: (result: AnalysisResponse) => void;
}

export const UploadPage: React.FC<UploadPageProps> = ({ onAnalysisComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploadedMeta, setUploadedMeta] = useState<FileUploadResponse | null>(null);
  const [demoScans, setDemoScans] = useState<DemoScanItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Analysis Configuration
  const [modelType, setModelType] = useState<'baseline' | 'lightweight'>('baseline');
  const [mcPasses, setMcPasses] = useState(8);
  const [uncertaintyThreshold, setUncertaintyThreshold] = useState(0.35);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.75);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load demo scans list on mount
  useEffect(() => {
    fetchDemoScans()
      .then((data) => setDemoScans(data))
      .catch((err) => console.error('Failed to load demo scans:', err));
  }, []);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = async (selectedFile: File) => {
    setFile(selectedFile);
    setErrorMessage(null);
    setUploading(true);

    // Create 2D image preview if image
    if (selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }

    try {
      const meta = await uploadScan(selectedFile);
      setUploadedMeta(meta);
      setUploading(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'File upload and verification failed.');
      setUploading(false);
      setUploadedMeta(null);
    }
  };

  const handleSelectDemoScan = async (demoId: string) => {
    setErrorMessage(null);
    setUploading(true);
    setFile(null);
    setPreviewUrl(null);

    try {
      const meta = await loadDemoScan(demoId);
      setUploadedMeta(meta);
      setUploading(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initialize demonstration scan.');
      setUploading(false);
      setUploadedMeta(null);
    }
  };

  const handleStartAnalysis = async () => {
    if (!uploadedMeta) return;

    setAnalyzing(true);
    setErrorMessage(null);

    const steps = [
      'Normalizing brain tissue voxel intensities...',
      'Executing CNN transfer-learning classification...',
      `Running ${mcPasses} Monte Carlo Dropout stochastic passes...`,
      'Evaluating predictive entropy & boundary dispersion...',
      uploadedMeta.file_type === '3D' ? 'Extracting Marching Cubes 3D surface mesh...' : 'Calculating 2D morphometric metrics...',
      'Running 8-point automated clinical quality audit...',
      'Synthesizing human-review recommendations...'
    ];

    let stepIdx = 0;
    setProgressMsg(steps[0]);
    const interval = setInterval(() => {
      stepIdx = (stepIdx + 1) % steps.length;
      setProgressMsg(steps[stepIdx]);
    }, 700);

    try {
      const result = await runAnalysis({
        file_id: uploadedMeta.file_id,
        model_type: modelType,
        mc_passes: mcPasses,
        uncertainty_threshold: uncertaintyThreshold,
        confidence_threshold: confidenceThreshold,
      });

      clearInterval(interval);
      setAnalyzing(false);
      onAnalysisComplete(result);
    } catch (err: any) {
      clearInterval(interval);
      setAnalyzing(false);
      setErrorMessage(err.message || 'Analysis pipeline execution failed.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          MRI Scan Ingestion & Analysis Configuration
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Upload patient volumetric NIfTI (.nii, .nii.gz) or 2D MRI slices, or select from verified clinical research demonstrations.
        </p>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 bg-rose-950/40 border border-rose-600/50 rounded-xl flex items-start gap-3 text-rose-300 text-xs shadow-lg">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold">Scan Validation or Processing Error</h4>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Upload / Demos + Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Upload Area & Demo Scans (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Drag & Drop Card */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center transition-all bg-slate-900/60 ${
              uploadedMeta
                ? 'border-teal-500/50 bg-teal-950/10'
                : 'border-slate-800 hover:border-cyan-500/40 hover:bg-slate-900/80'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".nii,.nii.gz,.png,.jpg,.jpeg"
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center space-y-3">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform ${
                  uploadedMeta
                    ? 'bg-teal-500/20 text-teal-400 scale-105'
                    : 'bg-cyan-500/10 text-cyan-400'
                }`}
              >
                {uploadedMeta ? <CheckCircle2 className="w-7 h-7" /> : <UploadCloud className="w-7 h-7" />}
              </div>

              <div>
                <h3 className="text-base font-bold text-white">
                  {uploadedMeta ? 'MRI Scan Ingested & Verified' : 'Drag & Drop Cranial MRI Scan Here'}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Supports 3D Volumetric NIfTI (<code className="text-cyan-400">.nii</code>, <code className="text-cyan-400">.nii.gz</code>) and 2D Planar MRI (<code className="text-cyan-400">.png</code>, <code className="text-cyan-400">.jpg</code>). Max file size 150 MB.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
                >
                  Browse Files from Local Disk
                </button>
              </div>
            </div>

            {/* Uploaded File Metadata Display */}
            {uploadedMeta && (
              <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500">File Type</span>
                  <div className="text-xs font-bold text-cyan-400 mt-0.5">
                    {uploadedMeta.file_type === '3D' ? '3D Volumetric Scan' : '2D Planar Slice'}
                  </div>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Dimensions</span>
                  <div className="text-xs font-mono font-bold text-white mt-0.5">
                    {uploadedMeta.dimensions.join(' × ')}
                  </div>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Slice Depth</span>
                  <div className="text-xs font-mono font-bold text-teal-400 mt-0.5">
                    {uploadedMeta.slice_count} Slice{uploadedMeta.slice_count > 1 ? 's' : ''}
                  </div>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Voxel Spacing</span>
                  <div className="text-xs font-mono text-slate-300 mt-0.5">
                    {uploadedMeta.voxel_spacing
                      ? `${uploadedMeta.voxel_spacing.map((s) => s.toFixed(1)).join(' × ')} mm`
                      : 'N/A (2D Image)'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Research Demonstration Datasets Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Load Pre-Configured Demonstration Scan
                </h3>
                <p className="text-xs text-slate-400">
                  Instantly explore full volumetric 3D segmentation, uncertainty maps, and quality assessments.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {demoScans.map((demo) => (
                <div
                  key={demo.id}
                  onClick={() => handleSelectDemoScan(demo.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    uploadedMeta?.is_demo && uploadedMeta.filename.includes(demo.id.replace('demo_', ''))
                      ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-500/10'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-slate-800 text-cyan-400">
                        {demo.is_3d ? <Box className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                      </div>
                      <span className="text-xs font-bold text-white">{demo.category}</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {demo.format}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-200 mt-2">{demo.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {demo.description}
                  </p>
                  <div className="text-[10px] font-mono text-cyan-400/80 mt-2">
                    Matrix: {demo.dimensions}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Model Selection & Analysis Trigger (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
            <div>
              <h3 className="text-base font-bold text-white">Inference Settings</h3>
              <p className="text-xs text-slate-400">Select model architecture and uncertainty parameters</p>
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Segmentation Architecture</label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setModelType('baseline')}
                  className={`p-3 rounded-xl border text-left transition-colors flex items-start gap-2.5 ${
                    modelType === 'baseline'
                      ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Cpu className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">Baseline Multi-Stage U-Net</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      4-stage encoder-decoder. High-fidelity subregion boundary delineation.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setModelType('lightweight')}
                  className={`p-3 rounded-xl border text-left transition-colors flex items-start gap-2.5 ${
                    modelType === 'lightweight'
                      ? 'bg-teal-950/40 border-teal-500 text-white shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Zap className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">Compact Depthwise U-Net</div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      88% fewer parameters, 3.4x faster latency. Optimized for edge/CPU screening.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Advanced Uncertainty Parameters Toggle */}
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between w-full text-xs font-semibold text-slate-300 hover:text-white transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Uncertainty & Review Thresholds</span>
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">
                  {showAdvanced ? 'Hide' : 'Configure'}
                </span>
              </button>

              {showAdvanced && (
                <div className="space-y-4 pt-3 text-xs">
                  {/* MC Dropout Passes */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>MC Dropout Forward Passes (T)</span>
                      <span className="font-mono text-cyan-400 font-bold">{mcPasses}</span>
                    </div>
                    <input
                      type="range"
                      min={4}
                      max={16}
                      step={2}
                      value={mcPasses}
                      onChange={(e) => setMcPasses(Number(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    />
                    <span className="text-[10px] text-slate-500 block">
                      Higher passes increase dispersion sampling precision but increase latency.
                    </span>
                  </div>

                  {/* Boundary Uncertainty Threshold */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Boundary Alert Threshold</span>
                      <span className="font-mono text-amber-400 font-bold">{uncertaintyThreshold.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.20}
                      max={0.50}
                      step={0.05}
                      value={uncertaintyThreshold}
                      onChange={(e) => setUncertaintyThreshold(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>

                  {/* Classification Confidence Threshold */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Classifier Review Threshold</span>
                      <span className="font-mono text-teal-400 font-bold">{(confidenceThreshold * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.60}
                      max={0.90}
                      step={0.05}
                      value={confidenceThreshold}
                      onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                      className="w-full accent-teal-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Run Analysis Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleStartAnalysis}
                disabled={!uploadedMeta || analyzing || uploading}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/25 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {analyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Processing Inference...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run AI Analysis Pipeline</span>
                  </>
                )}
              </button>

              {analyzing && (
                <div className="mt-3 p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-center space-y-1">
                  <div className="text-[11px] font-mono text-cyan-400 animate-pulse">
                    {progressMsg}
                  </div>
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div className="bg-cyan-400 h-full w-2/3 animate-[pulse_1s_ease-in-out_infinite]" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DisclaimerBanner compact />
        </div>
      </div>
    </div>
  );
};
