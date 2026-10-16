import os
import io
import time
import uuid
import json
import csv
import torch
import numpy as np
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query, Response
from fastapi.responses import JSONResponse, StreamingResponse

from ..config import (
    UPLOADS_DIR,
    DEMO_SCANS_DIR,
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE_MB,
    DEFAULT_MC_DROPOUT_PASSES,
    DEFAULT_UNCERTAINTY_THRESHOLD,
    DEFAULT_CONFIDENCE_THRESHOLD,
    SUBREGION_COLORS
)
from ..schemas.analysis import (
    FileUploadResponse,
    AnalysisRequest,
    AnalysisResponse,
    SliceDataResponse,
    DemoScanItem
)
from ..models.weights_loader import (
    load_or_init_classifier,
    load_or_init_segmenter,
    load_or_init_lightweight_segmenter,
    get_models_capabilities
)
from ..services.preprocessing import (
    load_mri_file,
    normalize_intensity,
    slice_to_base64_png,
    mask_to_base64_png,
    overlay_to_base64_png,
    uncertainty_heatmap_to_base64_png
)
from ..services.uncertainty import analyze_uncertainty
from ..services.measurements import calculate_measurements
from ..services.quality_assessment import run_quality_assessment
from ..services.human_review import evaluate_human_review
from ..services.reconstruction import (
    extract_3d_mesh_from_mask,
    mesh_to_obj_string,
    mesh_to_stl_bytes
)
from ..services.benchmark_service import get_model_benchmark_comparison

router = APIRouter()

# In-memory storage for active sessions/results
UPLOADED_FILES_REGISTRY: Dict[str, Dict[str, Any]] = {}
ANALYSIS_RESULTS_REGISTRY: Dict[str, Dict[str, Any]] = {}

@router.get("/health")
def get_health():
    return {
        "status": "healthy",
        "service": "NeuroVision AI Backend",
        "timestamp": datetime.now().isoformat(),
        "device": "CUDA (GPU)" if torch.cuda.is_available() else "CPU",
        "pytorch_version": torch.__version__
    }

@router.get("/models")
def get_models():
    return get_models_capabilities()

@router.get("/benchmark")
def get_benchmarks():
    return get_model_benchmark_comparison()

@router.get("/demo-scans")
def list_demo_scans():
    items = [
        DemoScanItem(
            id="demo_glioma_volumetric",
            name="Glioblastoma Multiforme (Volumetric 3D NIfTI)",
            category="Glioma",
            is_3d=True,
            format="NIfTI (.nii.gz)",
            dimensions="128 x 128 x 48 (1.2 x 1.2 x 2.5 mm)",
            description="Multi-compartment aggressive glioma featuring enhancing outer rim, hypointense necrotic core, and expansive vasogenic peritumoral oedema."
        ),
        DemoScanItem(
            id="demo_meningioma_2d",
            name="Extra-Axial Convexity Meningioma (2D Axial Slice)",
            category="Meningioma",
            is_3d=False,
            format="PNG (2D Slice)",
            dimensions="256 x 256 px",
            description="Well-circumscribed dural-tail sign convexity meningioma exhibiting homogeneous intense post-gadolinium enhancement."
        ),
        DemoScanItem(
            id="demo_pituitary_2d",
            name="Pituitary Macroadenoma (2D Sellar View)",
            category="Pituitary tumour",
            is_3d=False,
            format="PNG (2D Slice)",
            dimensions="256 x 256 px",
            description="Sellar and suprasellar focal pituitary lesion abutting the optic chiasm with distinct sellar expansion."
        ),
        DemoScanItem(
            id="demo_healthy_volumetric",
            name="Non-Pathological Cranial Scan (Volumetric 3D NIfTI)",
            category="No Tumour",
            is_3d=True,
            format="NIfTI (.nii.gz)",
            dimensions="128 x 128 x 48 (1.2 x 1.2 x 2.5 mm)",
            description="Healthy control scan with symmetric hemispheric sulci, normal ventricular morphology, and absence of mass effect."
        )
    ]
    return items

@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: Optional[UploadFile] = File(None),
    demo_id: Optional[str] = Form(None)
):
    """
    Handles MRI scan uploads or selection of demonstration datasets.
    Validates file extensions, size, dimensionality, and readability.
    """
    file_id = str(uuid.uuid4())
    is_demo = False
    
    if demo_id:
        # Load from pre-configured demo scans
        demo_map = {
            "demo_glioma_volumetric": DEMO_SCANS_DIR / "demo_glioma_volumetric.nii.gz",
            "demo_healthy_volumetric": DEMO_SCANS_DIR / "demo_healthy_volumetric.nii.gz",
            "demo_meningioma_2d": DEMO_SCANS_DIR / "demo_meningioma_2d.png",
            "demo_pituitary_2d": DEMO_SCANS_DIR / "demo_pituitary_2d.png"
        }
        if demo_id not in demo_map or not demo_map[demo_id].exists():
            raise HTTPException(status_code=404, detail="Demo scan not found.")
            
        saved_path = demo_map[demo_id]
        filename = saved_path.name
        is_demo = True
    elif file is not None:
        filename = file.filename
        ext = "".join(Path(filename).suffixes).lower()
        
        # Check extensions
        is_valid_ext = any(filename.lower().endswith(allowed) for allowed in ALLOWED_EXTENSIONS)
        if not is_valid_ext:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format '{ext}'. Supported formats: .nii, .nii.gz, .png, .jpg, .jpeg"
            )
            
        contents = await file.read()
        size_mb = len(contents) / (1024 * 1024)
        if size_mb > MAX_FILE_SIZE_MB:
            raise HTTPException(
                status_code=400,
                detail=f"File exceeds maximum upload size of {MAX_FILE_SIZE_MB} MB."
            )
            
        saved_path = UPLOADS_DIR / f"{file_id}_{filename}"
        with open(saved_path, "wb") as f:
            f.write(contents)
    else:
        raise HTTPException(status_code=400, detail="No file or demo scan ID provided.")

    # Load and validate file
    try:
        mri_info = load_mri_file(str(saved_path))
    except Exception as e:
        if not is_demo and saved_path.exists():
            os.remove(saved_path)
        raise HTTPException(status_code=422, detail=f"Failed to decode MRI file: {str(e)}")

    # Register file in session
    UPLOADED_FILES_REGISTRY[file_id] = {
        "file_id": file_id,
        "filename": filename,
        "path": str(saved_path),
        "is_3d": mri_info["is_3d"],
        "shape": mri_info["shape"],
        "voxel_spacing": mri_info["voxel_spacing"],
        "slice_count": mri_info["slice_count"],
        "modality": mri_info["modality"],
        "is_demo": is_demo
    }

    return FileUploadResponse(
        file_id=file_id,
        filename=filename,
        file_type="3D" if mri_info["is_3d"] else "2D",
        dimensions=mri_info["shape"],
        voxel_spacing=mri_info["voxel_spacing"],
        slice_count=mri_info["slice_count"],
        modality_detected=mri_info["modality"],
        is_demo=is_demo,
        message="Scan successfully verified and prepared for neural inference."
    )

@router.post("/analyze", response_model=AnalysisResponse)
def analyze_scan(request: AnalysisRequest):
    """
    Executes deep learning inference pipeline:
    - Classifier inference
    - Segmentation with Monte Carlo Dropout uncertainty estimation
    - Subregion segmentation
    - 3D Marching Cubes mesh extraction (if 3D)
    - Quantitative measurements
    - 8-check Quality Assessment
    - Human Review recommendation
    """
    file_id = request.file_id
    if file_id not in UPLOADED_FILES_REGISTRY:
        raise HTTPException(status_code=404, detail="File session not found. Please upload again.")

    file_meta = UPLOADED_FILES_REGISTRY[file_id]
    mri_data_dict = load_mri_file(file_meta["path"])
    raw_data = mri_data_dict["data"]
    is_3d = file_meta["is_3d"]
    voxel_spacing = file_meta["voxel_spacing"]
    slice_count = file_meta["slice_count"]
    
    # Determine slice to analyze
    if is_3d:
        selected_slice = request.selected_slice if request.selected_slice is not None else (slice_count // 2)
        selected_slice = max(0, min(slice_count - 1, selected_slice))
        slice_2d = raw_data[:, :, selected_slice]
    else:
        selected_slice = 0
        slice_2d = raw_data

    # Normalize slice
    norm_slice = normalize_intensity(slice_2d)
    
    # 1. Load Models
    classifier = load_or_init_classifier()
    if request.model_type == "lightweight":
        segmenter = load_or_init_lightweight_segmenter()
        model_name = "Compact Depthwise U-Net"
    else:
        segmenter = load_or_init_segmenter()
        model_name = "Baseline Multi-Stage U-Net"

    # 2. Run Classification
    slice_tensor = torch.from_numpy(norm_slice).unsqueeze(0).unsqueeze(0)  # (1, 1, H, W)
    pred_class, confidence, class_probs, cls_latency = classifier.predict_image(slice_tensor)

    # 3. Run Segmentation with Monte Carlo Dropout Uncertainty
    mc_passes = max(2, min(20, request.mc_passes))
    pred_mask_2d, mean_probs, uncertainty_map_2d, seg_latency = segmenter.predict_with_mc_dropout(
        slice_tensor,
        num_passes=mc_passes
    )

    # 4. If 3D, build or extrapolate 3D volume mask for 3D reconstruction and measurements
    if is_3d:
        # Full 3D segmentation volume
        full_mask_3d = np.zeros(raw_data.shape, dtype=np.uint8)
        full_uncertainty_3d = np.zeros(raw_data.shape, dtype=np.float32)
        
        # Segment slices around central mass
        for z in range(slice_count):
            cur_slice = normalize_intensity(raw_data[:, :, z])
            cur_tensor = torch.from_numpy(cur_slice).unsqueeze(0).unsqueeze(0)
            with torch.no_grad():
                # Single pass for full volume to maintain high interactive speed
                logits = segmenter(cur_tensor)
                probs = torch.softmax(logits, dim=1).squeeze(0).cpu().numpy()
                m = np.argmax(probs, axis=0).astype(np.uint8)
                full_mask_3d[:, :, z] = m
                
        # Insert high-precision MC-dropout result on the selected slice
        full_mask_3d[:, :, selected_slice] = pred_mask_2d
        full_uncertainty_3d[:, :, selected_slice] = uncertainty_map_2d
        
        # 3D Marching Cubes Mesh
        mesh_result = extract_3d_mesh_from_mask(full_mask_3d, voxel_spacing=voxel_spacing)
        measurements_result = calculate_measurements(full_mask_3d, is_3d=True, voxel_spacing=voxel_spacing)
        u_summary = analyze_uncertainty(
            uncertainty_map=uncertainty_map_2d,
            mask=pred_mask_2d,
            threshold=request.uncertainty_threshold,
            mc_passes=mc_passes
        )
    else:
        full_mask_3d = None
        mesh_result = {"is_available": False, "reason": "Patient-specific 3D reconstruction requires volumetric 3D scan."}
        measurements_result = calculate_measurements(pred_mask_2d, is_3d=False)
        u_summary = analyze_uncertainty(
            uncertainty_map=uncertainty_map_2d,
            mask=pred_mask_2d,
            threshold=request.uncertainty_threshold,
            mc_passes=mc_passes
        )

    # 5. Quality Assessment
    qa_result = run_quality_assessment(
        image_data=raw_data,
        mask_data=full_mask_3d if is_3d else pred_mask_2d,
        is_3d=is_3d,
        voxel_spacing=voxel_spacing,
        uncertainty_map=uncertainty_map_2d,
        predicted_class=pred_class,
        confidence=confidence,
        inference_latency_ms=cls_latency + seg_latency
    )

    # 6. Human Review Recommendation
    from ..schemas.analysis import ClassificationResult
    cls_obj = ClassificationResult(
        predicted_class=pred_class,
        confidence=round(confidence, 4),
        probabilities=class_probs,
        inference_time_ms=cls_latency,
        model_name="CNN ResNet-Style Classifier",
        status="Configured & Operational"
    )

    review_rec = evaluate_human_review(
        qa_result=qa_result,
        uncertainty_result=u_summary,
        classification_result=cls_obj,
        confidence_threshold=request.confidence_threshold
    )

    result_id = str(uuid.uuid4())

    # Cache full results for slice navigation and export
    ANALYSIS_RESULTS_REGISTRY[result_id] = {
        "result_id": result_id,
        "file_id": file_id,
        "filename": file_meta["filename"],
        "is_3d": is_3d,
        "slice_count": slice_count,
        "selected_slice": selected_slice,
        "raw_data": raw_data,
        "full_mask_3d": full_mask_3d,
        "current_mask_2d": pred_mask_2d,
        "current_uncertainty_2d": uncertainty_map_2d,
        "voxel_spacing": voxel_spacing,
        "classification": cls_obj,
        "measurements": measurements_result,
        "uncertainty": u_summary,
        "quality_assessment": qa_result,
        "human_review": review_rec,
        "mesh_result": mesh_result,
        "model_used": model_name,
        "latency_ms": round(cls_latency + seg_latency, 2),
        "created_at": datetime.now().isoformat()
    }

    return AnalysisResponse(
        result_id=result_id,
        file_id=file_id,
        filename=file_meta["filename"],
        is_3d=is_3d,
        slice_count=slice_count,
        current_slice_index=selected_slice,
        classification=cls_obj,
        measurements=measurements_result,
        uncertainty=u_summary,
        quality_assessment=qa_result,
        human_review=review_rec,
        has_3d_mesh=mesh_result.get("is_available", False),
        model_used=model_name,
        inference_latency_total_ms=round(cls_latency + seg_latency, 2),
        created_at=datetime.now().isoformat()
    )

@router.get("/results/{result_id}")
def get_analysis_result(result_id: str):
    if result_id not in ANALYSIS_RESULTS_REGISTRY:
        raise HTTPException(status_code=404, detail="Analysis result not found.")
    res = ANALYSIS_RESULTS_REGISTRY[result_id]
    return {
        "result_id": result_id,
        "file_id": res["file_id"],
        "filename": res["filename"],
        "is_3d": res["is_3d"],
        "slice_count": res["slice_count"],
        "current_slice_index": res["selected_slice"],
        "classification": res["classification"],
        "measurements": res["measurements"],
        "uncertainty": res["uncertainty"],
        "quality_assessment": res["quality_assessment"],
        "human_review": res["human_review"],
        "has_3d_mesh": res["mesh_result"].get("is_available", False),
        "model_used": res["model_used"],
        "inference_latency_total_ms": res["latency_ms"],
        "created_at": res["created_at"]
    }

@router.get("/results/{result_id}/slice/{slice_idx}", response_model=SliceDataResponse)
def get_slice_data(result_id: str, slice_idx: int):
    """
    Returns image base64, mask base64, overlay base64, and uncertainty base64
    for any selected axial slice index.
    """
    if result_id not in ANALYSIS_RESULTS_REGISTRY:
        raise HTTPException(status_code=404, detail="Analysis result not found.")
        
    res = ANALYSIS_RESULTS_REGISTRY[result_id]
    raw_data = res["raw_data"]
    is_3d = res["is_3d"]
    slice_count = res["slice_count"]
    
    slice_idx = max(0, min(slice_count - 1, slice_idx))
    
    if is_3d:
        slice_2d = raw_data[:, :, slice_idx]
        if res["full_mask_3d"] is not None:
            mask_2d = res["full_mask_3d"][:, :, slice_idx]
        else:
            mask_2d = np.zeros_like(slice_2d, dtype=np.uint8)
    else:
        slice_2d = raw_data
        mask_2d = res["current_mask_2d"]

    norm_slice = normalize_intensity(slice_2d)
    
    # Calculate uncertainty map for this slice
    if slice_idx == res["selected_slice"]:
        u_map = res["current_uncertainty_2d"]
    else:
        # Generate boundary uncertainty representation
        u_map = np.zeros_like(norm_slice, dtype=np.float32)
        if np.any(mask_2d > 0):
            from scipy import ndimage
            dil = ndimage.binary_dilation(mask_2d > 0, iterations=2)
            ero = ndimage.binary_erosion(mask_2d > 0, iterations=2)
            u_map[dil ^ ero] = 0.55

    orig_b64 = slice_to_base64_png(norm_slice)
    mask_b64 = mask_to_base64_png(mask_2d)
    overlay_b64 = overlay_to_base64_png(norm_slice, mask_2d, opacity=0.55)
    u_b64 = uncertainty_heatmap_to_base64_png(norm_slice, u_map)

    subregions_present = []
    for sub_id, info in SUBREGION_COLORS.items():
        if np.any(mask_2d == sub_id):
            subregions_present.append(info["name"])

    return SliceDataResponse(
        slice_index=slice_idx,
        total_slices=slice_count,
        original_image_base64=orig_b64,
        mask_image_base64=mask_b64,
        overlay_image_base64=overlay_b64,
        uncertainty_heatmap_base64=u_b64,
        subregions_present=subregions_present
    )

@router.get("/results/{result_id}/mesh")
def get_mesh_data(result_id: str):
    """Returns 3D Marching Cubes mesh geometry for Three.js"""
    if result_id not in ANALYSIS_RESULTS_REGISTRY:
        raise HTTPException(status_code=404, detail="Analysis result not found.")
    res = ANALYSIS_RESULTS_REGISTRY[result_id]
    mesh_res = res.get("mesh_result", {})
    return mesh_res

@router.get("/results/{result_id}/export/stl")
def export_stl(result_id: str):
    """Exports reconstructed tumour as binary STL"""
    if result_id not in ANALYSIS_RESULTS_REGISTRY:
        raise HTTPException(status_code=404, detail="Analysis result not found.")
    res = ANALYSIS_RESULTS_REGISTRY[result_id]
    mesh_res = res.get("mesh_result", {})
    if not mesh_res.get("is_available"):
        raise HTTPException(status_code=400, detail="3D mesh is unavailable for 2D scans.")

    # Whole Tumour is primary mesh
    sub = mesh_res["subregions"][0]
    stl_bytes = mesh_to_stl_bytes(sub["vertices"], sub["faces"])
    return Response(
        content=stl_bytes,
        media_type="application/sla",
        headers={"Content-Disposition": f"attachment; filename=neurovision_tumour_{result_id[:8]}.stl"}
    )

@router.get("/results/{result_id}/export/obj")
def export_obj(result_id: str):
    """Exports reconstructed tumour as Wavefront OBJ"""
    if result_id not in ANALYSIS_RESULTS_REGISTRY:
        raise HTTPException(status_code=404, detail="Analysis result not found.")
    res = ANALYSIS_RESULTS_REGISTRY[result_id]
    mesh_res = res.get("mesh_result", {})
    if not mesh_res.get("is_available"):
        raise HTTPException(status_code=400, detail="3D mesh is unavailable for 2D scans.")

    sub = mesh_res["subregions"][0]
    obj_str = mesh_to_obj_string(sub["vertices"], sub["faces"], sub.get("normals"))
    return Response(
        content=obj_str,
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename=neurovision_tumour_{result_id[:8]}.obj"}
    )

@router.get("/results/{result_id}/export/summary.json")
def export_json_summary(result_id: str):
    """Exports comprehensive analysis summary in JSON format"""
    if result_id not in ANALYSIS_RESULTS_REGISTRY:
        raise HTTPException(status_code=404, detail="Analysis result not found.")
    res = ANALYSIS_RESULTS_REGISTRY[result_id]
    
    export_dict = {
        "system": "NeuroVision AI Research Prototype",
        "result_id": result_id,
        "input_filename": res["filename"],
        "is_volumetric_3d": res["is_3d"],
        "timestamp": res["created_at"],
        "model_used": res["model_used"],
        "inference_latency_ms": res["latency_ms"],
        "classification": res["classification"].model_dump(),
        "measurements": res["measurements"].model_dump(),
        "uncertainty": res["uncertainty"].model_dump(),
        "quality_assessment": res["quality_assessment"].model_dump(),
        "human_review_recommendation": res["human_review"].model_dump(),
        "disclaimer": "AI-generated research output. Not intended as a substitute for professional medical diagnosis."
    }
    return JSONResponse(
        content=export_dict,
        headers={"Content-Disposition": f"attachment; filename=neurovision_summary_{result_id[:8]}.json"}
    )

@router.get("/results/{result_id}/export/measurements.csv")
def export_measurements_csv(result_id: str):
    """Exports quantitative measurements in CSV format"""
    if result_id not in ANALYSIS_RESULTS_REGISTRY:
        raise HTTPException(status_code=404, detail="Analysis result not found.")
    res = ANALYSIS_RESULTS_REGISTRY[result_id]
    meas = res["measurements"]

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Metric", "Value", "Unit", "Notes"])
    writer.writerow(["Input Scan", res["filename"], "", ""])
    writer.writerow(["Scan Type", "3D Volumetric" if res["is_3d"] else "2D Slice", "", ""])
    writer.writerow(["Predicted Class", res["classification"].predicted_class, "", f"Confidence {res['classification'].confidence*100:.1f}%"])
    writer.writerow(["Total Elements", meas.total_count, "voxels" if res["is_3d"] else "pixels", "AI segmented"])
    
    if res["is_3d"] and meas.total_volume_cm3 is not None:
        writer.writerow(["Total Tumour Volume", meas.total_volume_cm3, "cm3 / mL", "Physical volume calculated with voxel spacing"])
    if not res["is_3d"] and meas.area_percentage_2d is not None:
        writer.writerow(["Tumour Area Occupancy", meas.area_percentage_2d, "%", "Percentage of 2D image matrix"])

    writer.writerow([])
    writer.writerow(["Subregion ID", "Subregion Name", "Count", "Volume (mL)", "Share of Tumour (%)"])
    for sub in meas.subregions:
        vol = sub.volume_ml if sub.volume_ml is not None else "N/A (2D)"
        writer.writerow([sub.subregion_id, sub.name, sub.count, vol, sub.percentage_of_tumour])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=neurovision_measurements_{result_id[:8]}.csv"}
    )
