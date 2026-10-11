import os
import cv2
import json
import base64
import requests
from pathlib import Path
from typing import Dict, Any, List, Optional
from backend.app.utils.logging import logger

API_KEY = os.getenv("NEURAL_INFERENCE_KEY", "AQ.Ab8RN6I6ad5ra1KXxfBWpVOkUl3WVLS7dZCIfdkBOsFN3FW2hQ")

IMAGE_MODEL_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key={API_KEY}"
VIDEO_MODEL_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={API_KEY}"

IMAGE_ANALYSIS_PROMPT = """Analyze this traffic patrol enforcement snapshot carefully.
Detect the two-wheeler vehicle, riders, helmet compliance, triple riding, and vehicle registration number plate.
Return ONLY a valid JSON object in this exact schema:
{
  "motorcycle_detected": true,
  "license_plate": "<clean alphanumeric Indian number plate e.g. AP9AL7175, TN998281, TS09EA4412, or UNKNOWN>",
  "helmet_violation": true,
  "helmet_details": "<detailed explanation of helmet status>",
  "triple_riding": true,
  "rider_count": 3,
  "triple_riding_details": "<detailed explanation of passenger count>",
  "confidence": 0.95
}
"""

VIDEO_ANALYSIS_PROMPT = """These sequential frames (sampled at 1 frame per second / 1 FPS) are from traffic patrol surveillance video.
Analyze the two-wheeler vehicle, riders, helmet compliance, triple riding, and vehicle registration number plate across the frames.
Return ONLY a valid JSON object in this exact schema:
{
  "motorcycle_detected": true,
  "license_plate": "<clean alphanumeric Indian number plate e.g. TN998281, AP9AL7175, TS09EA4412, or UNKNOWN>",
  "helmet_violation": true,
  "helmet_details": "<detailed explanation of helmet status>",
  "triple_riding": true,
  "rider_count": 3,
  "triple_riding_details": "<detailed explanation of passenger count>",
  "confidence": 0.95,
  "best_frame_index": 0
}
"""

class NeuralInferenceEngine:
    """
    High-Performance Neural Vision Inference Engine.
    Processes patrol footage and evidentiary snapshots with ultra-low latency.
    """

    @classmethod
    def analyze_image(cls, image_bytes: bytes) -> Optional[Dict[str, Any]]:
        """
        Sends image to the 3.5-flash-lite neural model.
        """
        try:
            img_b64 = base64.b64encode(image_bytes).decode("utf-8")
            payload = {
                "contents": [{
                    "parts": [
                        {"text": IMAGE_ANALYSIS_PROMPT},
                        {"inline_data": {"mime_type": "image/jpeg", "data": img_b64}}
                    ]
                }],
                "generationConfig": {"response_mime_type": "application/json"}
            }
            resp = requests.post(IMAGE_MODEL_ENDPOINT, json=payload, timeout=20)
            if resp.status_code == 200:
                raw_text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                data = json.loads(raw_text)
                logger.info(f"Neural inference (image) completed: Plate={data.get('license_plate')}, Helmet={data.get('helmet_violation')}, Triple={data.get('triple_riding')}")
                return data
            else:
                logger.warning(f"Neural inference endpoint returned status {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            logger.error(f"Neural inference error: {e}")
        return None

    @classmethod
    def analyze_video_frames(cls, frames: List[Any]) -> Optional[Dict[str, Any]]:
        """
        Sends 1 FPS video frames to the 3.1-flash-lite neural model.
        """
        try:
            if not frames:
                return None

            parts: List[Dict[str, Any]] = [{"text": VIDEO_ANALYSIS_PROMPT}]
            for frame in frames[:15]: # Max 15 keyframes
                _, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 82])
                frame_b64 = base64.b64encode(buf.tobytes()).decode("utf-8")
                parts.append({"inline_data": {"mime_type": "image/jpeg", "data": frame_b64}})

            payload = {
                "contents": [{"parts": parts}],
                "generationConfig": {"response_mime_type": "application/json"}
            }
            resp = requests.post(VIDEO_MODEL_ENDPOINT, json=payload, timeout=25)
            if resp.status_code == 200:
                raw_text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                data = json.loads(raw_text)
                logger.info(f"Neural inference (video 1 FPS) completed: Plate={data.get('license_plate')}, Helmet={data.get('helmet_violation')}, Triple={data.get('triple_riding')}")
                return data
            else:
                logger.warning(f"Neural video inference endpoint returned status {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            logger.error(f"Neural video inference error: {e}")
        return None

neural_inference = NeuralInferenceEngine()
