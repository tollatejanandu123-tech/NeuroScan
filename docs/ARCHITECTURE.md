# NeuroVision AI - System Architecture & Technical Specifications

NeuroVision AI is a modular clinical decision-support research application designed for uncertainty-guided brain tumour classification, multi-subregion segmentation, 3D surface reconstruction, and automated quality assessment.

## High-Level System Architecture

```
[ Frontend: React 19 + TypeScript + Vite + Tailwind CSS ]
    ├── Interactive 2D MRI Slice Viewer (Axial Navigation & Opacity Blending)
    ├── Interactive 3D Surface Reconstruction (Three.js WebGL + Orbit Controls)
    ├── Uncertainty Heatmap Viewer (Amber-Cyan Dispersion Gradient)
    ├── Classification Probability Distribution (Recharts)
    ├── Automated 8-Rule Quality Assessment Panel
    ├── Human Review & Risk Stratification Alert
    └── Export Engine (jsPDF Client Report, STL, OBJ, CSV, JSON)
             ▲
             │ RESTful HTTP / JSON / Binary Streams
             ▼
[ Backend: Python 3.13 + FastAPI + PyTorch CPU/CUDA ]
    ├── Preprocessing & Medical I/O Engine (NiBabel, Pillow, SciPy)
    │     ├── NIfTI (.nii, .nii.gz) Spatial Header & Affine Decomposition
    │     ├── 2D Planar MRI Normalization & Grayscale Encoding
    │     └── Base64 PNG Streaming & Multi-Plane Slice Extractor
    ├── Deep Learning Inference Pipelines
    │     ├── 4-Class CNN Transfer Classifier (Glioma, Meningioma, Pituitary, Normal)
    │     ├── Baseline 4-Stage Multi-Subregion U-Net
    │     └── Compact Depthwise-Separable Lightweight U-Net
    ├── Uncertainty Estimation Service
    │     ├── Test-Time Monte Carlo Dropout (T = 4–16 Stochastic Passes)
    │     ├── Predictive Entropy H(y|x) & Normalized Boundary Dispersion Map
    │     └── XOR Morphological Boundary Zone Dispersion Scorer
    ├── 3D Surface Extraction Service
    │     ├── Marching Cubes Isosurface Polygonization (scikit-image)
    │     ├── Physical Voxel Spacing mm Calibration & Centering
    │     └── Direct Binary STL & Wavefront OBJ Mesh Exporters
    ├── Quantitative Morphometry Service
    │     ├── Physical Volumetric Integration in cm³ & mL (using dx, dy, dz)
    │     ├── 3D Bounding Box & Maximum Diagonal Extent mm
    │     └── Subregion Proportions (Enhancing Core, Tumour Core, Oedema)
    ├── 8-Check Automated Quality Assessment Engine
    │     ├── Format & Array Integrity (Zero NaN / Inf check)
    │     ├── Dimensionality & Spatial Metadata Validation
    │     ├── Laplacian Motion Blur Detection (Var(∇²I))
    │     ├── Soft-Tissue Contrast & Dynamic Range (RMS Dispersion)
    │     ├── Boundary Predictive Dispersion Threshold Check
    │     ├── Morphological Component Clustering (Connected Component Labeling)
    │     ├── Cranial Field-of-View Distribution Sanity
    │     └── Classifier-Segmenter Cross-Modal Congruency Check
    └── Risk-Stratified Human Review Recommender
```

## Mathematical Formulations

### 1. Monte Carlo Dropout Uncertainty
For $T$ stochastic forward passes with active dropout $p$ at test time:
$$\bar{p}_c(x) = \frac{1}{T} \sum_{t=1}^T p_c^{(t)}(x)$$

Predictive Entropy:
$$H(y \mid x) = -\sum_{c=1}^C \bar{p}_c(x) \log\left(\bar{p}_c(x) + \epsilon\right)$$

Normalized Uncertainty Map:
$$U(x) = \frac{H(y \mid x)}{\ln(C)} \in [0.0, 1.0]$$

Boundary Zone Dispersion Score:
$$U_{\text{boundary}} = \frac{1}{|B|} \sum_{x \in B} U(x), \quad \text{where } B = \text{Dilate}(M) \oplus \text{Erode}(M)$$

### 2. Physical 3D Volume Integration
Given segmented voxel count $N$ and NIfTI diagonal zoom factors $(s_x, s_y, s_z)$ in millimeters:
$$V_{\text{tumour}} = N \cdot (s_x \cdot s_y \cdot s_z) \text{ mm}^3 = \frac{N \cdot s_x \cdot s_y \cdot s_z}{1000} \text{ mL} \ (\text{or cm}^3)$$

### 3. Image Acuity / Blur Estimation
Estimated via discrete 2D Laplacian operator convolution:
$$\text{Blur Score} = \text{Var}\left(\nabla^2 I\right) = \frac{1}{|I|} \sum_{x,y} \left(\nabla^2 I(x,y) - \mu_{\nabla^2}\right)^2$$
Values below $40.0$ flag potential motion artifacts or degraded high-frequency anatomical margins.
