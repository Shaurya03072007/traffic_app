import os
import re
import cv2
import numpy as np
from collections import defaultdict
from typing import Tuple, Optional, Dict, Any, List
from backend.app.utils.logging import logger

VALID_INDIAN_STATES = {
    "AP", "AR", "AS", "BR", "CG", "CH", "DD", "DL", "DN", "GA",
    "GJ", "HP", "HR", "JH", "JK", "KA", "KL", "LA", "LD", "MH",
    "ML", "MN", "MP", "MZ", "NL", "OD", "OR", "PB", "PY", "RJ",
    "SK", "TN", "TR", "TS", "UK", "UP", "WB"
}

PATTERN_STANDARD = re.compile(r"^([A-Z]{2})([0-9]{1,2})([A-Z]{1,3})([0-9]{4})$")
PATTERN_TWO_WHEELER = re.compile(r"^([A-Z]{2})([0-9]{1,2})([A-Z]{0,2})([0-9]{1,4})$")
PATTERN_BHARAT = re.compile(r"^([0-9]{2})BH([0-9]{4})([A-Z]{1,2})$")

DIGIT_TO_LETTER = {'0': 'O', '1': 'I', '2': 'Z', '5': 'S', '6': 'G', '8': 'B'}
LETTER_TO_DIGIT = {'O': '0', 'I': '1', 'Z': '2', 'S': '5', 'G': '6', 'B': '8', 'Q': '9'}

def resolve_model_path(filename: str) -> str:
    candidates = [
        os.path.join("models", filename),
        filename,
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "models", filename),
        os.path.join(os.path.dirname(__file__), "..", "..", "..", filename),
    ]
    for c in candidates:
        if os.path.exists(c):
            return os.path.abspath(c)
    return filename

def levenshtein_distance(s1: str, s2: str) -> int:
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]

class LicensePlateRecognizer:
    """
    High-Precision License Plate Recognition Engine:
    1. Dedicated YOLO Plate Localization (LPD Model & Traffic PNumber Model)
    2. High-resolution Perspective & Contrast Preprocessing (3x Upscale + CLAHE)
    3. EasyOCR with Top-to-Bottom Multi-Line Geometry Sorting
    4. Intelligent Character Disambiguation & Indian State Restoration
    5. Fuzzy Registry Matching (Levenshtein distance <= 2)
    6. Multi-Frame Temporal Consensus across video keyframes
    """
    def __init__(self):
        self.reader = None
        self.plate_detector = None
        
        # 1. Load Plate Detection Model
        try:
            from ultralytics import YOLO
            for cand in ["plate_model.pt", "traffic_violations_yolo.pt"]:
                p_path = resolve_model_path(cand)
                if os.path.exists(p_path):
                    self.plate_detector = YOLO(p_path)
                    logger.info(f"Loaded License Plate detector from: {p_path}")
                    break
        except Exception as e:
            logger.warning(f"Plate model initialization warning: {e}")

        # 2. Load EasyOCR
        try:
            import easyocr
            import torch
            use_gpu = torch.cuda.is_available()
            self.reader = easyocr.Reader(['en'], gpu=use_gpu, verbose=False)
            logger.info("EasyOCR initialized successfully for License Plate recognition.")
        except Exception as e:
            logger.warning(f"EasyOCR initialization warning: {e}")

    def localize_plate(
        self,
        frame: np.ndarray,
        vehicle_box: Optional[Dict[str, Any]] = None,
        pre_detected_plate: Optional[Dict[str, Any]] = None
    ) -> Tuple[Optional[np.ndarray], float, Dict[str, Any]]:
        """
        Extracts the highest-confidence license plate crop from the vehicle or frame.
        """
        h, w = frame.shape[:2]

        # Priority 1: Pre-detected plate box from detector
        if pre_detected_plate:
            px1 = int(max(0, pre_detected_plate["x"]))
            py1 = int(max(0, pre_detected_plate["y"]))
            pw = int(min(w - px1, pre_detected_plate["width"]))
            ph = int(min(h - py1, pre_detected_plate["height"]))
            px2 = px1 + pw
            py2 = py1 + ph
            # Add 8% padding
            pad_x = int(pw * 0.08)
            pad_y = int(ph * 0.08)
            c_x1 = max(0, px1 - pad_x)
            c_y1 = max(0, py1 - pad_y)
            c_x2 = min(w, px2 + pad_x)
            c_y2 = min(h, py2 + pad_y)
            crop = frame[c_y1:c_y2, c_x1:c_x2]
            if crop.size > 0:
                return crop, float(pre_detected_plate.get("confidence", 0.85)), {"box": (c_x1, c_y1, c_x2 - c_x1, c_y2 - c_y1)}

        # Priority 2: Run plate detector on vehicle region
        vehicle_crop = frame
        offset_x, offset_y = 0, 0
        if vehicle_box:
            vx = int(max(0, vehicle_box["x"]))
            vy = int(max(0, vehicle_box["y"]))
            vw = int(min(w - vx, vehicle_box["width"]))
            vh = int(min(h - vy, vehicle_box["height"]))
            if vw > 20 and vh > 20:
                vehicle_crop = frame[vy:vy + vh, vx:vx + vw]
                offset_x, offset_y = vx, vy

        if self.plate_detector and vehicle_crop.size > 0:
            try:
                results = self.plate_detector(vehicle_crop, verbose=False, conf=0.20)
                best_box = None
                best_conf = 0.0
                for r in results:
                    for b in r.boxes:
                        cls_id = int(b.cls[0].item())
                        cls_name = self.plate_detector.names.get(cls_id, "")
                        # Class 3: PNumber in traffic model, or Class 0: License_Plate in LPD model
                        if cls_name in ("PNumber", "License_Plate") or cls_id in (0, 3):
                            b_conf = float(b.conf[0].item())
                            if b_conf > best_conf:
                                best_conf = b_conf
                                xyxy = b.xyxy[0].tolist()
                                best_box = xyxy
                if best_box:
                    bx1, by1, bx2, by2 = int(best_box[0]), int(best_box[1]), int(best_box[2]), int(best_box[3])
                    bw, bh = bx2 - bx1, by2 - by1
                    pad_x = int(bw * 0.10)
                    pad_y = int(bh * 0.10)
                    fx1 = max(0, offset_x + bx1 - pad_x)
                    fy1 = max(0, offset_y + by1 - pad_y)
                    fx2 = min(w, offset_x + bx2 + pad_x)
                    fy2 = min(h, offset_y + by2 + pad_y)
                    crop = frame[fy1:fy2, fx1:fx2]
                    if crop.size > 0:
                        return crop, best_conf, {"box": (fx1, fy1, fx2 - fx1, fy2 - fy1)}
            except Exception as e:
                logger.error(f"Plate detector error: {e}")

        # Priority 3: Geometric vehicle rear / lower quadrant fallback
        if vehicle_box:
            vh_curr = vehicle_crop.shape[0]
            vw_curr = vehicle_crop.shape[1]
            py = int(vh_curr * 0.35)
            ph = int(vh_curr * 0.45)
            px = int(vw_curr * 0.10)
            pw = int(vw_curr * 0.80)
            crop = vehicle_crop[py:py + ph, px:px + pw]
            if crop.size > 0:
                return crop, 0.50, {"box": (offset_x + px, offset_y + py, pw, ph)}

        return None, 0.0, {}

    def read_plate_crop(self, crop: np.ndarray) -> Tuple[str, float]:
        """
        Runs multi-variant OCR on a single plate crop.
        Returns cleaned plate string and OCR confidence.
        """
        if crop is None or crop.size == 0 or not self.reader:
            return "", 0.0

        h, w = crop.shape[:2]
        # 1. High-resolution 3x cubic upscaling
        target_h = max(140, min(300, h * 3))
        scale = target_h / float(max(1, h))
        target_w = max(int(w * scale), 200)

        try:
            upscaled = cv2.resize(crop, (target_w, target_h), interpolation=cv2.INTER_CUBIC)
        except Exception:
            upscaled = crop

        gray = cv2.cvtColor(upscaled, cv2.COLOR_BGR2GRAY) if len(upscaled.shape) == 3 else upscaled.copy()
        clahe = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(8, 8)).apply(gray)
        
        # Test original upscaled and CLAHE variant
        candidates = []
        for im in [upscaled, clahe, gray]:
            try:
                ocr_results = self.reader.readtext(im, detail=1)
                if not ocr_results:
                    continue

                items = []
                for item in ocr_results:
                    if len(item) < 3:
                        continue
                    bbox, text, conf = item[0], item[1], float(item[2])
                    clean = re.sub(r'[^A-Z0-9]', '', text.upper())
                    if not clean:
                        continue
                    ys = [pt[1] for pt in bbox]
                    xs = [pt[0] for pt in bbox]
                    cy = sum(ys) / len(ys)
                    cx = sum(xs) / len(xs)
                    items.append((cy, cx, clean, conf))

                if items:
                    # Sort top-to-bottom for 2-line Indian plates, then left-to-right
                    items.sort(key=lambda x: (x[0], x[1]))
                    raw_str = "".join(x[2] for x in items)
                    avg_conf = sum(x[3] for x in items) / len(items)
                    candidates.append((raw_str, avg_conf))
            except Exception as e:
                logger.debug(f"OCR variant error: {e}")

        if not candidates:
            return "", 0.0

        # Pick candidate with highest confidence
        candidates.sort(key=lambda c: (len(c[0]) >= 6, c[1]), reverse=True)
        best_str, best_conf = candidates[0]
        return best_str, round(best_conf, 2)

    def disambiguate_and_validate(self, text: str) -> Tuple[str, bool]:
        """
        Performs Indian number plate character disambiguation and fuzzy matching.
        """
        if not text:
            return "", False

        cleaned = re.sub(r'[^A-Z0-9]', '', text.upper())
        if len(cleaned) < 4:
            return cleaned, False

        # 1. Fuzzy match against registered database
        try:
            from backend.app.api.admin import REGISTERED_VEHICLES
            for v in REGISTERED_VEHICLES:
                reg_num = v.get("vehicle_number", "")
                if reg_num:
                    dist = levenshtein_distance(cleaned, reg_num)
                    # If very close match (1 or 2 typos)
                    if dist <= 2 and abs(len(cleaned) - len(reg_num)) <= 2:
                        logger.info(f"[PLATE FUZZY MATCH] '{cleaned}' matched registered vehicle '{reg_num}' (dist={dist})")
                        return reg_num, True
        except Exception:
            pass

        # 2. Missing state prefix correction: e.g. "P9AL7175" -> "AP9AL7175"
        # If text begins with e.g. 'P' and next is digit, check if adding 'A' forms valid state 'AP'
        if len(cleaned) >= 7:
            first_char = cleaned[0]
            if first_char == 'P' and cleaned[1].isdigit():
                trial = 'A' + cleaned
                if trial[:2] in VALID_INDIAN_STATES:
                    cleaned = trial
            elif first_char == 'S' and cleaned[1].isdigit():
                trial = 'T' + cleaned
                if trial[:2] in VALID_INDIAN_STATES:
                    cleaned = trial

        # 3. Disambiguate digits in trailing vehicle number (last 4 characters must be digits)
        chars = list(cleaned)
        n = len(chars)
        for i in range(max(0, n - 4), n):
            if chars[i] in LETTER_TO_DIGIT:
                chars[i] = LETTER_TO_DIGIT[chars[i]]

        # Disambiguate state prefix (first 2 characters must be letters)
        if n >= 2:
            if chars[0] in DIGIT_TO_LETTER:
                chars[0] = DIGIT_TO_LETTER[chars[0]]
            if chars[1] in DIGIT_TO_LETTER:
                chars[1] = DIGIT_TO_LETTER[chars[1]]

        resolved = "".join(chars)

        # Check standard Indian patterns
        if PATTERN_STANDARD.match(resolved) and resolved[:2] in VALID_INDIAN_STATES:
            return resolved, True
        if PATTERN_TWO_WHEELER.match(resolved) and resolved[:2] in VALID_INDIAN_STATES:
            return resolved, True
        if PATTERN_BHARAT.match(resolved):
            return resolved, True

        # If it has 7-10 characters and valid state prefix
        if len(resolved) >= 7 and resolved[:2] in VALID_INDIAN_STATES:
            return resolved, True

        return resolved, False

    def extract_license_plate_details(
        self,
        frame: np.ndarray,
        vehicle_box: Optional[Dict[str, Any]] = None,
        plate_box: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Full single-frame license plate recognition pipeline.
        """
        crop, det_conf, meta = self.localize_plate(frame, vehicle_box, plate_box)
        if crop is None:
            return {
                "plate": "UNREADABLE (Manual Review)",
                "confidence": 0.0,
                "status": "NOT_DETECTED",
                "is_registered": False
            }

        raw_text, ocr_conf = self.read_plate_crop(crop)
        if not raw_text:
            return {
                "plate": "UNREADABLE (Manual Review)",
                "confidence": 0.0,
                "status": "OCR_EMPTY",
                "is_registered": False
            }

        final_plate, is_valid = self.disambiguate_and_validate(raw_text)

        # Check registration status
        is_registered = False
        owner_name = None
        try:
            from backend.app.api.admin import REGISTERED_VEHICLES
            for v in REGISTERED_VEHICLES:
                if v.get("vehicle_number") == final_plate:
                    is_registered = True
                    owner_name = v.get("owner_name")
                    break
        except Exception:
            pass

        return {
            "plate": final_plate,
            "confidence": round(float(ocr_conf * 0.7 + det_conf * 0.3), 2),
            "status": "VALID" if is_valid else "UNVALIDATED_FORMAT",
            "is_registered": is_registered,
            "owner_name": owner_name,
            "crop_box": meta.get("box")
        }

    def process_video_frames(self, sampled_frames: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Multi-frame temporal consensus across all sampled motorcycle frames.
        """
        if not sampled_frames:
            return {
                "plate": "UNREADABLE (Manual Review)",
                "confidence": 0.0,
                "status": "NO_FRAMES",
                "is_registered": False
            }

        readings = []
        for sf in sampled_frames:
            frame = sf["frame"]
            moto_box = sf.get("motorcycle_box")
            plate_box = sf.get("plate_box")
            
            crop, det_conf, meta = self.localize_plate(frame, moto_box, plate_box)
            if crop is not None:
                raw_text, ocr_conf = self.read_plate_crop(crop)
                if raw_text:
                    refined, is_valid = self.disambiguate_and_validate(raw_text)
                    readings.append({
                        "text": refined,
                        "raw": raw_text,
                        "is_valid": is_valid,
                        "ocr_conf": ocr_conf,
                        "det_conf": det_conf
                    })

        if not readings:
            return {
                "plate": "UNREADABLE (Manual Review)",
                "confidence": 0.0,
                "status": "UNREADABLE",
                "is_registered": False
            }

        # Temporal consensus voting
        votes: Dict[str, float] = defaultdict(float)
        validity_map = {}
        for r in readings:
            txt = r["text"]
            weight = r["ocr_conf"] * 1.0 + (1.5 if r["is_valid"] else 0.5)
            votes[txt] += weight
            validity_map[txt] = r["is_valid"]

        best_plate = max(votes.keys(), key=lambda k: votes[k])
        is_valid = validity_map.get(best_plate, False)

        # Calculate average confidence
        matching_readings = [r for r in readings if r["text"] == best_plate]
        avg_ocr = sum(r["ocr_conf"] for r in matching_readings) / len(matching_readings)
        avg_det = sum(r["det_conf"] for r in matching_readings) / len(matching_readings)
        composite_conf = round(float(avg_ocr * 0.7 + avg_det * 0.3), 2)

        # Check DB registration
        is_registered = False
        owner_name = None
        try:
            from backend.app.services.supabase_service import supabase_service
            db_v = supabase_service.get_vehicle_by_plate(best_plate)
            if db_v:
                is_registered = True
                owner_name = db_v.get("owner_name")
            else:
                from backend.app.api.admin import REGISTERED_VEHICLES
                for v in REGISTERED_VEHICLES:
                    if v.get("vehicle_number") == best_plate:
                        is_registered = True
                        owner_name = v.get("owner_name")
                        break
        except Exception:
            pass

        return {
            "plate": best_plate,
            "confidence": composite_conf,
            "status": "VALID" if is_valid else "PROBABLE",
            "is_registered": is_registered,
            "owner_name": owner_name,
            "frames_used": len(readings),
            "candidates": list(votes.keys())
        }

plate_recognizer = LicensePlateRecognizer()
