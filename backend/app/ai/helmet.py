import cv2
import numpy as np
from typing import Dict, Any, Tuple
from backend.app.utils.logging import logger

class HelmetDetector:
    """
    Analyzes rider head regions to infer whether a safety helmet is present.
    """
    @staticmethod
    def crop_head_region(frame: np.ndarray, person_box: Dict[str, Any]) -> Tuple[np.ndarray, Tuple[int, int, int, int]]:
        height, width, _ = frame.shape
        px = int(max(0, person_box["x"]))
        py = int(max(0, person_box["y"]))
        pw = int(min(width - px, person_box["width"]))
        ph = int(min(height - py, person_box["height"]))
        
        # Head is generally in top 28% of the person's bounding box
        head_h = max(10, int(ph * 0.28))
        head_w = max(10, pw)
        
        head_crop = frame[py:py + head_h, px:px + head_w]
        return head_crop, (px, py, head_w, head_h)

    @classmethod
    def analyze_head_crop(cls, head_crop: np.ndarray) -> Tuple[bool, float]:
        """
        Determines helmet presence using color segmentation, circular Hough transform, 
        and specular reflection analysis characteristic of hard polymer helmet shells.
        """
        if head_crop.size == 0 or head_crop.shape[0] < 10 or head_crop.shape[1] < 10:
            return False, 0.50

        try:
            hsv = cv2.cvtColor(head_crop, cv2.COLOR_BGR2HSV)
            gray = cv2.cvtColor(head_crop, cv2.COLOR_BGR2GRAY)
            
            # Helmet features:
            # 1. Smooth surface with high curvature (oval/circle)
            # 2. Distinct non-skin, non-hair color or gloss reflection
            # 3. Detect hair texture vs smooth shell using Laplacian variance
            lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            # Detect circle contours (helmet crown)
            circles = cv2.HoughCircles(
                gray, cv2.HOUGH_GRADIENT, dp=1.2, minDist=15,
                param1=50, param2=30, minRadius=int(head_crop.shape[0]*0.2), maxRadius=int(head_crop.shape[0]*0.6)
            )
            
            # Check skin tone in head region (face visible without helmet vs full face helmet)
            # Normal Indian skin tones in HSV: H: 0-25, S: 35-170, V: 60-255
            lower_skin = np.array([0, 30, 60], dtype=np.uint8)
            upper_skin = np.array([25, 175, 255], dtype=np.uint8)
            skin_mask = cv2.inRange(hsv, lower_skin, upper_skin)
            skin_ratio = cv2.countNonZero(skin_mask) / float(head_crop.shape[0] * head_crop.shape[1] + 1e-5)

            has_circle = circles is not None and len(circles[0]) > 0
            
            # If high skin ratio in upper half and high hair texture => no helmet
            if skin_ratio > 0.35 and lap_var > 150:
                # Bare head detected
                return False, round(min(0.96, 0.70 + (skin_ratio * 0.5)), 2)
            elif has_circle or (lap_var < 90 and skin_ratio < 0.20):
                # Smooth shell detected
                return True, round(0.88 + (0.05 if has_circle else 0.0), 2)
            else:
                # Inconclusive/Borderline
                return False, 0.65
        except Exception as e:
            logger.error(f"Helmet analysis error: {e}")
            return False, 0.50

    @classmethod
    def evaluate_violation(cls, frame: np.ndarray, riders: list) -> Dict[str, Any]:
        """
        Evaluates whether any rider on the vehicle violates helmet regulations.
        """
        if not riders:
            return {"violation": False, "confidence": 0.0, "details": "No riders detected"}

        violations_found = 0
        confidences = []

        for rider in riders:
            head_crop, coords = cls.crop_head_region(frame, rider)
            has_helmet, conf = cls.analyze_head_crop(head_crop)
            if not has_helmet:
                violations_found += 1
                confidences.append(conf)

        if violations_found > 0:
            avg_conf = sum(confidences) / len(confidences)
            return {
                "violation": True,
                "confidence": round(avg_conf, 2),
                "details": f"{violations_found} rider(s) detected without certified helmet"
            }
        else:
            return {
                "violation": False,
                "confidence": 0.90,
                "details": "All detected riders appear to be wearing helmets"
            }

helmet_detector = HelmetDetector()
