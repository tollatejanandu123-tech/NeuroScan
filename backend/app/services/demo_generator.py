import os
import numpy as np
import nibabel as nib
from PIL import Image
from scipy import ndimage
from ..config import DEMO_SCANS_DIR

def generate_demo_scans_if_needed():
    """
    Creates standard research demo MRI scans on first startup so that
    the web app is immediately testable with both 3D NIfTI and 2D MRI scans.
    """
    os.makedirs(DEMO_SCANS_DIR, exist_ok=True)
    
    glioma_3d_path = DEMO_SCANS_DIR / "demo_glioma_volumetric.nii.gz"
    healthy_3d_path = DEMO_SCANS_DIR / "demo_healthy_volumetric.nii.gz"
    meningioma_2d_path = DEMO_SCANS_DIR / "demo_meningioma_2d.png"
    pituitary_2d_path = DEMO_SCANS_DIR / "demo_pituitary_2d.png"
    
    if not glioma_3d_path.exists():
        create_synthetic_3d_nifti(
            file_path=str(glioma_3d_path),
            has_tumour=True,
            tumour_type="glioma",
            shape=(128, 128, 48),
            spacing=(1.2, 1.2, 2.5)
        )
        
    if not healthy_3d_path.exists():
        create_synthetic_3d_nifti(
            file_path=str(healthy_3d_path),
            has_tumour=False,
            shape=(128, 128, 48),
            spacing=(1.2, 1.2, 2.5)
        )
        
    if not meningioma_2d_path.exists():
        create_synthetic_2d_mri(
            file_path=str(meningioma_2d_path),
            tumour_type="meningioma",
            shape=(256, 256)
        )
        
    if not pituitary_2d_path.exists():
        create_synthetic_2d_mri(
            file_path=str(pituitary_2d_path),
            tumour_type="pituitary",
            shape=(256, 256)
        )

def create_synthetic_3d_nifti(
    file_path: str,
    has_tumour: bool = True,
    tumour_type: str = "glioma",
    shape=(128, 128, 48),
    spacing=(1.0, 1.0, 2.0)
):
    nx, ny, nz = shape
    vol = np.zeros((nx, ny, nz), dtype=np.float32)
    
    # 1. Coordinate grids
    x = np.linspace(-1, 1, nx)[:, None, None]
    y = np.linspace(-1, 1, ny)[None, :, None]
    z = np.linspace(-1, 1, nz)[None, None, :]
    
    # 2. Cranial skull & brain ellipse
    r_skull = (x/0.82)**2 + (y/0.92)**2 + (z/0.85)**2
    skull_mask = (r_skull <= 1.0) & (r_skull >= 0.92)
    vol[skull_mask] = 0.95  # bright cortical bone
    
    r_brain = (x/0.78)**2 + (y/0.88)**2 + (z/0.80)**2
    brain_mask = r_brain <= 1.0
    
    # Gray matter / White matter baseline
    vol[brain_mask] = 0.45 + 0.15 * np.cos(3.0 * np.pi * r_brain[brain_mask])
    
    # Ventricles (CSF - dark on T1)
    r_ventricles = ((x - 0.08)/0.12)**2 + (y/0.38)**2 + (z/0.25)**2
    r_ventricles_left = ((x + 0.08)/0.12)**2 + (y/0.38)**2 + (z/0.25)**2
    ventricle_mask = (r_ventricles < 1.0) | (r_ventricles_left < 1.0)
    vol[ventricle_mask & brain_mask] = 0.12
    
    # 3. Tumour pathology if enabled
    if has_tumour:
        # Fronto-parietal mass centered at (x0, y0, z0)
        cx, cy, cz = 0.28, 0.22, 0.05
        # Peritumoral Oedema (outermost, diffuse hyperintensity on T2/FLAIR)
        r_edema = ((x - cx)/0.26)**2 + ((y - cy)/0.28)**2 + ((z - cz)/0.28)**2
        edema_mask = (r_edema <= 1.0) & brain_mask
        vol[edema_mask] = 0.75 + 0.08 * np.random.randn(*vol[edema_mask].shape)
        
        # Tumour Core (hypointense necrotic center or dense cellular mass)
        r_core = ((x - cx)/0.16)**2 + ((y - cy)/0.18)**2 + ((z - cz)/0.18)**2
        core_mask = (r_core <= 1.0) & brain_mask
        vol[core_mask] = 0.35 + 0.05 * np.random.randn(*vol[core_mask].shape)
        
        # Enhancing Rim (hyperintense post-contrast rim on T1ce)
        rim_mask = (r_core <= 1.0) & (r_core >= 0.55) & brain_mask
        vol[rim_mask] = 0.92 + 0.05 * np.random.randn(*vol[rim_mask].shape)

    # Add realistic mild Rician-like noise and blur
    vol = ndimage.gaussian_filter(vol, sigma=0.6)
    noise = np.random.normal(0, 0.015, vol.shape)
    vol = np.clip(vol + noise, 0.0, 1.0).astype(np.float32)
    
    # Affine matrix with spatial physical voxel spacing
    affine = np.diag([spacing[0], spacing[1], spacing[2], 1.0])
    affine[0, 3] = -nx * spacing[0] / 2.0
    affine[1, 3] = -ny * spacing[1] / 2.0
    affine[2, 3] = -nz * spacing[2] / 2.0
    
    nii_img = nib.Nifti1Image(vol, affine)
    nii_img.header.set_zooms(spacing)
    nib.save(nii_img, file_path)

def create_synthetic_2d_mri(file_path: str, tumour_type: str = "meningioma", shape=(256, 256)):
    nx, ny = shape
    x = np.linspace(-1, 1, nx)[:, None]
    y = np.linspace(-1, 1, ny)[None, :]
    
    img = np.zeros((nx, ny), dtype=np.float32)
    
    # Cranial skull and brain
    r_skull = (x/0.82)**2 + (y/0.92)**2
    skull_mask = (r_skull <= 1.0) & (r_skull >= 0.92)
    img[skull_mask] = 0.95
    
    r_brain = (x/0.78)**2 + (y/0.88)**2
    brain_mask = r_brain <= 1.0
    img[brain_mask] = 0.45 + 0.15 * np.cos(3.0 * np.pi * r_brain[brain_mask])
    
    # Ventricles
    r_v1 = ((x - 0.08)/0.12)**2 + (y/0.38)**2
    r_v2 = ((x + 0.08)/0.12)**2 + (y/0.38)**2
    img[(r_v1 < 1.0) | (r_v2 < 1.0)] = 0.12
    
    if tumour_type == "meningioma":
        # Dural-based convexity mass with vivid enhancement
        cx, cy = 0.55, -0.25
        r_tumour = ((x - cx)/0.18)**2 + ((y - cy)/0.22)**2
        m_mask = (r_tumour <= 1.0) & (r_skull <= 1.05)
        img[m_mask] = 0.90 + 0.04 * np.random.randn(*img[m_mask].shape)
    elif tumour_type == "pituitary":
        # Sellar / suprasellar mass at skull base
        cx, cy = 0.0, 0.10
        r_tumour = ((x - cx)/0.14)**2 + ((y - cy)/0.16)**2
        p_mask = r_tumour <= 1.0
        img[p_mask] = 0.85 + 0.04 * np.random.randn(*img[p_mask].shape)
        
    img = ndimage.gaussian_filter(img, sigma=0.8)
    noise = np.random.normal(0, 0.015, img.shape)
    img = np.clip(img + noise, 0.0, 1.0)
    
    # Save as PNG
    uint8_img = (img * 255.0).astype(np.uint8)
    pil_img = Image.fromarray(uint8_img, mode="L")
    pil_img.save(file_path, format="PNG")
