# NeuroVision AI - Datasets & Preprocessing Guide

This guide details recommended publicly available research datasets, their acquisition protocols, subregion mappings, and preprocessing pipelines for training and evaluating NeuroVision AI models.

## Recommended Public Datasets

### 1. BraTS (Brain Tumor Segmentation Challenge 2021–2024)
- **Primary Use**: Volumetric 3D U-Net segmentation and subregion delineation.
- **Modalities Included**: 4 co-registered multi-modal volumes per subject:
  - T1-weighted (`_t1.nii.gz`)
  - T1-contrast enhanced (`_t1ce.nii.gz`)
  - T2-weighted (`_t2.nii.gz`)
  - T2-FLAIR (`_flair.nii.gz`)
- **BraTS Label Mapping**:
  - `0`: Background (Healthy brain tissue & exterior air)
  - `1`: Necrotic & Non-Enhancing Tumour Core (NCR/NET)
  - `2`: Peritumoral Vasogenic Oedema (ED)
  - `4`: GD-Enhancing Tumour (ET)
- **NeuroVision AI Subregion Mapping**:
  - Enhancing Tumour (ET) $\to$ Label 1
  - Tumour Core (TC = NCR + ET) $\to$ Label 2
  - Peritumoral Oedema (ED) $\to$ Label 3

### 2. Figshare Brain Tumor Dataset (Cheng et al.)
- **Primary Use**: 4-class classification (`Glioma`, `Meningioma`, `Pituitary Tumour`, `No Tumour`).
- **Scan Type**: 3,064 T1-weighted contrast-enhanced 2D brain MRI slices.
- **Format**: MATLAB `.mat` containing `image`, `label`, and `tumorMask`.
- **Labels**:
  - `1`: Meningioma (708 slices)
  - `2`: Glioma (1,426 slices)
  - `3`: Pituitary Tumour (930 slices)
  - Non-pathological slices from healthy controls can be extracted from IXI or OASIS cohorts.

### 3. OASIS / IXI Healthy Brain Cohorts
- **Primary Use**: Negative controls ("No Tumour") and reference cranial envelope models.

## Preprocessing Pipeline Protocol

1. **Reorientation**: Convert volumes to standard RAS+ coordinates.
2. **Resampling**: Standardize voxel spacing to $1.0 \times 1.0 \times 1.0 \text{ mm}^3$ (or $1.2 \times 1.2 \times 2.5 \text{ mm}^3$).
3. **Skull Stripping**: Remove non-brain cranial structures using HD-BET or ROBEX.
4. **Intensity Normalization**:
   - Compute non-zero voxel mask $M = \{x \mid I(x) > 0\}$.
   - Apply z-score normalization:
     $$\hat{I}(x) = \frac{I(x) - \mu_M}{\sigma_M}$$
   - Clip intensity outliers to $[1^{\text{st}}, 99^{\text{th}}]$ percentiles.
