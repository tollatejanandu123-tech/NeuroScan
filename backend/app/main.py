import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.routes import router as api_router
from .services.demo_generator import generate_demo_scans_if_needed
from .models.weights_loader import (
    load_or_init_classifier,
    load_or_init_segmenter,
    load_or_init_lightweight_segmenter
)

app = FastAPI(
    title="NeuroVision AI - Brain Tumour Analysis API",
    description="Uncertainty-Guided Brain Tumour Segmentation & Automatic Quality Assessment System",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    print("[NeuroVision] Starting backend services...")
    # 1. Generate built-in research demonstration scans if not already created
    generate_demo_scans_if_needed()
    print("[NeuroVision] Research demonstration MRI scans verified.")
    
    # 2. Warm up neural network architectures
    load_or_init_classifier()
    load_or_init_segmenter()
    load_or_init_lightweight_segmenter()
    print("[NeuroVision] Deep learning models successfully initialized.")

app.include_router(api_router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "project": "NeuroVision AI",
        "description": "Uncertainty-Guided Brain Tumour Segmentation and Automatic Quality Assessment System",
        "status": "Operational",
        "docs": "/docs"
    }
