import os
import io
import base64
import numpy as np
from PIL import Image
import nibabel as nib
from typing import Tuple, Dict, Any, Optional, List
from ..config import SUBREGION_COLORS

def load_mri_file(file_path: str) -> Dict[str, Any]:
    """
    Loads an MRI file (either 3D NIfTI or 2D Image).
    Returns a dictionary containing:
      - is_3d: bool
      - volume_or_slice: np.ndarray (float32, normalized or raw)
      - shape: tuple
      - voxel_spacing: Optional[List[float]] (in mm)
      - affine: Optional[np.ndarray]
      - slice_count: int
      - modality: str
    """
    path_lower = file_path.lower()
    
    if path_lower.endswith(".nii") or path_lower.endswith(".nii.gz"):
        nii = nib.load(file_path)
        data = nii.get_fdata().astype(np.float32)
        
        # Handle 4D NIfTI (e.g. multi-modal BraTS T1, T1ce, T2, FLAIR)
        modality = "T1/T2 Volumetric MRI"
        if data.ndim == 4:
            modality = f"Multi-Modal MRI ({data.shape[-1]} channels)"
            # Use T1ce or FLAIR channel if present, otherwise average
            data = data[..., 0]
            
        zooms = nii.header.get_zooms()
        voxel_spacing = [float(z) for z in zooms[:3]]
        
        # Squeeze any singleton dimensions
        data = np.squeeze(data)
        
        return {
            "is_3d": True,
            "data": data,
            "shape": list(data.shape),
            "voxel_spacing": voxel_spacing,
            "affine": nii.affine,
            "slice_count": data.shape[2] if data.ndim == 3 else 1,
            "modality": modality
        }
    else:
        # 2D Image
        img = Image.open(file_path).convert("L")  # Convert to grayscale
        data = np.array(img, dtype=np.float32)
        
        return {
            "is_3d": False,
            "data": data,
            "shape": [int(data.shape[0]), int(data.shape[1])],
            "voxel_spacing": None,  # 2D standard images do not contain spatial mm spacing
            "affine": None,
            "slice_count": 1,
            "modality": "2D Brain MRI"
        }

def normalize_intensity(slice_data: np.ndarray) -> np.ndarray:
    """
    Performs robust brain MRI normalization.
    Uses non-zero voxels to compute min/max or z-score.
    Returns array in range [0, 1].
    """
    data = slice_data.copy()
    mask = data > 0
    if np.sum(mask) == 0:
        return np.zeros_like(data, dtype=np.float32)
        
    p1 = np.percentile(data[mask], 1.0)
    p99 = np.percentile(data[mask], 99.0)
    
    if p99 > p1:
        data = np.clip(data, p1, p99)
        data = (data - p1) / (p99 - p1)
    else:
        max_val = np.max(data)
        if max_val > 0:
            data = data / max_val
            
    return data.astype(np.float32)

def slice_to_base64_png(array_2d: np.ndarray) -> str:
    """Converts 2D float array [0, 1] to base64 encoded PNG data URI"""
    clipped = np.clip(array_2d * 255.0, 0, 255).astype(np.uint8)
    img = Image.fromarray(clipped)
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    b64_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"

def mask_to_base64_png(mask_2d: np.ndarray) -> str:
    """
    Renders 2D segmentation mask with subregion colors to RGBA base64 PNG:
    1: Enhancing Tumour (Rose/Red)
    2: Tumour Core (Blue)
    3: Oedema (Green)
    """
    h, w = mask_2d.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    
    for subregion_id, color_info in SUBREGION_COLORS.items():
        sub_mask = (mask_2d == subregion_id)
        if np.any(sub_mask):
            rgba[sub_mask] = color_info["rgba"]
            
    img = Image.fromarray(rgba, mode="RGBA")
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    b64_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"

def overlay_to_base64_png(slice_2d: np.ndarray, mask_2d: np.ndarray, opacity: float = 0.55) -> str:
    """Blends grayscale slice with colored segmentation mask"""
    gray = np.clip(slice_2d * 255.0, 0, 255).astype(np.uint8)
    rgb = np.stack([gray, gray, gray], axis=-1).astype(np.float32)
    
    for subregion_id, color_info in SUBREGION_COLORS.items():
        sub_mask = (mask_2d == subregion_id)
        if np.any(sub_mask):
            target_color = np.array(color_info["rgba"][:3], dtype=np.float32)
            rgb[sub_mask] = (1.0 - opacity) * rgb[sub_mask] + opacity * target_color
            
    rgb = np.clip(rgb, 0, 255).astype(np.uint8)
    img = Image.fromarray(rgb, mode="RGB")
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    b64_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"

def uncertainty_heatmap_to_base64_png(
    slice_2d: np.ndarray, 
    uncertainty_map: np.ndarray, 
    opacity: float = 0.65,
    threshold: float = 0.1
) -> str:
    """
    Generates an uncertainty heatmap overlay using an amber-cyan colormap:
    Low uncertainty: transparent/cool
    Moderate uncertainty: yellow/amber
    High uncertainty: deep orange/red
    """
    gray = np.clip(slice_2d * 255.0, 0, 255).astype(np.uint8)
    rgb = np.stack([gray, gray, gray], axis=-1).astype(np.float32)
    
    h, w = uncertainty_map.shape
    u_norm = np.clip(uncertainty_map, 0.0, 1.0)
    
    # Active uncertainty mask
    active = u_norm > threshold
    
    # Colormap calculation:
    # 0.0 -> Cool Cyan [34, 211, 238]
    # 0.5 -> Warm Amber [245, 158, 11]
    # 1.0 -> High Alert Coral Red [239, 68, 68]
    heat_r = np.clip(u_norm * 2.0 * 255.0, 0, 255)
    heat_g = np.clip((1.0 - np.abs(u_norm - 0.5) * 2.0) * 200.0, 0, 255)
    heat_b = np.clip((1.0 - u_norm) * 220.0, 0, 255)
    heat_rgb = np.stack([heat_r, heat_g, heat_b], axis=-1)
    
    # Blend active regions
    if np.any(active):
        alpha = (u_norm[active, None] ** 0.8) * opacity
        rgb[active] = (1.0 - alpha) * rgb[active] + alpha * heat_rgb[active]
        
    rgb = np.clip(rgb, 0, 255).astype(np.uint8)
    img = Image.fromarray(rgb, mode="RGB")
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    b64_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"
