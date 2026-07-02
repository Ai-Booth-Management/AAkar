from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlmodel import Session, select
from typing import Optional, List
from datetime import datetime, timezone
import os
import io
import math
import numpy as np
import piexif
from PIL import Image, ImageChops, ImageEnhance, ImageFilter
from scipy.fft import fft2, fftshift
from scipy.ndimage import gaussian_filter, sobel
from pydantic import BaseModel

from app.infrastructure.db.sqlite_client import get_session
from app.domain.models.volunteer import Task, Volunteer
from app.domain.models.hierarchy import HierarchyNode
from app.core.security import get_current_user
from app.domain.models.user import User

router = APIRouter()

# ─── Request/Response Models ──────────────────────────────────────────────────

class ResolveTaskRequest(BaseModel):
    action: str  # "approve" | "reject"
    rejection_reason: Optional[str] = None

# ─── Distance Calculation ─────────────────────────────────────────────────────

def haversine(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """Calculate the great circle distance in meters between two points."""
    lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return c * 6371000  # radius of Earth in meters

# ─── Image Forensic Algorithms ────────────────────────────────────────────────

def extract_exif_gps(image_path: str):
    """Extract EXIF metadata and GPS coordinates if present."""
    data = {
        "device": "",
        "software": "",
        "timestamp": "",
        "coordinates": None,
        "warnings": []
    }
    try:
        exif_dict = piexif.load(image_path)
        
        # Helper to decode bytes safely
        def decode_val(v):
            if isinstance(v, bytes):
                try:
                    return v.decode('utf-8', errors='ignore').strip('\x00')
                except:
                    return repr(v)
            return v

        # Software
        if "0th" in exif_dict:
            make = decode_val(exif_dict["0th"].get(piexif.ImageIFD.Make, ""))
            model = decode_val(exif_dict["0th"].get(piexif.ImageIFD.Model, ""))
            if make or model:
                data["device"] = f"{make} {model}".strip()
            data["software"] = decode_val(exif_dict["0th"].get(piexif.ImageIFD.Software, ""))

        # Timestamp
        if "Exif" in exif_dict:
            data["timestamp"] = decode_val(exif_dict["Exif"].get(piexif.ExifIFD.DateTimeOriginal, ""))

        # GPS Coordinates
        if "GPS" in exif_dict and exif_dict["GPS"]:
            gps = exif_dict["GPS"]
            
            def convert_to_degrees(value):
                d = float(value[0][0]) / float(value[0][1])
                m = float(value[1][0]) / float(value[1][1])
                s = float(value[2][0]) / float(value[2][1])
                return d + (m / 60.0) + (s / 3600.0)

            try:
                lat = convert_to_degrees(gps.get(piexif.GPSIFD.GPSLatitude))
                lon = convert_to_degrees(gps.get(piexif.GPSIFD.GPSLongitude))
                
                lat_ref = gps.get(piexif.GPSIFD.GPSLatitudeRef, b'N').decode()
                lon_ref = gps.get(piexif.GPSIFD.GPSLongitudeRef, b'E').decode()

                if lat_ref == 'S': lat = -lat
                if lon_ref == 'W': lon = -lon
                
                data["coordinates"] = {"latitude": round(lat, 6), "longitude": round(lon, 6)}
            except Exception:
                pass
    except Exception as e:
        data["warnings"].append(f"Failed to load EXIF: {str(e)}")
        
    return data

def run_ela(image_path: str, quality: int = 95, error_scale: float = 10.0):
    """Run Error Level Analysis and compute an ELA difference metrics dictionary."""
    try:
        original = Image.open(image_path).convert("RGB")
        
        # Save to buffer at a lower quality
        buf = io.BytesIO()
        original.save(buf, "JPEG", quality=quality)
        buf.seek(0)
        compressed = Image.open(buf).convert("RGB")
        
        # Calculate pixel-wise absolute difference
        diff = ImageChops.difference(original, compressed)
        
        # Calculate enhancement scale
        extrema = diff.getextrema()
        max_diff = max([ex[1] for ex in extrema])
        if max_diff == 0:
            max_diff = 1
        scale = (255.0 / max_diff) * (error_scale / 10.0)
        
        # Enhance difference image and save it as temporary file next to the original
        ela_img = ImageEnhance.Brightness(diff).enhance(scale)
        ela_path = image_path.replace(".jpg", "_ela.jpg").replace(".png", "_ela.jpg")
        ela_img.save(ela_path, "JPEG", quality=85)
        
        # Calculate difference metrics
        diff_np = np.asarray(diff, dtype=np.float32)
        mean_val = float(diff_np.mean())
        std_val = float(diff_np.std())
        max_val = float(diff_np.max())
        
        original.close()
        compressed.close()
        diff.close()
        
        return {
            "ela_image_url": f"/api/v1/forensics/tasks/ela-image?path={ela_path}",
            "metrics": {
                "max_diff": max_val,
                "mean_diff": mean_val,
                "std_diff": std_val,
                "anomaly_score": round(mean_val + 2 * std_val, 3)
            }
        }
    except Exception as e:
        return {"error": f"ELA failed: {str(e)}"}

def run_noise_inconsistency(image_path: str):
    """Perform Noise Inconsistency analysis by checking high frequency variance across blocks."""
    try:
        img = Image.open(image_path).convert('RGB')
        channels = img.split()
        variance_per_channel = []
        
        for c in channels:
            blurred = c.filter(ImageFilter.GaussianBlur(radius=2.0))
            diff = ImageChops.difference(c, blurred)
            noise_array = np.asarray(diff, dtype=np.float32)
            variance_per_channel.append(float(np.var(noise_array)))
            
        noise_map = Image.merge('RGB', [ImageChops.multiply(ImageChops.difference(c, c.filter(ImageFilter.GaussianBlur(radius=2.0))), ImageChops.difference(c, c.filter(ImageFilter.GaussianBlur(radius=2.0)))) for c in channels])
        noise_path = image_path.replace(".jpg", "_noise.jpg").replace(".png", "_noise.jpg")
        noise_map.save(noise_path, "JPEG")
        
        # Compute local variance consistency across blocks
        gray = img.convert('L')
        gray_array = np.asarray(gray, dtype=np.float32)
        h, w = gray_array.shape
        block_size = 64
        block_variances = []
        for i in range(0, h - block_size, block_size):
            for j in range(0, w - block_size, block_size):
                block = gray_array[i:i+block_size, j:j+block_size]
                block_variances.append(float(np.var(block)))
                
        var_std = float(np.std(block_variances)) if block_variances else 0
        img.close()
        
        return {
            "noise_map_url": f"/api/v1/forensics/tasks/noise-image?path={noise_path}",
            "overall_noise_variance": round(np.mean(variance_per_channel), 3),
            "block_variance_std": round(var_std, 3),
            "inconsistent": var_std > np.mean(block_variances) * 0.5 if block_variances else False
        }
    except Exception as e:
        return {"error": f"Noise analysis failed: {str(e)}"}

def run_resampling_detection(image_path: str):
    """Detect image resampling periodic patterns in high-pass gradients."""
    try:
        img = Image.open(image_path).convert('L')
        img_array = np.array(img, dtype=np.float32)
        img.close()
        
        blurred = gaussian_filter(img_array, sigma=1.0)
        high_pass = img_array - blurred
        
        fft_result = fft2(high_pass)
        magnitude = np.abs(fftshift(fft_result))
        
        h, w = magnitude.shape
        center_h, center_w = h // 2, w // 2
        peak_count = 0
        magnitude_threshold = np.percentile(magnitude, 95)
        
        for r in range(5, min(center_h, center_w), 15):
            y, x = np.ogrid[:h, :w]
            distance = np.sqrt((y - center_h)**2 + (x - center_w)**2)
            mask = (distance >= r) & (distance < r + 5)
            if np.any(magnitude[mask] > magnitude_threshold):
                peak_count += 1
                
        resampling_score = peak_count / max(1, (min(center_h, center_w) - 5) // 15)
        return {
            "resampling_score": round(resampling_score, 3),
            "resampling_detected": resampling_score > 0.5
        }
    except Exception as e:
        return {"error": f"Resampling analysis failed: {str(e)}"}

def run_synthetic_detection(image_path: str):
    """Heuristic GAN/diffusion image detection checking correlation and edge std."""
    try:
        img = Image.open(image_path).convert('RGB')
        img_array = np.array(img, dtype=np.float32)
        img.close()
        
        # Analyze frequency domain variances
        gray = np.mean(img_array, axis=2)
        fft_result = fft2(gray)
        magnitude = np.abs(fftshift(fft_result))
        h, w = magnitude.shape
        center_h, center_w = h // 2, w // 2
        
        high_freq = magnitude[center_h-20:center_h+20, center_w-20:center_w+20]
        high_freq_var = float(np.var(high_freq))
        
        # Color correlations
        r, g, b = img_array[:, :, 0], img_array[:, :, 1], img_array[:, :, 2]
        r_sub = r[::4, ::4].ravel()
        g_sub = g[::4, ::4].ravel()
        b_sub = b[::4, ::4].ravel()
        
        rg_corr = float(np.corrcoef(r_sub, g_sub)[0, 1])
        rb_corr = float(np.corrcoef(r_sub, b_sub)[0, 1])
        gb_corr = float(np.corrcoef(g_sub, b_sub)[0, 1])
        avg_channel_corr = float(np.mean([rg_corr, rb_corr, gb_corr]))
        
        # Sobel edge variance
        grad_x = sobel(gray, axis=1)
        grad_y = sobel(gray, axis=0)
        grad_mag = np.sqrt(grad_x**2 + grad_y**2)
        edge_sharpness = float(np.std(grad_mag))
        
        # Simple heuristic classification
        is_synthetic = avg_channel_corr > 0.98 and high_freq_var > 1e7
        
        return {
            "synthetic_score": round(avg_channel_corr * 100, 1),
            "frequency_variance": round(high_freq_var, 3),
            "edge_sharpness": round(edge_sharpness, 3),
            "is_synthetic": bool(is_synthetic)
        }
    except Exception as e:
        return {"error": f"Synthetic detection failed: {str(e)}"}

# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/tasks/pending")
def list_pending_tasks(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all volunteer tasks submitted for manual review."""
    tasks = session.exec(select(Task).where(Task.status == "under_review")).all()
    result = []
    for t in tasks:
        vol = session.get(Volunteer, t.volunteer_id)
        result.append({
            "id": t.id,
            "volunteer_name": vol.name if vol else "Unknown",
            "volunteer_phone": vol.phone if vol else "",
            "booth_id": t.booth_id,
            "title": t.title,
            "description": t.description,
            "assigned_at": t.assigned_at.isoformat() if t.assigned_at else None,
            "completed_at": t.completed_at.isoformat() if t.completed_at else None,
            "has_proof": bool(t.proof_image_path)
        })
    return result

def run_forensic_pipeline(task_id: int, session: Session):
    """Run the 5-point forensic pipeline on a task's proof image and calculate the authenticity score."""
    task = session.get(Task, task_id)
    if not task:
        return {"error": "Task not found"}
    if not task.proof_image_path or not os.path.exists(task.proof_image_path):
        return {"error": "Proof image file is missing"}

    path = task.proof_image_path
    
    # 1. Metadata Forensics
    metadata = extract_exif_gps(path)
    
    # Verify GPS location match against booth coordinates if present
    gps_match = {
        "checked": False,
        "booth_lat": None,
        "booth_lng": None,
        "distance_meters": None,
        "within_bounds": True,
        "warning": None
    }
    
    booth = session.exec(select(HierarchyNode).where(HierarchyNode.code == task.booth_id)).first()
    if booth and booth.latitude and booth.longitude:
        gps_match["booth_lat"] = booth.latitude
        gps_match["booth_lng"] = booth.longitude
        
        if metadata["coordinates"]:
            lat = metadata["coordinates"]["latitude"]
            lng = metadata["coordinates"]["longitude"]
            dist = haversine(lng, lat, booth.longitude, booth.latitude)
            gps_match["checked"] = True
            gps_match["distance_meters"] = round(dist, 1)
            gps_match["within_bounds"] = dist <= 500.0  # 500 meters threshold
            if dist > 500.0:
                gps_match["warning"] = f"Image coordinates are {round(dist/1000, 2)}km away from the booth!"
        else:
            gps_match["warning"] = "No GPS metadata in image to verify location!"
    else:
        gps_match["warning"] = "Booth coordinates are missing in system!"

    # 2. ELA
    ela_res = run_ela(path)
    
    # 3. Noise Map
    noise_res = run_noise_inconsistency(path)
    
    # 4. Resampling Detection
    resampling_res = run_resampling_detection(path)
    
    # 5. Synthetic AI Detection
    synthetic_res = run_synthetic_detection(path)

    # General authenticity score calculation
    deductions = 0
    if not metadata["device"]: deductions += 15
    if "Photoshop" in metadata["software"] or "GIMP" in metadata["software"]: deductions += 35
    if gps_match["checked"] and not gps_match["within_bounds"]: deductions += 40
    if not metadata["coordinates"]: deductions += 10
    if resampling_res.get("resampling_detected"): deductions += 20
    if synthetic_res.get("is_synthetic"): deductions += 50
    
    auth_score = max(0, 100 - deductions)

    return {
        "task_id": task_id,
        "authenticity_score": auth_score,
        "metadata": {
            "device": metadata["device"],
            "software": metadata["software"],
            "timestamp": metadata["timestamp"],
            "coordinates": metadata["coordinates"],
            "gps_match": gps_match
        },
        "ela": ela_res,
        "noise": noise_res,
        "resampling": resampling_res,
        "synthetic": synthetic_res
    }

@router.post("/analyze/{task_id}")
def analyze_task_image(
    task_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Run all 5 forensic image verification algorithms on a task proof image."""
    res = run_forensic_pipeline(task_id, session)
    if "error" in res:
        raise HTTPException(status_code=404 if "not found" in res["error"] else 400, detail=res["error"])
    return res

@router.post("/tasks/{task_id}/resolve")
def resolve_task(
    task_id: int,
    req: ResolveTaskRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Approve or reject a pending volunteer task submission."""
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    vol = session.get(Volunteer, task.volunteer_id)
    if not vol:
        raise HTTPException(status_code=404, detail="Volunteer not found")

    if req.action == "approve":
        task.status = "completed"
        task.completed_at = datetime.now(timezone.utc)
        
        # Mark volunteer and constituency as covered
        vol.coverage_status = "covered"
        session.add(vol)
        
        if vol.constituency:
            # Mark constituency covered
            from app.domain.models.campaign import ConstituencyCoverage
            cov = session.exec(
                select(ConstituencyCoverage)
                .where(ConstituencyCoverage.constituency == vol.constituency)
            ).first()
            if cov:
                cov.covered = True
                cov.covered_by = vol.name
                cov.covered_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
                cov.updated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
                session.add(cov)
                
        session.add(task)
        session.commit()
        return {"status": "approved"}
        
    elif req.action == "reject":
        # Reset back to assigned so they can try again
        task.status = "assigned"
        # Optional: remove proof image path
        if task.proof_image_path and os.path.exists(task.proof_image_path):
            try:
                os.remove(task.proof_image_path)
            except:
                pass
            # Try to remove ELA and noise maps too
            for suffix in ["_ela.jpg", "_noise.jpg"]:
                p = task.proof_image_path.replace(".jpg", suffix).replace(".png", suffix)
                if os.path.exists(p):
                    try: os.remove(p)
                    except: pass
        task.proof_image_path = None
        task.completed_at = None
        session.add(task)
        session.commit()
        return {"status": "rejected"}
        
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

@router.get("/tasks/ela-image")
def get_ela_image(path: str):
    """Serve a generated ELA difference image."""
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(path, media_type="image/jpeg")

@router.get("/tasks/noise-image")
def get_noise_image(path: str):
    """Serve a generated Noise map difference image."""
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(path, media_type="image/jpeg")
