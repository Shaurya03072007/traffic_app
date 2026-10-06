import os
import cv2
import numpy as np
from typing import List, Dict, Any, Tuple
from backend.app.utils.logging import logger

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

class TrafficObjectDetector:
    """
    SOTA Traffic Detection Engine powered by YOLO26x (Extra-Large End-to-End NMS-Free)
    and YOLO26x-Pose (17-Keypoint Skeletal Human Estimation).
    """
    def __init__(self, model_path: str = "yolo26x.pt", pose_model_path: str = "yolo26x-pose.pt"):
        self.yolo_model = None
        self.pose_model = None
        self.use_yolo = False
        self.use_pose = False
        
        try:
            from ultralytics import YOLO
            
            # 1. Load YOLO26x Detector
            det_path = resolve_model_path(model_path)
            logger.info(f"Loading YOLO26x detector from: {det_path}")
            self.yolo_model = YOLO(det_path)
            self.use_yolo = True
            logger.info("YOLO26x Extra-Large Detector successfully loaded.")
            
            # 2. Load YOLO26x-Pose Estimator
            pose_path = resolve_model_path(pose_model_path)
            if os.path.exists(pose_path) or not pose_path.startswith("models"):
                logger.info(f"Loading YOLO26x-Pose estimator from: {pose_path}")
                try:
                    self.pose_model = YOLO(pose_path)
                    self.use_pose = True
                    logger.info("YOLO26x-Pose Skeletal Estimator successfully loaded.")
                except Exception as pe:
                    logger.warning(f"Could not load YOLO26x-Pose: {pe}")
        except Exception as e:
            logger.warning(f"Ultralytics YOLO26x init error: {e}. Falling back to standard pipeline.")

    def detect_frame(self, frame: np.ndarray) -> Dict[str, List[Dict[str, Any]]]:
        """
        Runs detection and pose estimation on a single RGB/BGR frame.
        Returns motorcycles, persons (with skeletal keypoints), and helmets.
        """
        motorcycles = []
        persons = []
        helmets = []
        skeletons = []

        if self.use_yolo and self.yolo_model:
            try:
                # YOLO26x inference with STAL (Small-Target-Aware) & NMS-free
                results = self.yolo_model(frame, verbose=False, conf=0.30)
                for r in results:
                    boxes = r.boxes
                    for box in boxes:
                        cls_id = int(box.cls[0].item())
                        conf = float(box.conf[0].item())
                        xyxy = box.xyxy[0].tolist()
                        
                        bbox = {
                            "x": xyxy[0],
                            "y": xyxy[1],
                            "width": xyxy[2] - xyxy[0],
                            "height": xyxy[3] - xyxy[1],
                            "confidence": conf
                        }
                        
                        # YOLO class 3: motorcycle, 0: person, 1: bicycle
                        if cls_id == 3 and conf >= 0.30:
                            motorcycles.append(bbox)
                        elif cls_id == 0 and conf >= 0.30:
                            persons.append(bbox)
                        elif cls_id == 1 and conf >= 0.35: # bicycle
                            motorcycles.append(bbox)
            except Exception as e:
                logger.error(f"YOLO26x inference error: {e}")

        # Run Pose Estimation with YOLO26x-Pose for rider verification
        if self.use_pose and self.pose_model:
            try:
                pose_results = self.pose_model(frame, verbose=False, conf=0.25)
                for pr in pose_results:
                    if pr.keypoints is not None:
                        kp_data = pr.keypoints.data.cpu().numpy() # [num_persons, 17, 3] or [num_persons, 17, 2]
                        for person_kp in kp_data:
                            # person_kp shape: [17, 2] or [17, 3]
                            # Keypoints: 0: nose, 5: left_shoulder, 6: right_shoulder, 11: left_hip, 12: right_hip
                            head_kps = person_kp[0:5] # nose, eyes, ears
                            shoulder_kps = person_kp[5:7] # left/right shoulder
                            hip_kps = person_kp[11:13] # left/right hip
                            
                            valid_head = [pt for pt in head_kps if (len(pt) > 2 and pt[2] > 0.25) or (len(pt) == 2 and pt[0] > 0)]
                            valid_shoulders = [pt for pt in shoulder_kps if (len(pt) > 2 and pt[2] > 0.25) or (len(pt) == 2 and pt[0] > 0)]
                            valid_hips = [pt for pt in hip_kps if (len(pt) > 2 and pt[2] > 0.25) or (len(pt) == 2 and pt[0] > 0)]
                            
                            skeletons.append({
                                "keypoints": person_kp.tolist(),
                                "head_points": [p[:2].tolist() for p in valid_head],
                                "shoulder_points": [p[:2].tolist() for p in valid_shoulders],
                                "hip_points": [p[:2].tolist() for p in valid_hips]
                            })
            except Exception as e:
                logger.error(f"YOLO26x-Pose inference error: {e}")

        # Attach closest skeleton to each person box
        for p in persons:
            px_center = p["x"] + p["width"] / 2.0
            py_top = p["y"]
            best_skel = None
            min_dist = float("inf")
            
            for skel in skeletons:
                if skel.get("head_points"):
                    hx, hy = skel["head_points"][0]
                    dist = ((hx - px_center)**2 + (hy - py_top)**2)**0.5
                    if dist < min_dist and dist < p["width"]:
                        min_dist = dist
                        best_skel = skel
            p["skeleton"] = best_skel

        return {
            "motorcycles": motorcycles,
            "persons": persons,
            "helmets": helmets,
            "skeletons": skeletons
        }

detector = TrafficObjectDetector()

