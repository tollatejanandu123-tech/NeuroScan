from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class FileUploadResponse(BaseModel):
    file_id: str
    filename: str
    file_type: str  # "2D" or "3D"
    dimensions: List[int]
    voxel_spacing: Optional[List[float]] = None
    slice_count: int
    modality_detected: str
    is_demo: bool = False
    message: str

class ClassProbability(BaseModel):
    class_name: str
    probability: float

class ClassificationResult(BaseModel):
    predicted_class: str
    confidence: float
    probabilities: List[ClassProbability]
    inference_time_ms: float
    model_name: str
    status: str
    disclaimer: str = "Classifier confidence represents model probability, not confirmed clinical certainty."

class SubregionMeasurement(BaseModel):
    subregion_id: int
    name: str
    color_hex: str
    count: int  # voxels for 3D, pixels for 2D
    volume_cm3: Optional[float] = None
    volume_ml: Optional[float] = None
    percentage_of_tumour: float

class MeasurementsResult(BaseModel):
    is_3d: bool
    total_count: int  # voxels or pixels
    total_volume_cm3: Optional[float] = None
    total_volume_ml: Optional[float] = None
    area_percentage_2d: Optional[float] = None
    bounding_box: Optional[Dict[str, int]] = None
    max_extent_mm: Optional[Dict[str, float]] = None
    surface_area_cm2: Optional[float] = None
    subregions: List[SubregionMeasurement]
    disclaimer: str = "All measurements are AI-derived computational estimates requiring clinical radiological validation."

class UncertaintySummary(BaseModel):
    method: str = "Monte Carlo Dropout (Stochastic Forward Passes)"
    mc_passes: int
    mean_uncertainty: float
    max_uncertainty: float
    boundary_uncertainty: float
    uncertain_voxels_pct: float
    threshold_used: float
    threshold_exceeded: bool
    interpretation: str

class QACheckItem(BaseModel):
    check_id: str
    name: str
    category: str  # "input_format", "image_quality", "segmentation_plausibility", "model_consistency"
    status: str    # "passed", "warning", "failed"
    metric_value: Optional[str] = None
    threshold: Optional[str] = None
    details: str

class QualityAssessmentResult(BaseModel):
    overall_status: str  # "ACCEPTABLE_FOR_REVIEW", "NEEDS_REVIEW", "PROCESSING_FAILED"
    overall_score: float # 0 - 100
    checks: List[QACheckItem]
    warnings: List[str]
    suggested_action: str
    disclaimer: str = "Rule-based quality assessment heuristic, not a validated medical device metric."

class HumanReviewRecommendation(BaseModel):
    review_recommended: bool
    status_label: str  # "AI analysis completed — review recommended", etc.
    urgency: str       # "LOW", "MODERATE", "HIGH", "CRITICAL"
    reasons: List[str]
    disclaimer: str = "This system is a research prototype. Results must be reviewed and verified by a qualified medical professional."

class MeshSubregion(BaseModel):
    name: str
    color_hex: str
    vertices_count: int
    faces_count: int

class MeshData(BaseModel):
    result_id: str
    is_available: bool
    subregions: List[MeshSubregion]
    bounding_box_mm: Optional[Dict[str, float]] = None
    obj_export_url: str
    stl_export_url: str

class DiceIoUMetrics(BaseModel):
    whole_tumour_dice: float
    tumour_core_dice: float
    enhancing_tumour_dice: float
    whole_tumour_iou: float
    mean_dice: float

class ModelBenchmarkItem(BaseModel):
    model_id: str
    model_name: str
    architecture_type: str
    parameter_count: int
    model_size_mb: float
    inference_latency_ms: float
    peak_memory_mb: float
    metrics: DiceIoUMetrics
    description: str

class AnalysisRequest(BaseModel):
    file_id: str
    selected_slice: Optional[int] = None
    model_type: str = "baseline"  # "baseline" or "lightweight"
    mc_passes: int = 8
    uncertainty_threshold: float = 0.35
    confidence_threshold: float = 0.75

class SliceDataResponse(BaseModel):
    slice_index: int
    total_slices: int
    original_image_base64: str
    mask_image_base64: str
    overlay_image_base64: str
    uncertainty_heatmap_base64: str
    subregions_present: List[str]

class AnalysisResponse(BaseModel):
    result_id: str
    file_id: str
    filename: str
    is_3d: bool
    slice_count: int
    current_slice_index: int
    classification: ClassificationResult
    measurements: MeasurementsResult
    uncertainty: UncertaintySummary
    quality_assessment: QualityAssessmentResult
    human_review: HumanReviewRecommendation
    has_3d_mesh: bool
    model_used: str
    inference_latency_total_ms: float
    created_at: str

class DemoScanItem(BaseModel):
    id: str
    name: str
    category: str
    is_3d: bool
    format: str
    dimensions: str
    description: str
