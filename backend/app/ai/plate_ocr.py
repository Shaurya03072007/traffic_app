import re
import cv2
import numpy as np
import os
from collections import defaultdict
from typing import Tuple, Optional, Dict, Any, List
from backend.app.utils.logging import logger

# ==============================================================================
# 1. INDIAN LICENSE PLATE VALIDATION (STRICT VALIDATION, ZERO FABRICATION)
# ==============================================================================

VALID_INDIAN_STATES = {
    "AP", "AR", "AS", "BR", "CG", "CH", "DD", "DL", "DN", "GA",
    "GJ", "HP", "HR", "JH", "JK", "KA", "KL", "LA", "LD", "MH",
    "ML", "MN", "MP", "MZ", "NL", "OD", "OR", "PB", "PY", "RJ",
    "SK", "TN", "TR", "TS", "UK", "UP", "WB"
}

# Regex Patterns for validation (NEVER used to manufacture characters)
# 1. Modern High Security Registration Plate (HSRP): e.g. TS09EA4412, DL04BC8921, MH12TR3321
PATTERN_STANDARD = re.compile(r"^([A-Z]{2})([0-9]{1,2})([A-Z]{1,3})([0-9]{4})$")
# 2. Two-Wheeler / Older format without series letters: e.g. TN998281, AP094412
PATTERN_TWO_WHEELER = re.compile(r"^([A-Z]{2})([0-9]{1,2})([0-9]{4})$")
# 3. Bharat Series (BH): e.g. 22BH1234AA
PATTERN_BHARAT = re.compile(r"^([0-9]{2})BH([0-9]{4})([A-Z]{1,2})$")
# 4. General / Short Series (e.g. DL1A1234, KA011234)
PATTERN_GENERAL = re.compile(r"^([A-Z]{2})([0-9]{1,2})([A-Z]{0,2})([0-9]{1,4})$")

def validate_indian_plate(text: str) -> Tuple[bool, str]:
    """
    Validates whether the input text adheres to recognized Indian license plate syntax.
    IMPORTANT: This validator ONLY checks syntax; it NEVER manufactures or guesses characters!
    Returns: (is_valid: bool, format_type: str)
    """
    if not text or len(text) < 6 or len(text) > 11:
        return False, "INVALID_LENGTH"

    m_std = PATTERN_STANDARD.match(text)
    if m_std and m_std.group(1) in VALID_INDIAN_STATES:
        return True, "STANDARD_HSRP"

    m_tw = PATTERN_TWO_WHEELER.match(text)
    if m_tw and m_tw.group(1) in VALID_INDIAN_STATES:
        return True, "STANDARD_TWO_WHEELER"

    m_bh = PATTERN_BHARAT.match(text)
    if m_bh:
        return True, "BHARAT_SERIES"

    m_gen = PATTERN_GENERAL.match(text)
    if m_gen and len(text) >= 7 and m_gen.group(1) in VALID_INDIAN_STATES:
        return True, "GENERAL_INDIAN"

    return False, "INVALID_FORMAT"

# ==============================================================================
# 2. CONSERVATIVE CHARACTER AMBIGUITY RESOLUTION
# ==============================================================================

DIGIT_TO_LETTER = {'0': 'O', '1': 'I', '2': 'Z', '5': 'S', '6': 'G', '8': 'B'}
LETTER_TO_DIGIT = {'O': '0', 'I': '1', 'Z': '2', 'S': '5', 'G': '6', 'B': '8'}
COMMON_LETTER_CONFUSIONS = {'J': 'T', 'T': 'J', 'I': 'T', '1': 'T', 'D': 'O', 'O': 'D', 'U': 'V', 'V': 'U'}

STATE_POS_CONFUSIONS = {
    '0': ['O', 'D'],
    '1': ['I', 'T', 'L'],
    'I': ['T', 'L', 'J'],
    'J': ['T'],
    'T': ['J', 'I'],
    'D': ['O'],
    'O': ['D'],
    '8': ['B'],
    'B': ['8'],
    '5': ['S'],
    'S': ['5'],
    '2': ['Z'],
    'Z': ['2'],
}

def resolve_character_ambiguity(candidate: str) -> str:
    """
    Conservative character-level disambiguation.
    ONLY adjusts ambiguous characters if:
    1. The string already has an appropriate length (7-10 chars).
    2. Modifying a character in a position that strictly requires a digit or letter 
       transforms the string into a strictly valid Indian license plate.
    NEVER adds missing characters or manufactures prefixes!
    """
    if not candidate or len(candidate) < 7 or len(candidate) > 10:
        return candidate

    valid, _ = validate_indian_plate(candidate)
    if valid:
        return candidate

    chars = list(candidate)

    # 1. State code (indices 0, 1): check known digit/letter confusions
    for alt in STATE_POS_CONFUSIONS.get(chars[0], []):
        trial = chars.copy()
        trial[0] = alt
        trial_str = "".join(trial)
        val, _ = validate_indian_plate(trial_str)
        if val:
            logger.info(f"[AMBIGUITY] Resolved state code letter {candidate}[0] '{chars[0]}' -> '{alt}' to form valid state plate: {trial_str}")
            return trial_str

    for alt in STATE_POS_CONFUSIONS.get(chars[1], []):
        trial = chars.copy()
        trial[1] = alt
        trial_str = "".join(trial)
        val, _ = validate_indian_plate(trial_str)
        if val:
            logger.info(f"[AMBIGUITY] Resolved state code letter {candidate}[1] '{chars[1]}' -> '{alt}' to form valid state plate: {trial_str}")
            return trial_str


    # 2. Trailing vehicle number (last 4 characters): must be digits
    modified = False
    trial = chars.copy()
    for idx in range(len(trial) - 4, len(trial)):
        if trial[idx] in LETTER_TO_DIGIT:
            trial[idx] = LETTER_TO_DIGIT[trial[idx]]
            modified = True
    if modified:
        trial_str = "".join(trial)
        val, _ = validate_indian_plate(trial_str)
        if val:
            logger.info(f"[AMBIGUITY] Resolved trailing letters in {candidate} to digits -> {trial_str}")
            return trial_str

    # 3. District / RTO code (indices 2, 3): must be digits
    trial = chars.copy()
    modified = False
    for idx in [2, 3]:
        if idx < len(trial) and trial[idx] in LETTER_TO_DIGIT:
            trial[idx] = LETTER_TO_DIGIT[trial[idx]]
            modified = True
    if modified:
        trial_str = "".join(trial)
        val, _ = validate_indian_plate(trial_str)
        if val:
            logger.info(f"[AMBIGUITY] Resolved RTO code letters in {candidate} to digits -> {trial_str}")
            return trial_str

    return candidate

# ==============================================================================
# 3. IMAGE QUALITY ASSESSMENT
# ==============================================================================

def compute_image_quality(crop: np.ndarray, det_conf: float = 1.0) -> Dict[str, Any]:
    """
    Computes a comprehensive image quality score based on:
    - Resolution / pixel area
    - Blur / sharpness (Laplacian variance)
    - Contrast (intensity standard deviation)
    - Brightness balance
    - Aspect ratio suitability
    """
    if crop is None or crop.size == 0:
        return {"quality_score": 0.0, "is_low_quality": True, "blur_var": 0.0, "contrast": 0.0}

    h, w = crop.shape[:2]
    # Resolution score (reference baseline: >= 140x50)
    res_score = min(1.0, (w * h) / (140.0 * 50.0))

    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if len(crop.shape) == 3 else crop
    # Laplacian variance (blur assessment)
    blur_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    blur_score = min(1.0, max(0.0, blur_var / 120.0))

    # Contrast
    contrast_val = float(np.std(gray))
    contrast_score = min(1.0, max(0.0, contrast_val / 35.0))

    # Brightness (penalize extreme dark < 30 or blown out > 225)
    mean_val = float(np.mean(gray))
    brightness_score = max(0.0, 1.0 - (abs(mean_val - 128.0) / 128.0))

    # Aspect ratio check (Indian plates typically 1.2 to 5.0)
    ar = float(w) / max(1.0, float(h))
    ar_score = 1.0 if (1.2 <= ar <= 5.0) else max(0.2, 1.0 - abs(ar - 2.5) / 3.0)

    quality_score = (
        0.30 * res_score +
        0.30 * blur_score +
        0.20 * contrast_score +
        0.10 * brightness_score +
        0.10 * ar_score
    )
    is_low_quality = quality_score < 0.25 or blur_var < 20.0 or (w < 40 or h < 15)

    return {
        "quality_score": round(float(quality_score), 2),
        "is_low_quality": is_low_quality,
        "blur_var": round(blur_var, 1),
        "contrast": round(contrast_val, 1),
        "res_score": round(res_score, 2),
        "w": w,
        "h": h
    }

# ==============================================================================
# 4. PERSPECTIVE RECTIFICATION & DESKEWING
# ==============================================================================

def rectify_perspective(crop: np.ndarray, quad_points=None) -> np.ndarray:
    """
    Rectifies perspective distortion:
    - If quadrilateral corners are given, warps perspective to standard rectangle.
    - If axis-aligned, applies small deskew rotation (within +/-15 deg) based on minAreaRect.
    - Always preserves crop fallback.
    """
    if crop is None or crop.size == 0:
        return crop

    if quad_points is not None and len(quad_points) == 4:
        try:
            pts = np.array(quad_points, dtype="float32")
            # Order points: top-left, top-right, bottom-right, bottom-left
            s = pts.sum(axis=1)
            rect = np.zeros((4, 2), dtype="float32")
            rect[0] = pts[np.argmin(s)]
            rect[2] = pts[np.argmax(s)]
            diff = np.diff(pts, axis=1)
            rect[1] = pts[np.argmin(diff)]
            rect[3] = pts[np.argmax(diff)]

            (tl, tr, br, bl) = rect
            width_a = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
            width_b = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
            max_w = max(int(width_a), int(width_b))

            height_a = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
            height_b = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
            max_h = max(int(height_a), int(height_b))

            if max_w > 20 and max_h > 10:
                dst = np.array([
                    [0, 0],
                    [max_w - 1, 0],
                    [max_w - 1, max_h - 1],
                    [0, max_h - 1]
                ], dtype="float32")
                m = cv2.getPerspectiveTransform(rect, dst)
                warped = cv2.warpPerspective(crop, m, (max_w, max_h))
                return warped
        except Exception as e:
            logger.debug(f"Quadrilateral perspective warp failed: {e}")

    # Deskew axis-aligned crop if slight tilt is detected
    try:
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if len(crop.shape) == 3 else crop
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        coords = np.column_stack(np.where(thresh > 0))
        if len(coords) > 30:
            rotated_rect = cv2.minAreaRect(coords)
            angle = rotated_rect[-1]
            if angle < -45:
                angle = -(90 + angle)
            else:
                angle = -angle
            if 1.5 < abs(angle) < 15.0:
                h, w = crop.shape[:2]
                center = (w // 2, h // 2)
                rot_mat = cv2.getRotationMatrix2D(center, angle, 1.0)
                deskewed = cv2.warpAffine(crop, rot_mat, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
                return deskewed
    except Exception:
        pass

    return crop

# ==============================================================================
# 5. IMAGE PREPROCESSING VARIANTS WITH EXPLICIT UPSCALING
# ==============================================================================

def generate_preprocessing_variants(crop: np.ndarray) -> List[Tuple[str, np.ndarray]]:
    """
    Explicitly upscales the plate crop and generates multiple distinct preprocessing variants:
    1. original (upscaled color)
    2. gray
    3. clahe (contrast-limited adaptive histogram equalization)
    4. contrast (normalized min-max contrast stretch)
    5. sharpen (3x3 Laplacian sharpening filter)
    6. denoise (bilateral filter edge-preserving smoothing)
    7. otsu (Otsu binarization)
    8. adaptive (adaptive Gaussian thresholding)
    """
    if crop is None or crop.size == 0:
        return []

    h, w = crop.shape[:2]
    # Explicit upscaling: small plates suffer severe degradation under OCR without upscaling
    target_h = max(130, min(260, int(h * 2.5)))
    scale = target_h / float(max(1, h))
    target_w = max(int(w * scale), 200)

    try:
        upscaled = cv2.resize(crop, (target_w, target_h), interpolation=cv2.INTER_CUBIC)
    except Exception:
        upscaled = crop

    gray = cv2.cvtColor(upscaled, cv2.COLOR_BGR2GRAY) if len(upscaled.shape) == 3 else upscaled.copy()

    # 1. CLAHE
    clahe_engine = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    clahe_img = clahe_engine.apply(gray)

    # 2. Contrast Stretching
    contrast_img = cv2.normalize(gray, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX)

    # 3. Sharpening filter
    sharpen_kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]], dtype=np.float32)
    sharpen_img = cv2.filter2D(clahe_img, -1, sharpen_kernel)

    # 4. Bilateral Denoising (preserves sharp character edges)
    denoise_img = cv2.bilateralFilter(gray, 7, 50, 50)

    # 5. Otsu thresholding
    _, otsu_raw = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    # Ensure text is dark on light background or vice versa for OCR clarity
    if np.mean(otsu_raw) < 127:
        otsu_img = cv2.bitwise_not(otsu_raw)
    else:
        otsu_img = otsu_raw

    # 6. Adaptive Thresholding
    adaptive_img = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 3)
    if np.mean(adaptive_img) < 127:
        adaptive_img = cv2.bitwise_not(adaptive_img)

    return [
        ("clahe", clahe_img),
        ("sharpen", sharpen_img),
        ("contrast", contrast_img),
        ("gray", gray),
        ("original", upscaled),
        ("denoise", denoise_img),
        ("otsu", otsu_img),
        ("adaptive", adaptive_img),
    ]

# ==============================================================================
# 6. EASYOCR MULTI-LINE ORDERING & EXTRACTION
# ==============================================================================

def parse_easyocr_results(raw_results: List[Any]) -> Tuple[str, float]:
    """
    Parses EasyOCR detections for Indian plates:
    - Groups text boxes into horizontal lines (to handle 2-line Indian plates).
    - Sorts lines vertically from top to bottom.
    - Sorts words within each line from left to right.
    - Cleans non-alphanumeric characters and concatenates in proper reading order.
    """
    if not raw_results:
        return "", 0.0

    cleaned_items = []
    for item in raw_results:
        if len(item) < 3:
            continue
        bbox, text, conf = item[0], item[1], item[2]
        clean = "".join(c for c in text if c.isalnum()).upper()
        if not clean:
            continue

        ys = [pt[1] for pt in bbox]
        xs = [pt[0] for pt in bbox]
        cy = sum(ys) / len(ys)
        cx = sum(xs) / len(xs)
        box_h = max(ys) - min(ys)
        cleaned_items.append({"text": clean, "conf": float(conf), "cx": cx, "cy": cy, "h": box_h})

    if not cleaned_items:
        return "", 0.0

    # Sort boxes vertically
    cleaned_items.sort(key=lambda item: item["cy"])
    avg_h = sum(item["h"] for item in cleaned_items) / len(cleaned_items)
    line_threshold = max(12.0, avg_h * 0.45)

    lines: List[List[Dict[str, Any]]] = []
    current_line = [cleaned_items[0]]
    for item in cleaned_items[1:]:
        if abs(item["cy"] - current_line[-1]["cy"]) < line_threshold:
            current_line.append(item)
        else:
            lines.append(current_line)
            current_line = [item]
    lines.append(current_line)

    line_texts = []
    all_confs = []
    for line in lines:
        line.sort(key=lambda item: item["cx"])
        line_str = "".join(item["text"] for item in line)
        line_texts.append(line_str)
        all_confs.extend([item["conf"] for item in line])

    combined_text = "".join(line_texts)
    avg_conf = sum(all_confs) / len(all_confs) if all_confs else 0.0
    return combined_text, round(avg_conf, 2)

# ==============================================================================
# 7. MULTI-FRAME TEMPORAL & CHARACTER-LEVEL CONSENSUS
# ==============================================================================

def aggregate_multiframe_consensus(frame_readings: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Combines OCR readings across multiple video frames using:
    - Temporal frequency consensus (exact string voting)
    - Character-level weighted consensus for aligned lengths
    - Conservative ambiguity resolution
    - Strict Indian plate syntax validation
    Returns rich metadata dict.
    """
    if not frame_readings:
        logger.info("[PLATE] OCR rejected: insufficient evidence")
        logger.info("[PLATE] Best candidate: None")
        logger.info("[PLATE] Confidence: 0.00")
        logger.info("[PLATE] Status: UNKNOWN")
        return {
            "plate": "UNKNOWN",
            "confidence": 0.0,
            "status": "UNKNOWN",
            "frames_used": 0,
            "detection_confidence": 0.0,
            "ocr_confidence": 0.0,
            "quality_score": 0.0,
            "candidates": []
        }

    # 1. Filter out empty or obviously garbage strings (< 4 chars)
    valid_readings = [r for r in frame_readings if r.get("text") and len(r["text"]) >= 4]

    if not valid_readings:
        logger.info("[PLATE] OCR rejected: insufficient evidence")
        logger.info("[PLATE] Best candidate: " + str(frame_readings[0].get("text", "None")))
        logger.info(f"[PLATE] Confidence: {frame_readings[0].get('conf', 0.0):.2f}")
        logger.info("[PLATE] Status: UNKNOWN")
        return {
            "plate": "UNKNOWN",
            "confidence": round(float(frame_readings[0].get("conf", 0.0)), 2),
            "status": "UNKNOWN",
            "frames_used": len(frame_readings),
            "detection_confidence": round(float(frame_readings[0].get("det_conf", 0.0)), 2),
            "ocr_confidence": round(float(frame_readings[0].get("conf", 0.0)), 2),
            "quality_score": round(float(frame_readings[0].get("quality", 0.0)), 2),
            "candidates": [r.get("text") for r in frame_readings if r.get("text")]
        }

    # Step A: Build candidate score map and track supporting evidence
    candidate_scores: Dict[str, float] = defaultdict(float)
    candidate_direct_counts: Dict[str, int] = defaultdict(int)

    # 1. Accumulate direct evidence weights for both raw and ambiguity-resolved readings
    for r in valid_readings:
        raw = r["text"]
        w = float(r.get("conf", 0.5)) * max(0.2, float(r.get("quality", 0.5)))
        candidate_scores[raw] += w
        candidate_direct_counts[raw] += 1

        resolved = resolve_character_ambiguity(raw)
        if resolved != raw:
            # Resolved candidate inherits evidence
            candidate_scores[resolved] += w * 0.95
            candidate_direct_counts[resolved] += 1

    # 2. Suffix & Prefix evidence transfer:
    # When OCR clips the left edge (missing 1-2 chars) or right edge of a plate,
    # the shorter reading corroborates the full plate candidate.
    for cand in list(candidate_scores.keys()):
        cand_len = len(cand)
        for r in valid_readings:
            rt = r["text"]
            if rt == cand:
                continue
            w = float(r.get("conf", 0.5)) * max(0.2, float(r.get("quality", 0.5)))
            # Suffix match (e.g. 'N998281' confirms 7 chars of 'TN998281')
            if len(rt) < cand_len and cand.endswith(rt):
                support = w * (len(rt) / cand_len) * 0.9
                candidate_scores[cand] += support
            # Prefix match
            elif len(rt) < cand_len and cand.startswith(rt):
                support = w * (len(rt) / cand_len) * 0.9
                candidate_scores[cand] += support

    # 3. Validation Scoring & Multiplier
    # Candidates that satisfy official Indian license plate standards (2-letter state code + RTO + digits)
    # represent complete, plausible registrations. Incomplete fragments (e.g. N998281) receive NO validity bonus.
    valid_candidates = []
    for cand in list(candidate_scores.keys()):
        is_valid, _ = validate_indian_plate(cand)
        if is_valid:
            candidate_scores[cand] *= 2.0
            valid_candidates.append(cand)

    # Select best candidate
    if valid_candidates:
        # Prioritize the highest-scoring valid candidate!
        best_candidate = max(valid_candidates, key=lambda k: candidate_scores[k])
    else:
        # No candidate matches valid Indian syntax
        best_candidate = max(candidate_scores.keys(), key=lambda k: candidate_scores[k])

    # 4. Character-level refinement on the winning candidate's length
    target_len = len(best_candidate)
    same_len_readings = [r for r in valid_readings if len(r["text"]) == target_len]
    if same_len_readings:
        refined_chars = []
        for pos in range(target_len):
            char_votes: Dict[str, float] = defaultdict(float)
            for r in same_len_readings:
                ch = r["text"][pos]
                w = float(r.get("conf", 0.5)) * max(0.2, float(r.get("quality", 0.5)))
                char_votes[ch] += w
            best_char = max(char_votes.keys(), key=lambda c: char_votes[c])
            refined_chars.append(best_char)
        char_consensus_str = "".join(refined_chars)
        char_consensus_resolved = resolve_character_ambiguity(char_consensus_str)
        if validate_indian_plate(char_consensus_resolved)[0]:
            best_candidate = char_consensus_resolved
        elif validate_indian_plate(best_candidate)[0]:
            pass  # keep best_candidate
        else:
            best_candidate = char_consensus_str

    # 5. Final strict validation & confidence calculation
    final_resolved = resolve_character_ambiguity(best_candidate)
    is_valid, plate_type = validate_indian_plate(final_resolved)

    # Calculate supporting evidence and composite confidence
    supporting_readings = [
        r for r in valid_readings
        if r["text"] in (final_resolved, best_candidate) or
        (len(r["text"]) < len(final_resolved) and (final_resolved.endswith(r["text"]) or final_resolved.startswith(r["text"])))
    ]
    if not supporting_readings:
        supporting_readings = valid_readings

    direct_matches = [r for r in valid_readings if r["text"] in (final_resolved, best_candidate)]
    if direct_matches:
        avg_ocr_conf = sum(r["conf"] for r in direct_matches) / len(direct_matches)
        avg_det_conf = sum(r.get("det_conf", 0.8) for r in direct_matches) / len(direct_matches)
        avg_quality = sum(r.get("quality", 0.5) for r in direct_matches) / len(direct_matches)
    else:
        avg_ocr_conf = sum(r["conf"] for r in supporting_readings) / len(supporting_readings)
        avg_det_conf = sum(r.get("det_conf", 0.8) for r in supporting_readings) / len(supporting_readings)
        avg_quality = sum(r.get("quality", 0.5) for r in supporting_readings) / len(supporting_readings)

    support_count = len(supporting_readings)
    if support_count > 1:
        logger.info(f"[OCR] Temporal consensus: {final_resolved if is_valid else best_candidate} ({support_count}/{len(valid_readings)} frames)")

    if is_valid and avg_ocr_conf >= 0.35:
        final_plate = final_resolved
        final_confidence = round(float(avg_ocr_conf * 0.7 + avg_det_conf * 0.3), 2)
        status = "VALID"
        logger.info(f"[PLATE] Final result: {final_plate}")
        logger.info(f"[PLATE] Final confidence: {final_confidence:.2f}")
        logger.info(f"[PLATE] Status: VALID ({plate_type})")
    else:
        final_plate = "UNKNOWN"
        final_confidence = round(float(avg_ocr_conf), 2)
        status = "UNKNOWN"
        logger.info("[PLATE] OCR rejected: insufficient evidence")
        logger.info(f"[PLATE] Best candidate: {best_candidate}")
        logger.info(f"[PLATE] Confidence: {final_confidence:.2f}")
        logger.info("[PLATE] Status: UNKNOWN")

    return {
        "plate": final_plate,
        "confidence": final_confidence,
        "status": status,
        "frames_used": len(valid_readings),
        "detection_confidence": round(float(avg_det_conf), 2),
        "ocr_confidence": round(float(avg_ocr_conf), 2),
        "quality_score": round(float(avg_quality), 2),
        "candidates": list(candidate_scores.keys())
    }

# ==============================================================================
# 8. PRODUCTION-GRADE LICENSE PLATE RECOGNIZER PIPELINE
# ==============================================================================

def resolve_model_path(filename: str) -> str:
    """Finds the model file in models/ directory, project root, or working directory."""
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

class LicensePlateRecognizer:
    """
    Comprehensive Video-Based License Plate Recognition System:
    1. Plate Localization (YOLO Plate Model + Haar Cascade + Vehicle Geometry)
    2. Plate Cropping with Sensible Padding
    3. Perspective Rectification & Deskewing
    4. Image Quality Assessment
    5. Multi-Variant Preprocessing with Explicit Upscaling
    6. EasyOCR Execution with Strict Alphanumeric Allowlist
    7. Multi-Line Indian Plate Parsing
    8. Multi-Frame Temporal & Character-Level Consensus
    9. Strict Indian Plate Validation (Zero Fabrication Guarantee)
    """
    def __init__(self):
        self.reader = None
        self.plate_cascade = None
        self.yolo_plate_model = None

        # 1. Initialize YOLO Plate Model if weights exist
        try:
            from ultralytics import YOLO
            plate_model_path = resolve_model_path("plate_model.pt")
            if os.path.exists(plate_model_path):
                self.yolo_plate_model = YOLO(plate_model_path)
                logger.info(f"YOLO plate detector loaded from: {plate_model_path}")
            else:
                logger.info("Custom plate_model.pt not present. Using Haar cascade & vehicle geometry localization.")
        except Exception as e:
            logger.warning(f"Could not initialize YOLO plate model: {e}")

        # 2. Initialize Haar Cascade fallback
        cascade_path = cv2.data.haarcascades + 'haarcascade_russian_plate_number.xml'
        if os.path.exists(cascade_path):
            self.plate_cascade = cv2.CascadeClassifier(cascade_path)

        # 3. Initialize EasyOCR
        try:
            import easyocr
            import torch
            use_gpu = torch.cuda.is_available()
            self.reader = easyocr.Reader(['en'], gpu=use_gpu, verbose=False)
            logger.info("EasyOCR initialized successfully for License Plate recognition.")
        except Exception as e:
            logger.warning(f"EasyOCR initialization warning: {e}")

    def localize_plate(self, frame: np.ndarray, vehicle_box: Optional[Dict[str, Any]] = None) -> Tuple[Optional[np.ndarray], float, Dict[str, Any]]:
        """
        Localizes the license plate crop on the vehicle with sensible padding.
        Returns: (plate_crop, detection_confidence, metadata)
        """
        h, w = frame.shape[:2]
        if vehicle_box:
            vx = int(max(0, vehicle_box["x"]))
            vy = int(max(0, vehicle_box["y"]))
            vw = int(min(w - vx, vehicle_box["width"]))
            vh = int(min(h - vy, vehicle_box["height"]))
            vehicle_crop = frame[vy:vy + vh, vx:vx + vw]
        else:
            vehicle_crop = frame
            vx, vy, vw, vh = 0, 0, w, h

        if vehicle_crop.size == 0:
            return None, 0.0, {}

        vh_curr, vw_curr = vehicle_crop.shape[:2]
        best_plate_crop = None
        best_det_conf = 0.0

        # Method A: YOLO Plate Model
        if self.yolo_plate_model:
            try:
                results = self.yolo_plate_model(vehicle_crop, verbose=False, conf=0.25)
                candidate_boxes = []
                for r in results:
                    if r.boxes:
                        for box in r.boxes:
                            xyxy = box.xyxy[0].cpu().numpy()
                            b_conf = float(box.conf[0].item())
                            bx1, by1, bx2, by2 = int(xyxy[0]), int(xyxy[1]), int(xyxy[2]), int(xyxy[3])
                            bw, bh = bx2 - bx1, by2 - by1

                            # Filter obvious bad boxes
                            if bw < 25 or bh < 12:
                                continue
                            ar = bw / float(bh)
                            if ar < 0.8 or ar > 5.5:
                                continue
                            # Plate is typically located in lower 70% of motorcycle
                            if by1 < vh_curr * 0.20:
                                continue

                            score = b_conf * (1.0 - abs(ar - 2.5) / 6.0)
                            candidate_boxes.append((score, b_conf, bx1, by1, bw, bh))

                if candidate_boxes:
                    candidate_boxes.sort(key=lambda c: c[0], reverse=True)
                    _, best_det_conf, px, py, pw, ph = candidate_boxes[0]

                    # Add sensible padding (10% width, 12% height)
                    pad_x = int(pw * 0.10)
                    pad_y = int(ph * 0.12)
                    x1 = max(0, px - pad_x)
                    y1 = max(0, py - pad_y)
                    x2 = min(vw_curr, px + pw + pad_x)
                    y2 = min(vh_curr, py + ph + pad_y)

                    best_plate_crop = vehicle_crop[y1:y2, x1:x2]
                    logger.info(f"[PLATE] Plate detected: {pw}x{ph}")
                    logger.info(f"[PLATE] YOLO confidence: {best_det_conf:.2f}")
            except Exception as e:
                logger.error(f"YOLO plate localization error: {e}")

        # Method B: Haar Cascade Fallback
        if best_plate_crop is None and self.plate_cascade:
            try:
                gray_v = cv2.cvtColor(vehicle_crop, cv2.COLOR_BGR2GRAY)
                # Search lower 70% of vehicle
                search_y = int(vh_curr * 0.30)
                search_region = gray_v[search_y:vh_curr, :]
                plates = self.plate_cascade.detectMultiScale(
                    search_region, scaleFactor=1.05, minNeighbors=3, minSize=(30, 15)
                )
                valid_haar = []
                for (px, py_rel, pw, ph) in plates:
                    ar = pw / float(max(1, ph))
                    if 0.8 <= ar <= 5.0 and pw >= 30 and ph >= 15:
                        valid_haar.append((px, py_rel + search_y, pw, ph))

                if valid_haar:
                    valid_haar.sort(key=lambda b: b[2] * b[3], reverse=True)
                    px, py, pw, ph = valid_haar[0]
                    pad_x = int(pw * 0.10)
                    pad_y = int(ph * 0.12)
                    x1 = max(0, px - pad_x)
                    y1 = max(0, py - pad_y)
                    x2 = min(vw_curr, px + pw + pad_x)
                    y2 = min(vh_curr, py + ph + pad_y)
                    best_plate_crop = vehicle_crop[y1:y2, x1:x2]
                    best_det_conf = 0.65
                    logger.info(f"[PLATE] Haar cascade detected plate: {pw}x{ph}")
            except Exception as e:
                logger.debug(f"Haar cascade plate detection failed: {e}")

        # Method C: Vehicle Geometry Fallback (Mid-rear plate zone: 28% to 63% height)
        if best_plate_crop is None:
            py = int(vh_curr * 0.28)
            ph = int(vh_curr * 0.35)
            # Add horizontal margins to focus on rear fender/plate
            px = int(vw_curr * 0.08)
            pw = int(vw_curr * 0.84)
            best_plate_crop = vehicle_crop[py:py + ph, px:px + pw]
            best_det_conf = 0.50
            logger.info(f"[PLATE] Geometric vehicle-plate region used: {pw}x{ph}")

        return best_plate_crop, best_det_conf, {"vw": vw_curr, "vh": vh_curr}

    def process_single_crop_ocr(self, plate_crop: np.ndarray, det_conf: float = 1.0) -> List[Dict[str, Any]]:
        """
        Executes perspective rectification, quality scoring, multi-variant preprocessing,
        and EasyOCR on a single plate crop.
        Returns a list of candidate OCR detections for this crop.
        """
        if plate_crop is None or plate_crop.size == 0 or not self.reader:
            return []

        # 1. Perspective Rectification
        rectified_crop = rectify_perspective(plate_crop)

        # 2. Image Quality Scoring
        quality_info = compute_image_quality(rectified_crop, det_conf)
        logger.info(f"[PLATE] Frame quality: {quality_info['quality_score']:.2f}")

        # 3. Multi-Variant Preprocessing (Upscaling + Grayscale + CLAHE + Sharpen + Contrast + etc.)
        variants = generate_preprocessing_variants(rectified_crop)

        candidates = []
        # Run EasyOCR across the top diverse variants
        for variant_name, var_img in variants:
            try:
                raw_ocr = self.reader.readtext(
                    var_img,
                    allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
                    paragraph=False,
                    detail=1
                )
                text, conf = parse_easyocr_results(raw_ocr)
                if text and len(text) >= 4:
                    logger.info(f"[OCR] variant={variant_name} text={text} confidence={conf:.2f}")
                    candidates.append({
                        "variant": variant_name,
                        "text": text,
                        "conf": conf,
                        "det_conf": det_conf,
                        "quality": quality_info["quality_score"],
                        "is_low_quality": quality_info["is_low_quality"]
                    })
            except Exception as e:
                logger.debug(f"OCR variant {variant_name} error: {e}")

        return candidates

    def process_video_frames(self, sampled_frames_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Multi-Frame Video Pipeline:
        1. Selects the best promising frames based on resolution, sharpness, and quality (Requirement 12).
        2. Runs multi-variant OCR on the selected frames.
        3. Aggregates results via character-level and temporal consensus (Requirement 7).
        4. Strictly validates Indian license plate format (Requirement 10 & 6).
        """
        if not sampled_frames_data:
            return {
                "plate": "UNKNOWN",
                "confidence": 0.0,
                "status": "UNKNOWN",
                "frames_used": 0,
                "detection_confidence": 0.0,
                "ocr_confidence": 0.0,
                "quality_score": 0.0,
                "candidates": []
            }

        # Step 1: Localize plates and rank candidate frames
        localized_frames = []
        for item in sampled_frames_data:
            frame = item["frame"]
            f_idx = item.get("frame_idx", 0)
            moto_box = item.get("motorcycle_box")

            crop, det_conf, meta = self.localize_plate(frame, moto_box)
            if crop is not None and crop.size > 0:
                q_info = compute_image_quality(crop, det_conf)
                # Frame ranking score = quality * det_conf * resolution
                rank_score = q_info["quality_score"] * det_conf
                localized_frames.append({
                    "frame_idx": f_idx,
                    "crop": crop,
                    "det_conf": det_conf,
                    "quality_info": q_info,
                    "rank_score": rank_score
                })

        if not localized_frames:
            return {
                "plate": "UNKNOWN",
                "confidence": 0.0,
                "status": "UNKNOWN",
                "frames_used": 0,
                "detection_confidence": 0.0,
                "ocr_confidence": 0.0,
                "quality_score": 0.0,
                "candidates": []
            }

        # Step 2: Best-frame selection (Pick top 6-8 frames with highest quality/resolution)
        localized_frames.sort(key=lambda x: x["rank_score"], reverse=True)
        top_frames = localized_frames[:8]

        # Step 3: Run OCR across the top candidate frames
        all_ocr_readings: List[Dict[str, Any]] = []
        for f in top_frames:
            crop = f["crop"]
            det_conf = f["det_conf"]
            candidates = self.process_single_crop_ocr(crop, det_conf)
            if candidates:
                for cand in candidates:
                    resolved = resolve_character_ambiguity(cand["text"])
                    cand_copy = dict(cand)
                    cand_copy["text"] = resolved
                    cand_copy["frame_idx"] = f["frame_idx"]
                    all_ocr_readings.append(cand_copy)

        # Step 4: Multi-frame Temporal & Character Consensus
        return aggregate_multiframe_consensus(all_ocr_readings)

    def extract_license_plate_details(self, frame: np.ndarray, vehicle_box: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Single-frame processor returning rich metadata dict.
        """
        crop, det_conf, meta = self.localize_plate(frame, vehicle_box)
        if crop is None or crop.size == 0:
            return {
                "plate": "UNKNOWN",
                "confidence": 0.0,
                "status": "UNKNOWN",
                "frames_used": 0,
                "detection_confidence": 0.0,
                "ocr_confidence": 0.0,
                "quality_score": 0.0,
                "candidates": []
            }

        candidates = self.process_single_crop_ocr(crop, det_conf)
        resolved_candidates = []
        for cand in candidates:
            resolved = resolve_character_ambiguity(cand["text"])
            cand_copy = dict(cand)
            cand_copy["text"] = resolved
            resolved_candidates.append(cand_copy)
        return aggregate_multiframe_consensus(resolved_candidates)

    def extract_license_plate(self, frame: np.ndarray, vehicle_box: Optional[dict] = None) -> Tuple[str, float]:
        """
        Backward compatible API returning (plate_string, confidence).
        """
        details = self.extract_license_plate_details(frame, vehicle_box)
        return details.get("plate", "UNKNOWN"), details.get("confidence", 0.0)

plate_recognizer = LicensePlateRecognizer()
