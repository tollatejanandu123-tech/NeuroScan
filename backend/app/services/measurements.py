import numpy as np
from typing import Dict, Any, List, Optional
from ..schemas.analysis import MeasurementsResult, SubregionMeasurement
from ..config import SUBREGION_COLORS

def calculate_measurements(
    mask: np.ndarray,
    is_3d: bool,
    voxel_spacing: Optional[List[float]] = None
) -> MeasurementsResult:
    """
    Computes rigorous measurements from the predicted segmentation mask.
    Handles both 3D volumetric MRI and 2D MRI slices.
    """
    tumour_mask = mask > 0
    total_count = int(np.sum(tumour_mask))
    
    subregions: List[SubregionMeasurement] = []
    
    # Calculate for each subregion
    for sub_id, info in SUBREGION_COLORS.items():
        sub_mask = (mask == sub_id)
        sub_count = int(np.sum(sub_mask))
        pct = (sub_count / total_count * 100.0) if total_count > 0 else 0.0
        
        vol_cm3 = None
        vol_ml = None
        
        if is_3d and voxel_spacing and len(voxel_spacing) >= 3:
            voxel_vol_mm3 = float(voxel_spacing[0] * voxel_spacing[1] * voxel_spacing[2])
            vol_mm3 = sub_count * voxel_vol_mm3
            vol_cm3 = round(vol_mm3 / 1000.0, 3)
            vol_ml = vol_cm3  # 1 cm3 = 1 mL
            
        subregions.append(SubregionMeasurement(
            subregion_id=sub_id,
            name=info["name"],
            color_hex=info["hex"],
            count=sub_count,
            volume_cm3=vol_cm3,
            volume_ml=vol_ml,
            percentage_of_tumour=round(pct, 2)
        ))
        
    total_vol_cm3 = None
    total_vol_ml = None
    area_pct_2d = None
    bounding_box = None
    max_extent_mm = None
    
    if is_3d:
        if voxel_spacing and len(voxel_spacing) >= 3:
            voxel_vol_mm3 = float(voxel_spacing[0] * voxel_spacing[1] * voxel_spacing[2])
            total_vol_mm3 = total_count * voxel_vol_mm3
            total_vol_cm3 = round(total_vol_mm3 / 1000.0, 3)
            total_vol_ml = total_vol_cm3
            
        if total_count > 0 and mask.ndim == 3:
            coords = np.argwhere(tumour_mask)
            min_c = coords.min(axis=0)
            max_c = coords.max(axis=0)
            
            bounding_box = {
                "x_min": int(min_c[0]), "x_max": int(max_c[0]),
                "y_min": int(min_c[1]), "y_max": int(max_c[1]),
                "z_min": int(min_c[2]), "z_max": int(max_c[2])
            }
            
            if voxel_spacing and len(voxel_spacing) >= 3:
                dx_mm = float((max_c[0] - min_c[0] + 1) * voxel_spacing[0])
                dy_mm = float((max_c[1] - min_c[1] + 1) * voxel_spacing[1])
                dz_mm = float((max_c[2] - min_c[2] + 1) * voxel_spacing[2])
                diag_mm = float(np.sqrt(dx_mm**2 + dy_mm**2 + dz_mm**2))
                
                max_extent_mm = {
                    "width_x_mm": round(dx_mm, 2),
                    "depth_y_mm": round(dy_mm, 2),
                    "height_z_mm": round(dz_mm, 2),
                    "maximum_diagonal_mm": round(diag_mm, 2)
                }
    else:
        # 2D Image
        total_pixels = mask.size
        area_pct_2d = round((total_count / total_pixels) * 100.0, 2) if total_pixels > 0 else 0.0
        
        if total_count > 0:
            coords = np.argwhere(tumour_mask)
            min_c = coords.min(axis=0)
            max_c = coords.max(axis=0)
            bounding_box = {
                "x_min": int(min_c[0]), "x_max": int(max_c[0]),
                "y_min": int(min_c[1]), "y_max": int(max_c[1])
            }

    return MeasurementsResult(
        is_3d=is_3d,
        total_count=total_count,
        total_volume_cm3=total_vol_cm3,
        total_volume_ml=total_vol_ml,
        area_percentage_2d=area_pct_2d,
        bounding_box=bounding_box,
        max_extent_mm=max_extent_mm,
        subregions=subregions
    )
