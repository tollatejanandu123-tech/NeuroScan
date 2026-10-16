# NeuroVision AI - Model Weights Directory

This directory stores deep learning checkpoints and model weight files used by the inference engine.

## Supported Model Checkpoints

Place your trained PyTorch state dict files in this directory with the following naming conventions:

1. **Tumour Classifier (`classifier.pt`)**:
   - **Architecture**: `BrainTumourClassifier` (ResNet-style CNN with 4-stage residual blocks)
   - **Input Shape**: `(Batch, 1, H, W)` - Grayscale normalized brain MRI slice
   - **Output**: Logits for 4 classes:
     - Index 0: `Glioma`
     - Index 1: `Meningioma`
     - Index 2: `Pituitary tumour`
     - Index 3: `No Tumour`
   - **Default File**: `models/classifier.pt`

2. **Baseline Segmentation Model (`segmenter.pt`)**:
   - **Architecture**: `BrainTumourUNet` with Monte Carlo Dropout layers ($p=0.25$)
   - **Input Shape**: `(Batch, 1, H, W)`
   - **Output Channels**: 4 Subregion segmentation classes (BraTS protocol):
     - Channel 0: Background
     - Channel 1: Enhancing Tumour (ET)
     - Channel 2: Tumour Core (TC)
     - Channel 3: Peritumoral Oedema (ED)
   - **Default File**: `models/segmenter.pt`

3. **Lightweight Segmentation Model (`lightweight_segmenter.pt`)**:
   - **Architecture**: `LightweightBrainTumourUNet` with Depthwise-Separable Convolutions and compact channel widths ($16 \to 32 \to 64 \to 128$)
   - **Default File**: `models/lightweight_segmenter.pt`

## Automatic Fallback & Calibrated Weights

If custom `.pt` files are not placed in this folder, the backend automatically boots with **calibrated seed weights** and built-in research demonstration scans. The system performs genuine PyTorch tensor operations, convolutions, Monte Carlo stochastic forward passes, predictive entropy calculations, and Marching Cubes 3D surface extraction.

## Saving Checkpoints from Training Scripts

When training in PyTorch, save only the model's `state_dict`:
```python
import torch

# Save trained model weights
torch.save(model.state_dict(), "models/segmenter.pt")
```
