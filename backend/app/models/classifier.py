import torch
import torch.nn as nn
import torch.nn.functional as F
import time
from typing import Dict, List, Tuple
from ..config import CLASSIFICATION_CLASSES

class ConvBlock(nn.Module):
    def __init__(self, in_channels: int, out_channels: int):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
        )
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.conv(x)

class BrainTumourClassifier(nn.Module):
    """
    CNN Architecture with residual/transfer features for 4-class brain tumour classification:
    - Glioma
    - Meningioma
    - Pituitary tumour
    - No Tumour
    """
    def __init__(self, in_channels: int = 1, num_classes: int = 4):
        super().__init__()
        self.classes = CLASSIFICATION_CLASSES
        
        # Stem
        self.stem = nn.Sequential(
            nn.Conv2d(in_channels, 32, kernel_size=7, stride=2, padding=3, bias=False),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=3, stride=2, padding=1)
        )
        
        # Stages
        self.stage1 = ConvBlock(32, 64)
        self.pool1 = nn.MaxPool2d(2, 2)
        
        self.stage2 = ConvBlock(64, 128)
        self.pool2 = nn.MaxPool2d(2, 2)
        
        self.stage3 = ConvBlock(128, 256)
        self.pool3 = nn.MaxPool2d(2, 2)
        
        self.stage4 = ConvBlock(256, 512)
        
        # Global Pooling and Classifier Head
        self.global_pool = nn.AdaptiveAvgPool2d((1, 1))
        self.dropout = nn.Dropout(p=0.4)
        self.fc = nn.Linear(512, num_classes)
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.stem(x)
        x = self.pool1(self.stage1(x))
        x = self.pool2(self.stage2(x))
        x = self.pool3(self.stage3(x))
        x = self.stage4(x)
        x = self.global_pool(x)
        x = torch.flatten(x, 1)
        x = self.dropout(x)
        logits = self.fc(x)
        return logits

    @torch.no_grad()
    def predict_image(self, input_tensor: torch.Tensor) -> Tuple[str, float, List[Dict[str, float]], float]:
        """
        Runs inference on an input tensor (1, 1, H, W).
        Returns:
            predicted_class (str)
            confidence (float 0.0 - 1.0)
            probabilities (list of dicts)
            inference_time_ms (float)
        """
        self.eval()
        start_time = time.perf_counter()
        
        # Ensure correct shape
        if input_tensor.dim() == 2:
            input_tensor = input_tensor.unsqueeze(0).unsqueeze(0)
        elif input_tensor.dim() == 3:
            input_tensor = input_tensor.unsqueeze(0)
            
        logits = self(input_tensor)
        probs = F.softmax(logits, dim=1).squeeze(0).cpu().numpy()
        
        inference_time_ms = (time.perf_counter() - start_time) * 1000.0
        
        # Format results
        prob_list = []
        for idx, class_name in enumerate(self.classes):
            prob_list.append({
                "class_name": class_name,
                "probability": float(probs[idx])
            })
            
        # Sort by probability descending
        prob_list.sort(key=lambda item: item["probability"], reverse=True)
        top_prediction = prob_list[0]
        
        return top_prediction["class_name"], top_prediction["probability"], prob_list, round(inference_time_ms, 2)
