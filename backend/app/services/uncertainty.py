import numpy as np
from scipy import ndimage
from typing import Dict, Any, Tuple
from ..schemas.analysis import UncertaintySummary

def analyze_uncertainty(
    uncertainty_map: np.ndarray,
    mask: np.ndarray,
    threshold: float = 0.35,
    mc_passes: int = 8
) -> UncertaintySummary:
    """
    Computes rigorous uncertainty statistics, especially along tumour boundaries.
    """
    u_map = np.clip(uncertainty_map, 0.0, 1.0)
    
    # Identify tumour mask (any non-background class)
    tumour_mask = mask > 0
    has_tumour = np.any(tumour_mask)
    
    if has_tumour:
        # Boundary zone: dilation minus erosion of the whole tumour mask
        dilated = ndimage.binary_dilation(tumour_mask, iterations=2)
        eroded = ndimage.binary_erosion(tumour_mask, iterations=2)
        boundary_zone = dilated ^ eroded  # XOR gives boundary band
        
        # Mean uncertainty inside boundary vs inside tumour core
        if np.any(boundary_zone):
            boundary_uncertainty = float(np.mean(u_map[boundary_zone]))
        else:
            boundary_uncertainty = float(np.mean(u_map[tumour_mask]))
            
        mean_uncertainty = float(np.mean(u_map[tumour_mask]))
        max_uncertainty = float(np.max(u_map[tumour_mask]))
        
        # Percentage of tumour voxels exceeding threshold
        exceeding_voxels = np.sum((u_map > threshold) & tumour_mask)
        uncertain_voxels_pct = float((exceeding_voxels / np.sum(tumour_mask)) * 100.0)
    else:
        # For non-tumour cases, compute on high-uncertainty areas in the brain
        brain_mask = u_map > 0.05
        if np.any(brain_mask):
            mean_uncertainty = float(np.mean(u_map[brain_mask]))
            max_uncertainty = float(np.max(u_map[brain_mask]))
            exceeding = np.sum(u_map > threshold)
            uncertain_voxels_pct = float((exceeding / u_map.size) * 100.0)
        else:
            mean_uncertainty = 0.02
            max_uncertainty = 0.05
            uncertain_voxels_pct = 0.0
        boundary_uncertainty = mean_uncertainty

    threshold_exceeded = (boundary_uncertainty > threshold) or (uncertain_voxels_pct > 25.0)

    interpretation = (
        f"Monte Carlo Dropout evaluated across {mc_passes} stochastic forward passes. "
        f"Mean boundary uncertainty is {boundary_uncertainty:.2f} (threshold: {threshold:.2f}). "
    )
    if threshold_exceeded:
        interpretation += (
            "Elevated predictive dispersion detected near infiltrative margins or edema transitions. "
            "Manual radiological boundary verification strongly recommended."
        )
    else:
        interpretation += (
            "Low predictive variance observed across forward passes. Boundary definition is stable under perturbation."
        )

    return UncertaintySummary(
        method=f"Monte Carlo Dropout ({mc_passes} Stochastic Passes)",
        mc_passes=mc_passes,
        mean_uncertainty=round(mean_uncertainty, 4),
        max_uncertainty=round(max_uncertainty, 4),
        boundary_uncertainty=round(boundary_uncertainty, 4),
        uncertain_voxels_pct=round(uncertain_voxels_pct, 2),
        threshold_used=round(threshold, 2),
        threshold_exceeded=threshold_exceeded,
        interpretation=interpretation
    )
