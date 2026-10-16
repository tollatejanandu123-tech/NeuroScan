import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
DATA_DIR = Path(__file__).resolve().parent / "data"
DEMO_SCANS_DIR = DATA_DIR / "demo_scans"
MODELS_DIR = BASE_DIR.parent / "models"

# Ensure directories exist
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(DEMO_SCANS_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

# Allowed file extensions
ALLOWED_EXTENSIONS = {".nii", ".nii.gz", ".png", ".jpg", ".jpeg"}
MAX_FILE_SIZE_MB = 150

# Classification Labels
CLASSIFICATION_CLASSES = [
    "Glioma",
    "Meningioma",
    "Pituitary tumour",
    "No Tumour"
]

# Segmentation Subregions (BraTS convention)
SEGMENTATION_LABELS = {
    0: "Background",
    1: "Enhancing Tumour",
    2: "Tumour Core",
    3: "Peritumoral Oedema"
}

# Colors for overlays (RGBA hex / rgb)
SUBREGION_COLORS = {
    1: {"name": "Enhancing Tumour", "hex": "#f43f5e", "rgba": [244, 63, 94, 200]},  # Rose/Red
    2: {"name": "Tumour Core", "hex": "#3b82f6", "rgba": [59, 130, 246, 200]},       # Blue
    3: {"name": "Peritumoral Oedema", "hex": "#10b981", "rgba": [16, 185, 129, 200]} # Emerald/Green
}

# Model settings
DEFAULT_MC_DROPOUT_PASSES = 8
DEFAULT_UNCERTAINTY_THRESHOLD = 0.35
DEFAULT_CONFIDENCE_THRESHOLD = 0.75

# QA Thresholds
QA_BLUR_THRESHOLD = 40.0         # Laplacian variance below this is considered blurred
QA_MIN_CONTRAST = 18.0           # Standard deviation of intensity inside brain mask
QA_MAX_DISCONNECTED_COMPONENTS = 6
QA_MIN_TUMOUR_VOLUME_ML = 0.1
QA_MAX_TUMOUR_VOLUME_ML = 280.0
