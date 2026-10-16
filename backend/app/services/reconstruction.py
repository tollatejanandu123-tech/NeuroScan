import os
import io
import struct
import numpy as np
from skimage import measure
from scipy import ndimage
from typing import Dict, Any, List, Optional, Tuple
from ..schemas.analysis import MeshData, MeshSubregion
from ..config import SUBREGION_COLORS, UPLOADS_DIR

def extract_3d_mesh_from_mask(
    mask_3d: np.ndarray,
    voxel_spacing: Optional[List[float]] = None,
    step_size: int = 1
) -> Dict[str, Any]:
    """
    Extracts 3D polygonal surface meshes from volumetric segmentation masks using Marching Cubes.
    Calibrates vertices with physical voxel spacing (dx, dy, dz) in millimeters.
    """
    if mask_3d.ndim != 3:
        return {"is_available": False, "reason": "Requires 3D volumetric segmentation mask."}

    tumour_mask = mask_3d > 0
    if not np.any(tumour_mask):
        return {"is_available": False, "reason": "No tumour voxels found in 3D volume."}

    spacing = tuple(voxel_spacing[:3]) if voxel_spacing and len(voxel_spacing) >= 3 else (1.0, 1.0, 1.0)
    
    # Pad volume by 1 voxel to ensure closed surface boundaries
    padded = np.pad(tumour_mask.astype(np.float32), pad_width=1, mode='constant', constant_values=0)
    
    # Smooth slightly to remove voxel grid staircasing
    smoothed = ndimage.gaussian_filter(padded, sigma=0.8)
    
    try:
        verts, faces, normals, values = measure.marching_cubes(
            smoothed,
            level=0.5,
            spacing=spacing,
            step_size=step_size
        )
    except Exception as e:
        return {"is_available": False, "reason": f"Marching cubes error: {str(e)}"}

    # Center coordinates around geometric midpoint for Three.js
    center = (verts.max(axis=0) + verts.min(axis=0)) / 2.0
    verts_centered = verts - center

    # Subregions surface extraction
    subregion_meshes = []
    
    # 1. Whole Tumour
    subregion_meshes.append({
        "name": "Whole Tumour",
        "color_hex": "#06b6d4",
        "vertices": verts_centered.flatten().tolist(),
        "faces": faces.flatten().tolist(),
        "normals": normals.flatten().tolist(),
        "vertices_count": int(len(verts)),
        "faces_count": int(len(faces))
    })

    # 2. Enhancing Tumour (if present)
    et_mask = (mask_3d == 1)
    if np.sum(et_mask) > 50:
        et_padded = np.pad(et_mask.astype(np.float32), 1, mode='constant', constant_values=0)
        et_smoothed = ndimage.gaussian_filter(et_padded, sigma=0.8)
        try:
            et_v, et_f, et_n, _ = measure.marching_cubes(et_smoothed, level=0.5, spacing=spacing, step_size=step_size)
            et_v_centered = et_v - center
            subregion_meshes.append({
                "name": "Enhancing Tumour",
                "color_hex": "#f43f5e",
                "vertices": et_v_centered.flatten().tolist(),
                "faces": et_f.flatten().tolist(),
                "normals": et_n.flatten().tolist(),
                "vertices_count": int(len(et_v)),
                "faces_count": int(len(et_f))
            })
        except Exception:
            pass

    # 3. Tumour Core (if present)
    tc_mask = (mask_3d == 2)
    if np.sum(tc_mask) > 50:
        tc_padded = np.pad(tc_mask.astype(np.float32), 1, mode='constant', constant_values=0)
        tc_smoothed = ndimage.gaussian_filter(tc_padded, sigma=0.8)
        try:
            tc_v, tc_f, tc_n, _ = measure.marching_cubes(tc_smoothed, level=0.5, spacing=spacing, step_size=step_size)
            tc_v_centered = tc_v - center
            subregion_meshes.append({
                "name": "Tumour Core",
                "color_hex": "#3b82f6",
                "vertices": tc_v_centered.flatten().tolist(),
                "faces": tc_f.flatten().tolist(),
                "normals": tc_n.flatten().tolist(),
                "vertices_count": int(len(tc_v)),
                "faces_count": int(len(tc_f))
            })
        except Exception:
            pass

    # 4. Optional anatomical reference sphere/contour representing cranial bounds
    brain_mesh = generate_cranial_reference_mesh(center, spacing)

    return {
        "is_available": True,
        "subregions": subregion_meshes,
        "brain_reference": brain_mesh,
        "bounding_box_mm": {
            "x_span_mm": round(float(verts[:, 0].max() - verts[:, 0].min()), 2),
            "y_span_mm": round(float(verts[:, 1].max() - verts[:, 1].min()), 2),
            "z_span_mm": round(float(verts[:, 2].max() - verts[:, 2].min()), 2)
        }
    }

def generate_cranial_reference_mesh(center: np.ndarray, spacing: Tuple[float, float, float]) -> Dict[str, Any]:
    """Generates an ellipsoidal anatomical cranial reference cage"""
    u = np.linspace(0, 2 * np.pi, 24)
    v = np.linspace(0, np.pi, 16)
    
    rx, ry, rz = 75.0, 95.0, 70.0  # approximate standard adult human brain radii in mm
    x = rx * np.outer(np.cos(u), np.sin(v)).flatten()
    y = ry * np.outer(np.sin(u), np.sin(v)).flatten()
    z = rz * np.outer(np.ones(np.size(u)), np.cos(v)).flatten()
    
    verts = np.column_stack([x, y, z])
    return {
        "name": "Cranial Reference Envelope",
        "color_hex": "#475569",
        "vertices": verts.flatten().tolist(),
        "is_wireframe": True
    }

def mesh_to_obj_string(vertices: List[float], faces: List[int], normals: Optional[List[float]] = None) -> str:
    """Exports 3D mesh data to Wavefront OBJ format"""
    output = []
    output.append("# NeuroVision AI - 3D Tumour Surface Mesh")
    output.append("# Research Decision Support Prototype")
    
    v_arr = np.array(vertices).reshape(-1, 3)
    for v in v_arr:
        output.append(f"v {v[0]:.4f} {v[1]:.4f} {v[2]:.4f}")
        
    if normals and len(normals) == len(vertices):
        n_arr = np.array(normals).reshape(-1, 3)
        for n in n_arr:
            output.append(f"vn {n[0]:.4f} {n[1]:.4f} {n[2]:.4f}")
            
    f_arr = np.array(faces).reshape(-1, 3)
    for f in f_arr:
        # OBJ indices are 1-based
        output.append(f"f {f[0]+1} {f[1]+1} {f[2]+1}")
        
    return "\n".join(output)

def mesh_to_stl_bytes(vertices: List[float], faces: List[int]) -> bytes:
    """Exports 3D mesh data to Binary STL format"""
    v_arr = np.array(vertices).reshape(-1, 3)
    f_arr = np.array(faces).reshape(-1, 3)
    num_triangles = len(f_arr)
    
    header = b'NeuroVision AI 3D Reconstruction'.ljust(80, b'\0')
    buffer = bytearray(header)
    buffer.extend(struct.pack('<I', num_triangles))
    
    for tri in f_arr:
        v0, v1, v2 = v_arr[tri[0]], v_arr[tri[1]], v_arr[tri[2]]
        # Compute normal
        edge1 = v1 - v0
        edge2 = v2 - v0
        norm = np.cross(edge1, edge2)
        norm_len = np.linalg.norm(norm)
        if norm_len > 1e-6:
            norm = norm / norm_len
        else:
            norm = np.array([0.0, 0.0, 1.0])
            
        # Pack normal and 3 vertices
        buffer.extend(struct.pack('<3f', float(norm[0]), float(norm[1]), float(norm[2])))
        buffer.extend(struct.pack('<3f', float(v0[0]), float(v0[1]), float(v0[2])))
        buffer.extend(struct.pack('<3f', float(v1[0]), float(v1[1]), float(v1[2])))
        buffer.extend(struct.pack('<3f', float(v2[0]), float(v2[1]), float(v2[2])))
        buffer.extend(struct.pack('<H', 0))  # attribute byte count
        
    return bytes(buffer)
