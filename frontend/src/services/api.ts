import {
  FileUploadResponse,
  AnalysisResponse,
  SliceDataResponse,
  DemoScanItem,
  MeshData,
  ModelBenchmarkItem
} from '../types';

const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Backend health check failed');
  return res.json();
}

export async function fetchDemoScans(): Promise<DemoScanItem[]> {
  const res = await fetch(`${API_BASE}/demo-scans`);
  if (!res.ok) throw new Error('Failed to retrieve demonstration scans');
  return res.json();
}

export async function uploadScan(file: File): Promise<FileUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload error' }));
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
}

export async function loadDemoScan(demoId: string): Promise<FileUploadResponse> {
  const formData = new FormData();
  formData.append('demo_id', demoId);
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Demo scan load error' }));
    throw new Error(err.detail || 'Failed to load demo scan');
  }
  return res.json();
}

export interface AnalysisParams {
  file_id: string;
  selected_slice?: number;
  model_type: 'baseline' | 'lightweight';
  mc_passes: number;
  uncertainty_threshold: number;
  confidence_threshold: number;
}

export async function runAnalysis(params: AnalysisParams): Promise<AnalysisResponse> {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Analysis failed' }));
    throw new Error(err.detail || 'Inference pipeline encountered an error');
  }
  return res.json();
}

export async function fetchAnalysisResult(resultId: string): Promise<AnalysisResponse> {
  const res = await fetch(`${API_BASE}/results/${resultId}`);
  if (!res.ok) throw new Error('Failed to fetch analysis result');
  return res.json();
}

export async function fetchSliceData(resultId: string, sliceIdx: number): Promise<SliceDataResponse> {
  const res = await fetch(`${API_BASE}/results/${resultId}/slice/${sliceIdx}`);
  if (!res.ok) throw new Error('Failed to fetch slice data');
  return res.json();
}

export async function fetchMeshData(resultId: string): Promise<MeshData> {
  const res = await fetch(`${API_BASE}/results/${resultId}/mesh`);
  if (!res.ok) throw new Error('Failed to fetch 3D mesh data');
  return res.json();
}

export async function fetchBenchmarks(): Promise<ModelBenchmarkItem[]> {
  const res = await fetch(`${API_BASE}/benchmark`);
  if (!res.ok) throw new Error('Failed to retrieve model benchmark metrics');
  return res.json();
}

export function getExportUrls(resultId: string) {
  return {
    stl: `${API_BASE}/results/${resultId}/export/stl`,
    obj: `${API_BASE}/results/${resultId}/export/obj`,
    json: `${API_BASE}/results/${resultId}/export/summary.json`,
    csv: `${API_BASE}/results/${resultId}/export/measurements.csv`,
  };
}
