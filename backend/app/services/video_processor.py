import cv2
import time
import re
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Optional
from backend.app.ai.detector import detector
from backend.app.ai.tracker import rider_associator
from backend.app.ai.helmet import helmet_detector
from backend.app.ai.triple_riding import triple_riding_detector
from backend.app.ai.plate_ocr import plate_recognizer, levenshtein_distance
from backend.app.ai.neural_inference import neural_inference
from backend.app.services.evidence import EvidenceManager
from backend.app.utils.logging import logger

class VideoProcessor:
    """
    High-Performance Police Video & Image Enforcement Engine:
    - 3.5-Flash-Lite Neural Vision for Still Snapshot Analysis
    - 3.1-Flash-Lite 1-FPS Keyframe Neural Vision for Surveillance Video
    - Seamless Local YOLOv8 & EasyOCR Fallback Engine
    - Evidentiary Police Snapshot Rendering & Watermarking
    - Alphanumeric Vehicle Registration Synchronization
    """

    @classmethod
    def process_video_file(cls, video_path: Path, case_id: str) -> Dict[str, Any]:
        logger.info(f"Starting enforcement processing for case {case_id} on: {video_path}")
        
        is_image = video_path.suffix.lower() in [".jpg", ".jpeg", ".png", ".bmp", ".webp"]
        
        if is_image:
            return cls._process_image(video_path, case_id)
        else:
            return cls._process_video(video_path, case_id)

    @classmethod
    def _process_image(cls, image_path: Path, case_id: str) -> Dict[str, Any]:
        frame = cv2.imread(str(image_path))
        if frame is None:
            raise ValueError(f"Cannot read image file: {image_path}")

        with open(image_path, "rb") as f:
            img_bytes = f.read()

        # Primary: 3.5-Flash-Lite Neural Vision
        neural_data = neural_inference.analyze_image(img_bytes)
        
        # Local detector for bounding box evidence rendering
        detections = detector.detect_frame(frame)
        motorcycles = detections["motorcycles"]
        helmets = detections["helmets"]
        no_helmets = detections["no_helmets"]
        plate_boxes = detections["plate_boxes"]

        if neural_data:
            plate_str = neural_data.get("license_plate", "UNKNOWN")
            has_helmet_violation = bool(neural_data.get("helmet_violation", False))
            has_triple_riding = bool(neural_data.get("triple_riding", False))
            rider_count = int(neural_data.get("rider_count", 3 if has_triple_riding else 1))
            confidence = float(neural_data.get("confidence", 0.95))
            helmet_details = neural_data.get("helmet_details", "Helmet violation confirmed")
            triple_details = neural_data.get("triple_riding_details", f"Vehicle carries {rider_count} riders")
        else:
            # Fallback to local pipeline
            associated = rider_associator.associate(motorcycles, detections["persons"])
            h_eval = helmet_detector.evaluate_violation(frame, detections["persons"], detections=detections)
            t_eval = triple_riding_detector.evaluate(associated, detections=detections)
            p_details = plate_recognizer.extract_license_plate_details(frame, motorcycles[0] if motorcycles else None)
            
            plate_str = p_details.get("plate", "UNREADABLE (Manual Review)")
            has_helmet_violation = h_eval["violation"]
            has_triple_riding = t_eval["detected"]
            rider_count = t_eval.get("rider_count", 1)
            confidence = 0.88
            helmet_details = h_eval["details"]
            triple_details = t_eval["details"]

        annotated_frame = cls._render_police_overlay(
            frame, motorcycles, helmets, no_helmets, plate_boxes,
            plate_str, has_helmet_violation, has_triple_riding, 0.0
        )

        _, buffer = cv2.imencode(".jpg", annotated_frame)
        _, evidence_url = EvidenceManager.save_annotated_frame(buffer.tobytes(), case_id, 0)

        # Vehicle registration lookup
        reg_info = cls._lookup_vehicle_registration(plate_str)

        return {
            "case_id": case_id,
            "processed_frames": 1,
            "duration_seconds": 1.0,
            "helmet_violation": {
                "detected": has_helmet_violation,
                "confidence": confidence,
                "details": helmet_details
            },
            "triple_riding": {
                "detected": has_triple_riding,
                "confidence": confidence,
                "details": triple_details
            },
            "motorcycle_detected": True,
            "riders_count": rider_count,
            "detected_license_plate": reg_info["plate"],
            "plate_confidence": confidence,
            "plate_details": {
                "plate": reg_info["plate"],
                "confidence": confidence,
                "status": "VALID" if reg_info["is_registered"] else "ACTIVE",
                "is_registered": reg_info["is_registered"],
                "owner_name": reg_info["owner_name"],
                "owner_phone": reg_info["owner_phone"]
            },
            "evidence_frame_url": evidence_url,
            "evidence_video_url": f"/static/evidence/{case_id}/{image_path.name}",
            "model_name": "YOLOv8-TrafficCustom-v1.2"
        }

    @classmethod
    def _process_video(cls, video_path: Path, case_id: str) -> Dict[str, Any]:
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise ValueError(f"Cannot open video file: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames <= 0:
            total_frames = 100
        duration = total_frames / fps if fps > 0 else 5.0

        # Sample at 1 Frame Per Second (1 FPS)
        sample_step = max(1, int(fps))

        sampled_1fps_frames: List[np.ndarray] = []
        frame_indices: List[int] = []
        
        f_idx = 0
        while cap.isOpened() and len(sampled_1fps_frames) < 15:
            ret, frame = cap.read()
            if not ret:
                break
            if f_idx % sample_step == 0:
                sampled_1fps_frames.append(frame.copy())
                frame_indices.append(f_idx)
            f_idx += 1
        cap.release()

        if not sampled_1fps_frames:
            raise ValueError("No frames could be extracted from video.")

        # Primary: 3.1-Flash-Lite 1-FPS Neural Vision
        neural_data = neural_inference.analyze_video_frames(sampled_1fps_frames)

        best_frame_idx = 0
        if neural_data and "best_frame_index" in neural_data:
            idx = neural_data["best_frame_index"]
            if 0 <= idx < len(sampled_1fps_frames):
                best_frame_idx = idx

        best_frame = sampled_1fps_frames[best_frame_idx]
        best_frame_sec = frame_indices[best_frame_idx] / fps if fps > 0 else 0.0

        # Local detector for crisp visual bounding boxes on evidence frame
        detections = detector.detect_frame(best_frame)
        motorcycles = detections["motorcycles"]
        helmets = detections["helmets"]
        no_helmets = detections["no_helmets"]
        plate_boxes = detections["plate_boxes"]

        if neural_data:
            plate_str = neural_data.get("license_plate", "UNKNOWN")
            has_helmet_violation = bool(neural_data.get("helmet_violation", False))
            has_triple_riding = bool(neural_data.get("triple_riding", False))
            rider_count = int(neural_data.get("rider_count", 3 if has_triple_riding else 1))
            confidence = float(neural_data.get("confidence", 0.95))
            helmet_details = neural_data.get("helmet_details", "Rider without protective helmet detected")
            triple_details = neural_data.get("triple_riding_details", f"Vehicle carries {rider_count} passengers")
        else:
            # Fallback to local pipeline
            associated = rider_associator.associate(motorcycles, detections["persons"])
            h_eval = helmet_detector.evaluate_violation(best_frame, detections["persons"], detections=detections)
            t_eval = triple_riding_detector.evaluate(associated, detections=detections)
            p_details = plate_recognizer.extract_license_plate_details(best_frame, motorcycles[0] if motorcycles else None)
            
            plate_str = p_details.get("plate", "UNREADABLE (Manual Review)")
            has_helmet_violation = h_eval["violation"]
            has_triple_riding = t_eval["detected"]
            rider_count = t_eval.get("rider_count", 1)
            confidence = 0.88
            helmet_details = h_eval["details"]
            triple_details = t_eval["details"]

        annotated_frame = cls._render_police_overlay(
            best_frame, motorcycles, helmets, no_helmets, plate_boxes,
            plate_str, has_helmet_violation, has_triple_riding, best_frame_sec
        )

        _, buffer = cv2.imencode(".jpg", annotated_frame)
        _, evidence_url = EvidenceManager.save_annotated_frame(
            buffer.tobytes(), case_id, frame_indices[best_frame_idx]
        )

        # Vehicle registration lookup & normalization
        reg_info = cls._lookup_vehicle_registration(plate_str)

        return {
            "case_id": case_id,
            "processed_frames": len(sampled_1fps_frames),
            "duration_seconds": round(max(0.5, duration), 2),
            "helmet_violation": {
                "detected": has_helmet_violation,
                "confidence": confidence,
                "details": helmet_details
            },
            "triple_riding": {
                "detected": has_triple_riding,
                "confidence": confidence,
                "details": triple_details
            },
            "motorcycle_detected": True,
            "riders_count": rider_count,
            "detected_license_plate": reg_info["plate"],
            "plate_confidence": confidence,
            "plate_details": {
                "plate": reg_info["plate"],
                "confidence": confidence,
                "status": "VALID" if reg_info["is_registered"] else "ACTIVE",
                "is_registered": reg_info["is_registered"],
                "owner_name": reg_info["owner_name"],
                "owner_phone": reg_info["owner_phone"]
            },
            "evidence_frame_url": evidence_url,
            "evidence_video_url": f"/static/evidence/{case_id}/{video_path.name}",
            "model_name": "YOLOv8-TrafficCustom-v1.2"
        }

    @staticmethod
    def _lookup_vehicle_registration(raw_plate: str) -> Dict[str, Any]:
        """
        Matches detected plate with registered vehicles (exact + fuzzy match).
        Ensures raw valid plates are NEVER overwritten with 'Unidentified in DB'.
        """
        clean_target = re.sub(r'[^A-Z0-9]', '', raw_plate.upper()) if raw_plate else ""
        if not clean_target or clean_target == "UNKNOWN":
            return {
                "plate": "UNREADABLE (Manual Review)",
                "is_registered": False,
                "owner_name": "Unknown",
                "owner_phone": None
            }

        try:
            from backend.app.api.admin import REGISTERED_VEHICLES
            # 1. Exact match
            for v in REGISTERED_VEHICLES:
                clean_v = re.sub(r'[^A-Z0-9]', '', v.get("vehicle_number", "").upper())
                if clean_v == clean_target:
                    return {
                        "plate": v["vehicle_number"],
                        "is_registered": True,
                        "owner_name": v.get("owner_name", "Registered Owner"),
                        "owner_phone": v.get("owner_phone")
                    }

            # 2. Fuzzy match (distance <= 2)
            for v in REGISTERED_VEHICLES:
                clean_v = re.sub(r'[^A-Z0-9]', '', v.get("vehicle_number", "").upper())
                dist = levenshtein_distance(clean_target, clean_v)
                if dist <= 2 and abs(len(clean_target) - len(clean_v)) <= 2:
                    return {
                        "plate": v["vehicle_number"],
                        "is_registered": True,
                        "owner_name": v.get("owner_name", "Registered Owner"),
                        "owner_phone": v.get("owner_phone")
                    }
        except Exception:
            pass

        # Return actual detected plate cleanly
        return {
            "plate": clean_target,
            "is_registered": False,
            "owner_name": "Unregistered / External RTO",
            "owner_phone": None
        }

    @staticmethod
    def _render_police_overlay(
        frame: np.ndarray,
        motorcycles: List[Dict[str, Any]],
        helmets: List[Dict[str, Any]],
        no_helmets: List[Dict[str, Any]],
        plate_boxes: List[Dict[str, Any]],
        plate_str: str,
        helmet_violation: bool,
        triple_riding: bool,
        sec_offset: float
    ) -> np.ndarray:
        annotated = frame.copy()

        # Motorcycles (Orange / Cyan border)
        for m in motorcycles:
            mx, my, mw, mh = int(m["x"]), int(m["y"]), int(m["width"]), int(m["height"])
            cv2.rectangle(annotated, (mx, my), (mx + mw, my + mh), (255, 140, 0), 2)
            cv2.putText(annotated, f"Motorcycle ({m['confidence']:.2f})", (mx, max(18, my - 8)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 140, 0), 2)

        # Plates (Yellow border)
        for p in plate_boxes:
            px, py, pw, ph = int(p["x"]), int(p["y"]), int(p["width"]), int(p["height"])
            cv2.rectangle(annotated, (px, py), (px + pw, py + ph), (0, 255, 255), 2)
            label = f"PLATE: {plate_str}" if plate_str and plate_str != "UNKNOWN" else "PLATE NUMBER"
            cv2.putText(annotated, label, (px, max(15, py - 5)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 2)

        # Helmets (Green)
        for h in helmets:
            hx, hy, hw, hh = int(h["x"]), int(h["y"]), int(h["width"]), int(h["height"])
            cv2.rectangle(annotated, (hx, hy), (hx + hw, hy + hh), (0, 255, 0), 2)
            cv2.putText(annotated, "HELMET OK", (hx, max(15, hy - 5)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

        # Helmet Violations (Red)
        for nh in no_helmets:
            nx, ny, nw, nh_h = int(nh["x"]), int(nh["y"]), int(nh["width"]), int(nh["height"])
            cv2.rectangle(annotated, (nx, ny), (nx + nw, ny + nh_h), (0, 0, 255), 3)
            cv2.putText(annotated, "NO HELMET VIOLATION", (nx, max(18, ny - 6)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 255), 2)

        # Top Enforcement Watermark Banner
        status_text = f"POLICE ENFORCEMENT CAMERA | "
        if triple_riding:
            status_text += "[TRIPLE RIDING VIOLATION] "
        if helmet_violation:
            status_text += "[NO HELMET VIOLATION] "
        status_text += f"SEC: {sec_offset:.1f}s"
        cv2.putText(annotated, status_text, (20, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 255, 255), 2)

        return annotated

video_processor = VideoProcessor()
