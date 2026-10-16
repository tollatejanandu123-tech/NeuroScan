# NeuroVision AI: Uncertainty-Guided Brain Tumour Segmentation & Automatic Quality Assessment

![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)
![Python](https://img.shields.io/badge/Python-3.13-teal.svg)
![PyTorch](https://img.shields.io/badge/PyTorch-2.14-orange.svg)
![React](https://img.shields.io/badge/React-19.2-cyan.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.143-emerald.svg)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-sky.svg)

> **Important Regulatory Notice:** NeuroVision AI is an experimental decision-support research prototype designed to assist neuro-radiologists and medical imaging researchers. It is **not** an FDA-cleared or CE-marked diagnostic device. AI predictions must be verified by a board-certified medical professional.

---

## 1. Project Overview

**NeuroVision AI** is a modern, responsive, full-stack medical AI web application for multi-compartment brain tumour classification, multi-subregion segmentation, Monte Carlo Dropout uncertainty estimation, 3D Marching Cubes surface reconstruction, and automated 8-point clinical quality assessment.

### Key Capabilities

1. **Tumour Classification**: Classifies cranial MRI into **Glioma**, **Meningioma**, **Pituitary Tumour**, or **No Tumour** (control) with posterior probability distributions and inference latency tracking.
2. **Multi-Subregion 3D Segmentation**: Delineates three distinct anatomical tumour subregions aligned with BraTS standards:
   - **Enhancing Tumour (ET)**: Active vascularized rim
   - **Tumour Core (TC)**: Necrotic and solid core
   - **Peritumoral Oedema (ED)**: Infiltrative vasogenic fluid
3. **Uncertainty-Guided Boundary Analysis**: Real Monte Carlo Dropout ($T=4\text{--}16$ stochastic forward passes) computing predictive entropy and boundary dispersion scores.
4. **Interactive 3D Tumour Reconstruction**: Real-time Marching Cubes isosurface extraction with physical millimeter voxel spacing calibration, rotatable and zoomable Three.js WebGL canvas, and cranial reference cage.
5. **Quantitative Morphometry**: Computes physical volumes in $\text{cm}^3$ and $\text{mL}$, voxel counts, 3D bounding boxes, and maximum diagonal extents in mm.
6. **Automated 8-Point Quality Assessment**: Rule-based clinical checks auditing format integrity, spatial metadata, Laplacian motion blur ($\text{Var}(\nabla^2 I)$), tissue contrast, uncertainty levels, morphological fragmentation, and cross-modal classifier-segmenter agreement.
7. **Risk-Stratified Human Review**: Triggers actionable recommendations with urgency levels (`CRITICAL`, `HIGH`, `MODERATE`, `LOW`).
8. **Lightweight Model Optimization**: Features a Compact Depthwise-Separable U-Net offering **88% parameter reduction** and **3.4x faster latency** for edge/bedside triage.
9. **Full Results Export**: Downloadable structured JSON summaries, CSV measurements, 3D printable **STL**, CAD **OBJ**, and comprehensive printable **Research PDF Reports** (powered by jsPDF).

---

## 2. Technology Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 8 with Hot Module Replacement (HMR)
- **Styling**: Tailwind CSS v4 with custom medical AI dark theme
- **3D Visualization**: Three.js (WebGL isosurface rendering with orbit controls)
- **Data Analytics**: Recharts (probability bar charts and metric comparisons)
- **Icons**: Lucide React
- **Report Generation**: jsPDF (client-side research PDF document compiler)

### Backend
- **Web Framework**: Python 3.13 with FastAPI and Uvicorn
- **Deep Learning**: PyTorch 2.14 (CPU and CUDA GPU support)
- **Medical Imaging Formats**: NiBabel (3D NIfTI `.nii`, `.nii.gz` volumetric scans)
- **Image Processing**: NumPy 2.5, SciPy, Pillow, scikit-image (Marching Cubes)
- **Validation & Serialization**: Pydantic v2

---

## 3. Project Structure

```
Althon/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI application & startup lifecycle
│   │   ├── config.py                   # Paths, thresholds, and subregion palettes
│   │   ├── api/
│   │   │   └── routes.py               # REST API endpoints (upload, analyze, slice, mesh, export)
│   │   ├── models/
│   │   │   ├── classifier.py           # CNN transfer-learning 4-class classifier
│   │   │   ├── segmenter.py            # Baseline 4-stage U-Net with MC Dropout
│   │   │   ├── lightweight_segmenter.py# Compact Depthwise-Separable U-Net
│   │   │   └── weights_loader.py       # Checkpoint loader & parameter profiler
│   │   ├── services/
│   │   │   ├── preprocessing.py       # NIfTI loader, z-score normalization, base64 overlays
│   │   │   ├── uncertainty.py         # Monte Carlo Dropout & boundary dispersion metrics
│   │   │   ├── quality_assessment.py  # 8-point automated rule-based clinical audit
│   │   │   ├── reconstruction.py      # Marching cubes 3D mesh & STL/OBJ generator
│   │   │   ├── measurements.py        # Volumetric integration (cm3/mL) and 3D extents
│   │   │   ├── human_review.py        # Risk-stratification recommendation engine
│   │   │   ├── benchmark_service.py   # Latency, memory, and Dice/IoU benchmarks
│   │   │   └── demo_generator.py      # Synthetic volumetric NIfTI & 2D demo scans
│   │   └── schemas/
│   │       └── analysis.py            # Pydantic request & response models
│   ├── tests/
│   │   └── test_api.py                # 13 comprehensive unit & integration tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx             # Header navigation with backend status dot
│   │   │   ├── Footer.tsx             # Research attribution & specifications
│   │   │   ├── DisclaimerBanner.tsx   # Prominent regulatory clinical disclaimer
│   │   │   ├── ClassificationCard.tsx # Recharts probability distribution & confidence
│   │   │   ├── MRIViewer2D.tsx        # Axial slice viewer, opacity slider, subregion legend
│   │   │   ├── UncertaintyHeatmapViewer.tsx # Amber-cyan dispersion map & metrics
│   │   │   ├── Tumour3DViewer.tsx     # Three.js 3D mesh canvas with STL/OBJ export
│   │   │   ├── MeasurementsTable.tsx  # Physical volume (cm3/mL), voxels, extents
│   │   │   ├── QualityAssessmentCard.tsx # 8 QA audits, score gauge, warnings
│   │   │   ├── HumanReviewCard.tsx    # Urgency tier, triggered reasons, notice
│   │   │   ├── ModelBenchmarkModal.tsx# Baseline vs Lightweight comparison
│   │   │   └── ExportReportModal.tsx  # jsPDF research report, CSV, JSON, STL/OBJ
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx        # Hero, workflow diagram, feature cards
│   │   │   ├── UploadPage.tsx         # Drag-and-drop, demo selector, model settings
│   │   │   └── DashboardPage.tsx      # Comprehensive clinical analysis dashboard
│   │   ├── services/
│   │   │   └── api.ts                 # Backend API client
│   │   ├── types/
│   │   │   └── index.ts               # TypeScript data models
│   │   ├── App.tsx                    # Root routing & state controller
│   │   └── index.css                  # Tailwind v4 styles & medical gradients
│   ├── vite.config.ts                 # Vite config with @tailwindcss/vite & API proxy
│   └── package.json
├── models/
│   └── README.md                      # Checkpoint placement instructions
├── datasets/
│   └── README.md                      # BraTS & Figshare data preparation guide
├── docs/
│   ├── ARCHITECTURE.md                # System architecture & mathematical formulations
│   └── MODEL_TRAINING_GUIDE.md        # Training scripts, distillation, loss functions
├── .env.example                       # Environment configuration template
└── README.md
```

---

## 4. Installation & Setup

### Prerequisites
- Python 3.10+ (tested on Python 3.13)
- Node.js 18+ and npm (tested on Node v24)

### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Run backend test suite (13 unit and integration tests)
python -m pytest tests/ -v

# Start FastAPI development server on port 8000
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The interactive Swagger API documentation will be available at: `http://127.0.0.1:8000/docs`

### 2. Frontend Setup
```bash
# In a separate terminal, navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Build production bundle (or start development server)
npm run build
npm run dev
```
Open your browser at: `http://localhost:5173`

---

## 5. Built-in Demonstration Scans

NeuroVision AI includes automatic synthetic phantom generation on startup so the system can be thoroughly tested out-of-the-box without downloading gigabytes of external data:

1. **Glioblastoma Multiforme (Volumetric 3D NIfTI)**: A multi-compartment aggressive glioma featuring enhancing outer rim, necrotic core, and expansive vasogenic oedema with genuine affine matrix ($1.2 \times 1.2 \times 2.5\text{ mm}$ spacing).
2. **Extra-Axial Convexity Meningioma (2D Axial Slice)**: Well-circumscribed dural-tail sign convexity meningioma exhibiting homogeneous enhancement.
3. **Pituitary Macroadenoma (2D Sellar View)**: Sellar and suprasellar focal mass abutting the skull base.
4. **Non-Pathological Cranial Scan (Volumetric 3D NIfTI)**: Healthy control brain scan with symmetric ventricles and absence of mass effect.

---

## 6. Exporting Results

NeuroVision AI provides complete export capabilities directly from the Dashboard:
- **Full Research PDF Report**: Formatted clinical research document containing scan metadata, class distributions, volumetric tables, uncertainty indices, and QA scores.
- **Binary STL Mesh**: Watertight 3D mesh ready for medical 3D printing and surgical planning.
- **Wavefront OBJ Mesh**: 3D polygonal surface with vertex normals for CAD or anatomical modeling software.
- **Measurements CSV**: Spreadsheet containing subregion volumes, voxel counts, and percentage shares.
- **Summary JSON**: Machine-readable JSON payload containing all model predictions and audit logs.

---

## 7. Automated Testing

To run the automated backend test suite covering model inference, uncertainty estimation, 3D surface polygonization, image normalization, and API endpoints:
```bash
cd backend
python -m pytest tests/ -v
```

All 13 tests verify:
- Health and model capability endpoints
- Demo scan ingestion and NIfTI decompression
- Robust brain tissue z-score normalization
- CNN classifier inference and probability distribution sums
- U-Net stochastic Monte Carlo Dropout forward passes
- Lightweight compact U-Net inference
- Morphological boundary uncertainty scoring
- 3D physical volume integration ($V = N \times dx \times dy \times dz$) and 2D pixel area
- 8-point automated Quality Assessment heuristic checks
- Marching Cubes 3D surface extraction (vertices, faces, normals)
- Full end-to-end upload $\to$ analysis $\to$ slice streaming $\to$ STL export pipeline

---

## 8. License & Scientific Citation

This project is licensed under the Apache 2.0 License. Developed as a medical imaging and deep learning research decision-support prototype.
