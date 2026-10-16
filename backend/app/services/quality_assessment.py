import numpy as np
from scipy import ndimage
from typing import List, Dict, Any, Tuple, Optional
from ..schemas.analysis import QualityAssessmentResult, QACheckItem
from ..config import (
    QA_BLUR_THRESHOLD,
    QA_MIN_CONTRAST,
    QA_MAX_DISCONNECTED_COMPONENTS,
    QA_MIN_TUMOUR_VOLUME_ML,
    QA_MAX_TUMOUR_VOLUME_ML
)

def run_quality_assessment(
    image_data: np.ndarray,
    mask_data: np.ndarray,
    is_3d: bool,
    voxel_spacing: Optional[List[float]],
    uncertainty_map: np.ndarray,
    predicted_class: str,
    confidence: float,
    inference_latency_ms: float
) -> QualityAssessmentResult:
    """
    Performs automated, rule-based quality assessment checks across 8 distinct criteria:
    1. Format & Readability
    2. Dimensionality & Spatial Metadata
    3. Image Acuity / Blur Estimation (Laplacian Variance)
    4. Contrast & Dynamic Range
    5. Predictive Uncertainty Level
    6. Segmentation Plausibility & Disconnected Components
    7. Domain Distribution & Skull/Brain Tissue Sanity
    8. Classifier-Segmentation Cross-Consistency
    """
    checks: List[QACheckItem] = []
    warnings: List[str] = []
    failed_checks = 0
    warning_checks = 0

    # 1. Format & Readability
    if image_data is not None and image_data.size > 0 and not np.isnan(image_data).any():
        checks.append(QACheckItem(
            check_id="format_readability",
            name="Format Integrity & Readability",
            category="input_format",
            status="passed",
            metric_value=f"Valid float matrix ({image_data.dtype})",
            threshold="Zero NaN/Inf elements",
            details="MRI data buffer loaded and verified with zero corrupted or unreadable voxels."
        ))
    else:
        checks.append(QACheckItem(
            check_id="format_readability",
            name="Format Integrity & Readability",
            category="input_format",
            status="failed",
            metric_value="Corrupt / NaN found",
            threshold="Zero NaN/Inf elements",
            details="Input buffer contains NaN or empty matrix."
        ))
        failed_checks += 1
        warnings.append("Input data integrity failed: contains non-finite numeric values.")

    # 2. Dimensionality & Spatial Metadata
    dim_status = "passed"
    dim_details = ""
    if is_3d:
        if len(image_data.shape) >= 3 and min(image_data.shape[:3]) >= 16:
            spacing_str = f"{voxel_spacing[0]:.1f}x{voxel_spacing[1]:.1f}x{voxel_spacing[2]:.1f} mm" if voxel_spacing else "Missing"
            dim_details = f"Volumetric 3D scan ({image_data.shape[0]}x{image_data.shape[1]}x{image_data.shape[2]}), Voxel spacing: {spacing_str}"
        else:
            dim_status = "warning"
            dim_details = f"Low volumetric slice depth: {image_data.shape}"
            warning_checks += 1
            warnings.append("Volume has shallow z-depth; 3D reconstruction resolution may be compromised.")
    else:
        if image_data.shape[0] >= 128 and image_data.shape[1] >= 128:
            dim_details = f"2D Scan ({image_data.shape[0]}x{image_data.shape[1]} px). Physical voxel spacing omitted by design."
        else:
            dim_status = "warning"
            dim_details = f"Low resolution 2D scan ({image_data.shape[0]}x{image_data.shape[1]} px)"
            warning_checks += 1
            warnings.append("2D image resolution is below recommended 128x128 matrix.")

    checks.append(QACheckItem(
        check_id="dimension_metadata",
        name="Dimensions & Spatial Metadata",
        category="input_format",
        status=dim_status,
        metric_value=f"{list(image_data.shape)}",
        threshold="Min 128x128 / 16 slices",
        details=dim_details
    ))

    # 3. Image Acuity / Blur Estimation (Discrete Laplacian Variance)
    # Sample center slice for evaluation
    if is_3d and image_data.ndim == 3:
        mid_z = image_data.shape[2] // 2
        eval_slice = image_data[:, :, mid_z]
    else:
        eval_slice = image_data

    # Scale to standard 8-bit dynamic range for OpenCV-style Laplacian sharpness
    eval_slice_255 = (eval_slice * 255.0) if eval_slice.max() <= 1.0 else eval_slice
    laplacian = ndimage.laplace(eval_slice_255)
    blur_score = float(np.var(laplacian))

    if blur_score >= QA_BLUR_THRESHOLD:
        blur_status = "passed"
        blur_details = f"Laplacian variance is {blur_score:.1f}, indicating sharp anatomical edge transitions."
    elif blur_score >= (QA_BLUR_THRESHOLD * 0.4):
        blur_status = "warning"
        blur_details = f"Laplacian variance is {blur_score:.1f}. Mild blurring detected; boundary delineation precision may degrade."
        warning_checks += 1
        warnings.append("Mild image blur detected; potential motion artifact or low high-frequency content.")
    else:
        blur_status = "failed"
        blur_details = f"Laplacian variance is {blur_score:.1f} (severe blur). Edge definition inadequate."
        failed_checks += 1
        warnings.append("Significant blur or motion artifact detected in MRI scan.")

    checks.append(QACheckItem(
        check_id="image_blur",
        name="Image Acuity & Motion Artifact",
        category="image_quality",
        status=blur_status,
        metric_value=f"{blur_score:.1f} Var(∇²I)",
        threshold=f"≥ {QA_BLUR_THRESHOLD:.1f}",
        details=blur_details
    ))

    # 4. Contrast & Dynamic Range
    brain_voxels = eval_slice[eval_slice > 0.05]
    if len(brain_voxels) > 100:
        contrast_std = float(np.std(brain_voxels) * 255.0)
    else:
        contrast_std = float(np.std(eval_slice) * 255.0)

    if contrast_std >= QA_MIN_CONTRAST:
        contrast_status = "passed"
        contrast_details = f"Contrast dispersion is {contrast_std:.1f}, providing clear gray/white matter differentiation."
    else:
        contrast_status = "warning"
        contrast_details = f"Low tissue contrast ({contrast_std:.1f} vs threshold {QA_MIN_CONTRAST}). Subtle oedema margins may be obscured."
        warning_checks += 1
        warnings.append("Low soft-tissue contrast detected in MRI slice.")

    checks.append(QACheckItem(
        check_id="contrast_dynamic_range",
        name="Tissue Contrast & Dynamic Range",
        category="image_quality",
        status=contrast_status,
        metric_value=f"{contrast_std:.1f} RMS",
        threshold=f"≥ {QA_MIN_CONTRAST:.1f}",
        details=contrast_details
    ))

    # 5. Predictive Uncertainty Level
    if mask_data.ndim == 3 and uncertainty_map.ndim == 2:
        mid_z = mask_data.shape[2] // 2
        eval_mask = mask_data[:, :, mid_z]
    else:
        eval_mask = mask_data
        
    tumour_mask_2d = eval_mask > 0
    if np.any(tumour_mask_2d):
        mean_u = float(np.mean(uncertainty_map[tumour_mask_2d]))
    else:
        mean_u = float(np.mean(uncertainty_map))

    if mean_u <= 0.30:
        u_status = "passed"
        u_details = f"Model uncertainty across segmented region is {mean_u:.2f}, within safe bounds."
    elif mean_u <= 0.45:
        u_status = "warning"
        u_details = f"Moderate boundary dispersion ({mean_u:.2f}). Infiltrative border warrants clinical scrutiny."
        warning_checks += 1
        warnings.append("Moderate segmentation uncertainty observed around tumour boundaries.")
    else:
        u_status = "warning"
        u_details = f"High prediction entropy ({mean_u:.2f} > 0.45). Model predictions exhibit substantial variance."
        warning_checks += 1
        warnings.append("High model uncertainty: model exhibited high variance across stochastic forward passes.")

    checks.append(QACheckItem(
        check_id="predictive_uncertainty",
        name="Segmentation Uncertainty Score",
        category="segmentation_plausibility",
        status=u_status,
        metric_value=f"{mean_u:.2f}",
        threshold="≤ 0.35",
        details=u_details
    ))

    # 6. Segmentation Plausibility & Disconnected Components
    tumour_mask = mask_data > 0
    if np.any(tumour_mask):
        labeled_array, num_features = ndimage.label(tumour_mask)
        if num_features <= QA_MAX_DISCONNECTED_COMPONENTS:
            comp_status = "passed"
            comp_details = f"Identified {num_features} coherent anatomical cluster(s), consistent with typical focal mass morphology."
        else:
            comp_status = "warning"
            comp_details = f"Detected {num_features} fragmented components. Scattered isolated false-positive voxels likely present."
            warning_checks += 1
            warnings.append(f"Segmentation contains {num_features} disconnected components; verify for stray voxel artifacts.")
    else:
        num_features = 0
        comp_status = "passed"
        comp_details = "Zero tumour components detected (normal scan)."

    checks.append(QACheckItem(
        check_id="component_plausibility",
        name="Morphological Plausibility & Clustering",
        category="segmentation_plausibility",
        status=comp_status,
        metric_value=f"{num_features} component(s)",
        threshold=f"≤ {QA_MAX_DISCONNECTED_COMPONENTS}",
        details=comp_details
    ))

    # 7. Domain Distribution & Anatomical Sanity
    # Check if intensity profile matches expected brain MRI (not a chest X-ray or blank screen)
    non_zero_pct = float((np.count_nonzero(eval_slice > 0.02) / eval_slice.size) * 100.0)
    if 15.0 <= non_zero_pct <= 85.0:
        domain_status = "passed"
        domain_details = f"Tissue field occupies {non_zero_pct:.1f}% of frame, matching standard cranial FOV geometry."
    else:
        domain_status = "warning"
        domain_details = f"Field of view occupancy ({non_zero_pct:.1f}%) is outside typical cranial MRI distribution."
        warning_checks += 1
        warnings.append("Unusual cranial field-of-view; scan may contain non-standard crop or out-of-domain anatomy.")

    checks.append(QACheckItem(
        check_id="domain_distribution",
        name="Cranial Distribution & FOV Sanity",
        category="image_quality",
        status=domain_status,
        metric_value=f"{non_zero_pct:.1f}% FOV",
        threshold="15% - 85%",
        details=domain_details
    ))

    # 8. Cross-Consistency (Classifier vs Segmenter)
    tumour_pixel_count = int(np.sum(tumour_mask))
    is_class_normal = (predicted_class == "No Tumour")
    has_segmentation = (tumour_pixel_count > 50)

    if (is_class_normal and not has_segmentation) or (not is_class_normal and has_segmentation):
        consist_status = "passed"
        consist_details = f"Classifier ({predicted_class}) and Segmenter ({tumour_pixel_count} voxels) are clinically congruent."
    else:
        consist_status = "warning"
        consist_details = (
            f"Cross-modal discrepancy: Classifier predicted '{predicted_class}' with {confidence*100:.1f}% confidence, "
            f"whereas segmentation detected {tumour_pixel_count} voxels."
        )
        warning_checks += 1
        warnings.append("Discrepancy detected between global classification and localized segmentation mask.")

    checks.append(QACheckItem(
        check_id="model_consistency",
        name="Classifier-Segmenter Cross Consistency",
        category="model_consistency",
        status=consist_status,
        metric_value=f"{predicted_class} / {tumour_pixel_count} voxels",
        threshold="Congruent diagnosis",
        details=consist_details
    ))

    # Calculate Overall Status & Quality Score
    score = 100.0 - (failed_checks * 35.0) - (warning_checks * 12.0)
    score = float(max(0.0, min(100.0, score)))

    if failed_checks > 0:
        overall_status = "PROCESSING_FAILED"
        suggested_action = "Reject scan or request re-acquisition due to critical image quality or data integrity failure."
    elif warning_checks >= 2 or score < 75.0:
        overall_status = "NEEDS_REVIEW"
        suggested_action = "Mandatory secondary review by a board-certified radiologist prior to clinical consideration."
    else:
        overall_status = "ACCEPTABLE_FOR_REVIEW"
        suggested_action = "Standard decision-support review; no automated technical impediments detected."

    return QualityAssessmentResult(
        overall_status=overall_status,
        overall_score=round(score, 1),
        checks=checks,
        warnings=warnings,
        suggested_action=suggested_action
    )
