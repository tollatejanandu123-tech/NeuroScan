# NeuroVision AI - Model Training & Evaluation Guide

This guide outlines end-to-end instructions for training the 4-class classifier, the baseline U-Net with Monte Carlo Dropout, and the lightweight depthwise-separable U-Net.

## 1. Environment Setup

Ensure PyTorch with GPU support (or CPU) is installed:
```bash
pip install -r backend/requirements.txt
```

## 2. Training the 4-Class Brain Tumour Classifier

```python
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from backend.app.models.classifier import BrainTumourClassifier

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = BrainTumourClassifier(in_channels=1, num_classes=4).to(device)

criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4, weight_decay=1e-2)
scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=50)

# Training Loop
for epoch in range(50):
    model.train()
    for images, labels in train_loader:
        images, labels = images.to(device), labels.to(device)
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
    scheduler.step()

# Save checkpoint
torch.save(model.state_dict(), "models/classifier.pt")
```

## 3. Training the Multi-Subregion U-Net with MC Dropout

To enable Monte Carlo Dropout uncertainty estimation at inference time, train with dropout active in the bottleneck and decoder stages ($p=0.25$):

```python
from backend.app.models.segmenter import BrainTumourUNet

model = BrainTumourUNet(in_channels=1, out_channels=4, mc_dropout_p=0.25).to(device)

def combined_dice_ce_loss(pred_logits, target_mask):
    ce_loss = nn.CrossEntropyLoss()(pred_logits, target_mask)
    probs = torch.softmax(pred_logits, dim=1)
    target_one_hot = torch.nn.functional.one_hot(target_mask, num_classes=4).permute(0, 3, 1, 2)
    
    intersection = 2.0 * (probs * target_one_hot).sum(dim=(2, 3))
    union = (probs ** 2).sum(dim=(2, 3)) + (target_one_hot ** 2).sum(dim=(2, 3)) + 1e-6
    dice_loss = 1.0 - (intersection / union).mean()
    return ce_loss + dice_loss

optimizer = torch.optim.AdamW(model.parameters(), lr=2e-4)

# Save weights
torch.save(model.state_dict(), "models/segmenter.pt")
```

## 4. Training the Lightweight Depthwise-Separable U-Net

The compact architecture uses reduced channel widths ($16 \to 32 \to 64 \to 128$) and depthwise-separable convolutions. It can be trained directly or via knowledge distillation from the baseline teacher model:

```python
from backend.app.models.lightweight_segmenter import LightweightBrainTumourUNet

student = LightweightBrainTumourUNet(in_channels=1, out_channels=4, mc_dropout_p=0.2).to(device)

# Distillation Loss: Combines Hard Ground-Truth Loss with Soft Teacher KL Divergence
def distillation_loss(student_logits, teacher_logits, target_mask, temperature=3.0, alpha=0.6):
    hard_loss = combined_dice_ce_loss(student_logits, target_mask)
    soft_loss = nn.KLDivLoss(reduction="batchmean")(
        torch.log_softmax(student_logits / temperature, dim=1),
        torch.softmax(teacher_logits / temperature, dim=1)
    ) * (temperature ** 2)
    return (1.0 - alpha) * hard_loss + alpha * soft_loss

# Save weights
torch.save(student.state_dict(), "models/lightweight_segmenter.pt")
```
