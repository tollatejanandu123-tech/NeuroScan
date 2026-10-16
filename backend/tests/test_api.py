import pytest
import numpy as np
import torch
from fastapi.testclient import TestClient

from app.main import app
from app.services.preprocessing import normalize_intensity, load_mri_file
from app.services.uncertainty import analyze_uncertainty
from app.services.measurements import calculate_measurements
from app.services.quality_assessment import run_quality_assessment
from app.services.reconstruction import extract_3d_mesh_from_mask
from app.models.classifier import BrainTumourClassifier
from app.models.segmenter import BrainTumourUNet
from app.models.lightweight_segmenter import LightweightBrainTumourUNet

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "pytorch_version" in data

def test_models_endpoint():
    response = client.get("/api/models")
    assert response.status_code == 200
    data = response.json()
    assert "classifier" in data
    assert "segmenter_baseline" in data
    assert "segmenter_lightweight" in data
    assert data["classifier"]["parameters"] > 0
    assert data["segmenter_baseline"]["parameters"] > data["segmenter_lightweight"]["parameters"]

def test_demo_scans_endpoint():
    response = client.get("/api/demo-scans")
    assert response.status_code == 200
    scans = response.json()
    assert len(scans) >= 4
    categories = [s["category"] for s in scans]
    assert "Glioma" in categories
    assert "No Tumour" in categories

def test_preprocessing_normalization():
    dummy = np.array([[0, 50, 100], [150, 200, 250]], dtype=np.float32)
    norm = normalize_intensity(dummy)
    assert norm.min() >= 0.0
    assert norm.max() <= 1.0

def test_classifier_inference():
    model = BrainTumourClassifier(in_channels=1, num_classes=4)
    model.eval()
    tensor = torch.randn(1, 1, 128, 128)
    pred_class, conf, probs, latency = model.predict_image(tensor)
    
    assert pred_class in ["Glioma", "Meningioma", "Pituitary tumour", "No Tumour"]
    assert 0.0 <= conf <= 1.0
    assert len(probs) == 4
    prob_sum = sum(p["probability"] for p in probs)
    assert abs(prob_sum - 1.0) < 1e-4

def test_segmenter_mc_dropout():
    model = BrainTumourUNet(in_channels=1, out_channels=4, mc_dropout_p=0.25)
    tensor = torch.randn(1, 1, 64, 64)
    mask, mean_probs, u_map, latency = model.predict_with_mc_dropout(tensor, num_passes=3)
    
    assert mask.shape == (64, 64)
    assert u_map.shape == (64, 64)
    assert u_map.min() >= 0.0
    assert u_map.max() <= 1.0
    assert latency > 0.0

def test_lightweight_segmenter():
    model = LightweightBrainTumourUNet(in_channels=1, out_channels=4)
    tensor = torch.randn(1, 1, 64, 64)
    mask, mean_probs, u_map, latency = model.predict_with_mc_dropout(tensor, num_passes=2)
    assert mask.shape == (64, 64)

def test_uncertainty_analysis():
    dummy_mask = np.zeros((64, 64), dtype=np.uint8)
    dummy_mask[20:40, 20:40] = 1
    dummy_u = np.full((64, 64), 0.2, dtype=np.float32)
    dummy_u[19:21, 20:40] = 0.6  # high boundary uncertainty
    
    u_summary = analyze_uncertainty(dummy_u, dummy_mask, threshold=0.35, mc_passes=5)
    assert u_summary.mc_passes == 5
    assert u_summary.mean_uncertainty > 0
    assert u_summary.boundary_uncertainty > 0

def test_measurements_3d():
    mask_3d = np.zeros((30, 30, 30), dtype=np.uint8)
    mask_3d[10:20, 10:20, 10:20] = 1  # 1000 voxels
    meas = calculate_measurements(mask_3d, is_3d=True, voxel_spacing=[1.0, 1.0, 1.0])
    
    assert meas.is_3d is True
    assert meas.total_count == 1000
    assert meas.total_volume_cm3 == 1.0  # 1000 mm3 = 1.0 cm3
    assert meas.total_volume_ml == 1.0

def test_measurements_2d():
    mask_2d = np.zeros((100, 100), dtype=np.uint8)
    mask_2d[20:40, 20:40] = 2  # 400 pixels
    meas = calculate_measurements(mask_2d, is_3d=False)
    
    assert meas.is_3d is False
    assert meas.total_count == 400
    assert meas.area_percentage_2d == 4.0

def test_quality_assessment():
    dummy_img = np.ones((128, 128), dtype=np.float32) * 0.5
    dummy_mask = np.zeros((128, 128), dtype=np.uint8)
    dummy_u = np.zeros((128, 128), dtype=np.float32)
    
    qa = run_quality_assessment(
        image_data=dummy_img,
        mask_data=dummy_mask,
        is_3d=False,
        voxel_spacing=None,
        uncertainty_map=dummy_u,
        predicted_class="No Tumour",
        confidence=0.95,
        inference_latency_ms=45.0
    )
    assert qa.overall_status in ["ACCEPTABLE_FOR_REVIEW", "NEEDS_REVIEW", "PROCESSING_FAILED"]
    assert len(qa.checks) == 8

def test_marching_cubes_mesh():
    mask_3d = np.zeros((20, 20, 20), dtype=np.uint8)
    mask_3d[5:15, 5:15, 5:15] = 1
    mesh_res = extract_3d_mesh_from_mask(mask_3d, voxel_spacing=[1.0, 1.0, 1.0])
    
    assert mesh_res["is_available"] is True
    assert len(mesh_res["subregions"]) >= 1
    assert mesh_res["subregions"][0]["vertices_count"] > 0
    assert mesh_res["subregions"][0]["faces_count"] > 0

def test_full_pipeline_with_demo_scan():
    # 1. Trigger startup logic to ensure demo scans exist
    from app.services.demo_generator import generate_demo_scans_if_needed
    generate_demo_scans_if_needed()
    
    # 2. Upload demo scan
    upload_res = client.post("/api/upload", data={"demo_id": "demo_glioma_volumetric"})
    assert upload_res.status_code == 200
    file_id = upload_res.json()["file_id"]
    assert upload_res.json()["file_type"] == "3D"
    
    # 3. Analyze scan
    analyze_res = client.post("/api/analyze", json={
        "file_id": file_id,
        "model_type": "baseline",
        "mc_passes": 4,
        "uncertainty_threshold": 0.35,
        "confidence_threshold": 0.75
    })
    assert analyze_res.status_code == 200
    data = analyze_res.json()
    result_id = data["result_id"]
    assert "classification" in data
    assert "measurements" in data
    assert "uncertainty" in data
    assert "quality_assessment" in data
    assert "human_review" in data
    assert data["has_3d_mesh"] is True
    
    # 4. Fetch slice data
    slice_res = client.get(f"/api/results/{result_id}/slice/24")
    assert slice_res.status_code == 200
    sdata = slice_res.json()
    assert sdata["original_image_base64"].startswith("data:image/png;base64,")
    
    # 5. Fetch 3D mesh
    mesh_res = client.get(f"/api/results/{result_id}/mesh")
    assert mesh_res.status_code == 200
    assert mesh_res.json()["is_available"] is True
    
    # 6. Test exports
    json_export = client.get(f"/api/results/{result_id}/export/summary.json")
    assert json_export.status_code == 200
    csv_export = client.get(f"/api/results/{result_id}/export/measurements.csv")
    assert csv_export.status_code == 200
    stl_export = client.get(f"/api/results/{result_id}/export/stl")
    assert stl_export.status_code == 200
