import re
import cv2
import numpy as np
from typing import Tuple, Optional
from backend.app.utils.logging import logger

# Indian Number Plate Regex Pattern e.g. TS09EA4412, DL04BC8921, MH12TR3321
INDIAN_PLATE_REGEX = re.compile(r"^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$")

class LicensePlateRecognizer:
    """
    Localizes license plate region on vehicle lower boundary and applies OCR preprocessing.
    Designed with graceful fallback so officer always reviews and can edit number.
    """
    @staticmethod
    def preprocess_plate(plate_crop: np.ndarray) -> np.ndarray:
        gray = cv2.cvtColor(plate_crop, cv2.COLOR_BGR2GRAY)
        # Increase contrast
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        contrast = clahe.apply(gray)
        # Otsu thresholding
        _, thresh = cv2.threshold(contrast, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return thresh

    @classmethod
    def extract_license_plate(cls, frame: np.ndarray, vehicle_box: Optional[dict] = None) -> Tuple[str, float]:
        """
        Attempts OCR on the lower portion of the detected vehicle.
        Returns (plate_string, confidence).
        """
        try:
            # If pytesseract or easyocr is installed, try real OCR:
            try:
                import pytesseract
                if vehicle_box:
                    h, w, _ = frame.shape
                    vx = int(vehicle_box["x"])
                    vy = int(vehicle_box["y"])
                    vw = int(vehicle_box["width"])
                    vh = int(vehicle_box["height"])
                    # Plate usually at the bottom 25% of vehicle
                    plate_y = vy + int(vh * 0.70)
                    plate_h = int(vh * 0.25)
                    crop = frame[max(0, plate_y):min(h, plate_y + plate_h), max(0, vx):min(w, vx + vw)]
                    if crop.size > 0:
                        processed = cls.preprocess_plate(crop)
                        text = pytesseract.image_to_string(processed, config='--psm 8 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
                        clean_text = "".join(c for c in text if c.isalnum()).upper()
                        if INDIAN_PLATE_REGEX.match(clean_text):
                            return clean_text, 0.88
            except ImportError:
                pass
            
            return "UNKNOWN", 0.0

        except Exception as e:
            logger.error(f"License plate OCR error: {e}")
            return "UNKNOWN", 0.0

plate_recognizer = LicensePlateRecognizer()
