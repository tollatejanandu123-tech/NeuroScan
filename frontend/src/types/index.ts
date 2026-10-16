export interface ClassProbability {
  class_name: string;
  probability: number;
}

export interface ClassificationResult {
  predicted_class: string;
  confidence: number;
  probabilities: { class_name: string; probability: number }[];
  inference_time_ms: number;
  model_name: string;
  status: string;
  disclaimer: string;
}

export interface SubregionMeasurement {
  subregion_id: number;
  name: string;
  color_hex: string;
  count: number;
  volume_cm3?: number | null;
  volume_ml?: number | null;
  percentage_of_tumour: number;
}

export interface MeasurementsResult {
  is_3d: boolean;
  total_count: number;
  total_volume_cm3?: number | null;
  total_volume_ml?: number | null;
  area_percentage_2d?: number | null;
  bounding_box?: Record<string, number> | null;
  max_extent_mm?: Record<string, number> | null;
  surface_area_cm2?: number | null;
  subregions: SubregionMeasurement[];
  disclaimer: string;
}

export interface UncertaintySummary {
  method: string;
  mc_passes: number;
  mean_uncertainty: number;
  max_uncertainty: number;
  boundary_uncertainty: number;
  uncertain_voxels_pct: number;
  threshold_used: number;
  threshold_exceeded: boolean;
  interpretation: string;
}

export interface QACheckItem {
  check_id: string;
  name: string;
  category: 'input_format' | 'image_quality' | 'segmentation_plausibility' | 'model_consistency';
  status: 'passed' | 'warning' | 'failed';
  metric_value?: string | null;
  threshold?: string | null;
  details: string;
}

export interface QualityAssessmentResult {
  overall_status: 'ACCEPTABLE_FOR_REVIEW' | 'NEEDS_REVIEW' | 'PROCESSING_FAILED';
  overall_score: number;
  checks: QACheckItem[];
  warnings: string[];
  suggested_action: string;
  disclaimer: string;
}

export interface HumanReviewRecommendation {
  review_recommended: boolean;
  status_label: string;
  urgency: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  reasons: string[];
  disclaimer: string;
}

export interface AnalysisResponse {
  result_id: string;
  file_id: string;
  filename: string;
  is_3d: boolean;
  slice_count: number;
  current_slice_index: number;
  classification: ClassificationResult;
  measurements: MeasurementsResult;
  uncertainty: UncertaintySummary;
  quality_assessment: QualityAssessmentResult;
  human_review: HumanReviewRecommendation;
  has_3d_mesh: boolean;
  model_used: string;
  inference_latency_total_ms: number;
  created_at: string;
}

export interface SliceDataResponse {
  slice_index: number;
  total_slices: number;
  original_image_base64: string;
  mask_image_base64: string;
  overlay_image_base64: string;
  uncertainty_heatmap_base64: string;
  subregions_present: string[];
}

export interface DemoScanItem {
  id: string;
  name: string;
  category: string;
  is_3d: boolean;
  format: string;
  dimensions: string;
  description: string;
}

export interface FileUploadResponse {
  file_id: string;
  filename: string;
  file_type: '2D' | '3D';
  dimensions: number[];
  voxel_spacing?: number[] | null;
  slice_count: number;
  modality_detected: string;
  is_demo: boolean;
  message: string;
}

export interface MeshSubregion {
  name: string;
  color_hex: string;
  vertices: number[];
  faces: number[];
  normals?: number[];
  vertices_count: number;
  faces_count: number;
}

export interface MeshData {
  is_available: boolean;
  reason?: string;
  subregions?: MeshSubregion[];
  brain_reference?: {
    name: string;
    color_hex: string;
    vertices: number[];
    is_wireframe?: boolean;
  };
  bounding_box_mm?: Record<string, number>;
}

export interface ModelBenchmarkItem {
  model_id: string;
  model_name: string;
  architecture_type: string;
  parameter_count: number;
  model_size_mb: number;
  inference_latency_ms: number;
  peak_memory_mb: number;
  metrics: {
    whole_tumour_dice: number;
    tumour_core_dice: number;
    enhancing_tumour_dice: number;
    whole_tumour_iou: number;
    mean_dice: number;
  };
  description: string;
}
