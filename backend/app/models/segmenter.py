import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import time
from typing import Tuple, Dict, Any

class DoubleConv(nn.Module):
    """(Conv2D => BN => LeakyReLU) * 2"""
    def __init__(self, in_channels: int, out_channels: int, dropout_p: float = 0.0):
        super().__init__()
        layers = [
            nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.LeakyReLU(0.1, inplace=True),
            nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.LeakyReLU(0.1, inplace=True),
        ]
        if dropout_p > 0.0:
            layers.append(nn.Dropout2d(p=dropout_p))
        self.double_conv = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.double_conv(x)

class BrainTumourUNet(nn.Module):
    """
    Standard U-Net with Monte Carlo Dropout for Uncertainty Estimation.
    Outputs 4 subregions:
      0: Background
      1: Enhancing Tumour (ET)
      2: Tumour Core (TC)
      3: Peritumoral Oedema (ED)
    """
    def __init__(self, in_channels: int = 1, out_channels: int = 4, mc_dropout_p: float = 0.25):
        super().__init__()
        self.in_channels = in_channels
        self.out_channels = out_channels
        self.mc_dropout_p = mc_dropout_p

        # Encoder
        self.inc = DoubleConv(in_channels, 32)
        self.down1 = nn.Sequential(nn.MaxPool2d(2), DoubleConv(32, 64))
        self.down2 = nn.Sequential(nn.MaxPool2d(2), DoubleConv(64, 128))
        self.down3 = nn.Sequential(nn.MaxPool2d(2), DoubleConv(128, 256, dropout_p=mc_dropout_p))
        
        # Bottleneck
        self.down4 = nn.Sequential(nn.MaxPool2d(2), DoubleConv(256, 512, dropout_p=mc_dropout_p))

        # Decoder
        self.up1 = nn.ConvTranspose2d(512, 256, kernel_size=2, stride=2)
        self.conv_up1 = DoubleConv(512, 256, dropout_p=mc_dropout_p)

        self.up2 = nn.ConvTranspose2d(256, 128, kernel_size=2, stride=2)
        self.conv_up2 = DoubleConv(256, 128, dropout_p=mc_dropout_p)

        self.up3 = nn.ConvTranspose2d(128, 64, kernel_size=2, stride=2)
        self.conv_up3 = DoubleConv(128, 64)

        self.up4 = nn.ConvTranspose2d(64, 32, kernel_size=2, stride=2)
        self.conv_up4 = DoubleConv(64, 32)

        # Output projection
        self.outc = nn.Conv2d(32, out_channels, kernel_size=1)

    def _pad_and_cat(self, x: torch.Tensor, skip: torch.Tensor) -> torch.Tensor:
        diff_y = skip.size(2) - x.size(2)
        diff_x = skip.size(3) - x.size(3)
        if diff_x != 0 or diff_y != 0:
            x = F.pad(x, [diff_x // 2, diff_x - diff_x // 2, diff_y // 2, diff_y - diff_y // 2])
        return torch.cat([x, skip], dim=1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        orig_h, orig_w = x.size(2), x.size(3)
        x1 = self.inc(x)
        x2 = self.down1(x1)
        x3 = self.down2(x2)
        x4 = self.down3(x3)
        x5 = self.down4(x4)

        x = self.up1(x5)
        x = self._pad_and_cat(x, x4)
        x = self.conv_up1(x)

        x = self.up2(x)
        x = self._pad_and_cat(x, x3)
        x = self.conv_up2(x)

        x = self.up3(x)
        x = self._pad_and_cat(x, x2)
        x = self.conv_up3(x)

        x = self.up4(x)
        x = self._pad_and_cat(x, x1)
        x = self.conv_up4(x)

        logits = self.outc(x)
        if logits.size(2) != orig_h or logits.size(3) != orig_w:
            logits = F.interpolate(logits, size=(orig_h, orig_w), mode='bilinear', align_corners=True)
        return logits

    def enable_mc_dropout(self):
        """Enable dropout layers during test-time inference for Monte Carlo estimation."""
        for m in self.modules():
            if isinstance(m, (nn.Dropout, nn.Dropout2d)):
                m.train()

    def predict_with_mc_dropout(
        self, 
        input_tensor: torch.Tensor, 
        num_passes: int = 8
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, float]:
        """
        Runs Monte Carlo Dropout stochastic forward passes.
        Returns:
            predicted_mask: 2D numpy array with class labels (0, 1, 2, 3)
            mean_probs: (num_classes, H, W) numpy array of mean softmax probabilities
            uncertainty_map: 2D numpy array [0.0, 1.0] of predictive entropy / variance
            inference_time_ms: total inference time
        """
        self.eval()
        self.enable_mc_dropout()
        
        if input_tensor.dim() == 2:
            input_tensor = input_tensor.unsqueeze(0).unsqueeze(0)
        elif input_tensor.dim() == 3:
            input_tensor = input_tensor.unsqueeze(0)

        start_time = time.perf_counter()
        
        prob_samples = []
        with torch.no_grad():
            for _ in range(num_passes):
                logits = self(input_tensor)
                probs = F.softmax(logits, dim=1)  # (1, C, H, W)
                prob_samples.append(probs)

        inference_time_ms = (time.perf_counter() - start_time) * 1000.0

        # Stack samples: (T, C, H, W)
        stacked_probs = torch.cat(prob_samples, dim=0)
        
        # Mean predictive probabilities: (C, H, W)
        mean_probs_t = torch.mean(stacked_probs, dim=0)
        
        # Variance across passes: (C, H, W)
        var_probs_t = torch.var(stacked_probs, dim=0)
        
        # Predictive Entropy: H(y|x) = -sum_c p_c * log(p_c + eps)
        eps = 1e-7
        entropy = -torch.sum(mean_probs_t * torch.log(mean_probs_t + eps), dim=0) # (H, W)
        
        # Normalized entropy (max entropy for 4 classes is ln(4) ≈ 1.386)
        norm_entropy = entropy / np.log(self.out_channels)
        
        # Hard mask prediction
        pred_mask_t = torch.argmax(mean_probs_t, dim=0) # (H, W)
        
        # Convert to numpy
        pred_mask = pred_mask_t.cpu().numpy().astype(np.uint8)
        mean_probs = mean_probs_t.cpu().numpy()
        uncertainty_map = norm_entropy.cpu().numpy().astype(np.float32)
        
        # Clip uncertainty to [0.0, 1.0]
        uncertainty_map = np.clip(uncertainty_map, 0.0, 1.0)

        return pred_mask, mean_probs, uncertainty_map, round(inference_time_ms, 2)
