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
    State-of-the-art Deep Learning Traffic Detection Engine:
    1. Dedicated Traffic Violation YOLO (Helmet, NHelmet [no-helmet], Motorbike, PNumber [plate])
    2. High-Precision License Plate Detector YOLO (dedicated license plate bounds)
    3. Extra-Large General Detector (YOLO26x for robust person & vehicle recall)
    4. 17-Keypoint Skeletal Human Pose Estimator (YOLO26x-Pose for rider posture & count)
    """
    def __init__(
        self,
        traffic_model_path: str = "traffic_violations_yolo.pt",
        plate_model_path: str = "plate_model.pt",
        general_model_path: str = "yolo26x.pt",
        pose_model_path: str = "yolo26x-pose.pt"
    ):
        self.traffic_model = None
        self.plate_model = None
        self.yolo_model = None
        self.pose_model = None
        
        try:
            from ultralytics import YOLO

            # 1. Dedicated Traffic Enforcement Model (Helmet / NHelmet / Motorbike / PNumber)
            t_path = resolve_model_path(traffic_model_path)
            if os.path.exists(t_path):
                logger.info(f"Loading Dedicated Traffic Enforcement Model from: {t_path}")
                self.traffic_model = YOLO(t_path)
                logger.info("Traffic Enforcement Model loaded successfully.")
            else:
                logger.warning(f"Traffic model not found at {t_path}")

            # 2. Dedicated License Plate Model
            lp_path = resolve_model_path(plate_model_path)
            if os.path.exists(lp_path):
                logger.info(f"Loading Dedicated License Plate Model from: {lp_path}")
                self.plate_model = YOLO(lp_path)
                logger.info("License Plate Model loaded successfully.")

            # 3. Extra-Large General Detector
            gen_path = resolve_model_path(general_model_path)
            if os.path.exists(gen_path):
                logger.info(f"Loading YOLO26x General Detector from: {gen_path}")
                self.yolo_model = YOLO(gen_path)
                logger.info("YOLO26x General Detector loaded successfully.")

            # 4. Pose Estimator
            p_path = resolve_model_path(pose_model_path)
            if os.path.exists(p_path):
                logger.info(f"Loading YOLO26x-Pose Estimator from: {p_path}")
                self.pose_model = YOLO(p_path)
                logger.info("YOLO26x-Pose Estimator loaded successfully.")

        except Exception as e:
            logger.error(f"Error initializing detector models: {e}")

    def detect_frame(self, frame: np.ndarray) -> Dict[str, List[Dict[str, Any]]]:
        """
        Runs deep learning object detection, helmet categorization, and pose estimation.
        Returns:
            - motorcycles
            - persons
            - helmets (wearing helmet)
            - no_helmets (bare head / no-helmet violation)
            - plate_boxes (detected license plate crops)
            - skeletons
        """
        motorcycles: List[Dict[str, Any]] = []
        persons: List[Dict[str, Any]] = []
        helmets: List[Dict[str, Any]] = []
        no_helmets: List[Dict[str, Any]] = []
        plate_boxes: List[Dict[str, Any]] = []
        skeletons: List[Dict[str, Any]] = []

        if frame is None or frame.size == 0:
            return {
                "motorcycles": [], "persons": [], "helmets": [],
                "no_helmets": [], "plate_boxes": [], "skeletons": []
            }

        h, w = frame.shape[:2]
        # Dynamic image scale: use 1280 for 4K / high-res footage to preserve small plates
        imgsz = 1280 if max(h, w) >= 1920 else 640

        # -------------------------------------------------------------
        # 1. Specialized Traffic Violation Model
        # Classes: 0: Helmet, 1: Motorbike, 2: NHelmet (No Helmet), 3: PNumber
        # -------------------------------------------------------------
        if self.traffic_model:
            try:
                results = self.traffic_model(frame, verbose=False, conf=0.25, imgsz=imgsz)
                for r in results:
                    for box in r.boxes:
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
                        if cls_id == 0: # Helmet
                            helmets.append(bbox)
                        elif cls_id == 1: # Motorbike
                            motorcycles.append(bbox)
                        elif cls_id == 2: # NHelmet (Bare head / violation)
                            no_helmets.append(bbox)
                        elif cls_id == 3: # PNumber (License Plate)
                            plate_boxes.append(bbox)
            except Exception as e:
                logger.error(f"Traffic model inference error: {e}")

        # -------------------------------------------------------------
        # 2. Specialized License Plate Model (YOLO-LPD)
        # -------------------------------------------------------------
        if self.plate_model:
            try:
                lp_results = self.plate_model(frame, verbose=False, conf=0.20, imgsz=imgsz)
                for r in lp_results:
                    for box in r.boxes:
                        conf = float(box.conf[0].item())
                        xyxy = box.xyxy[0].tolist()
                        bbox = {
                            "x": xyxy[0],
                            "y": xyxy[1],
                            "width": xyxy[2] - xyxy[0],
                            "height": xyxy[3] - xyxy[1],
                            "confidence": conf
                        }
                        # Avoid duplicates if box strongly overlaps an existing PNumber box
                        is_duplicate = False
                        for p in plate_boxes:
                            iou = self._calculate_iou(bbox, p)
                            if iou > 0.4:
                                is_duplicate = True
                                if conf > p["confidence"]:
                                    p.update(bbox)
                                break
                        if not is_duplicate:
                            plate_boxes.append(bbox)
            except Exception as e:
                logger.error(f"License plate model inference error: {e}")

        # -------------------------------------------------------------
        # 3. General Large Detector (for Person & Motorcycle Recall)
        # -------------------------------------------------------------
        if self.yolo_model:
            try:
                gen_results = self.yolo_model(frame, verbose=False, conf=0.25, imgsz=imgsz)
                for r in gen_results:
                    for box in r.boxes:
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
                        # COCO class 0: person, 3: motorcycle, 1: bicycle
                        if cls_id == 0:
                            persons.append(bbox)
                        elif cls_id in (1, 3):
                            # Add motorcycle if not already covered
                            if not any(self._calculate_iou(bbox, m) > 0.45 for m in motorcycles):
                                motorcycles.append(bbox)
            except Exception as e:
                logger.error(f"General detector inference error: {e}")

        # -------------------------------------------------------------
        # 4. Pose Estimator (17-Keypoint Human Skeleton)
        # -------------------------------------------------------------
        if self.pose_model:
            try:
                pose_results = self.pose_model(frame, verbose=False, conf=0.25, imgsz=imgsz)
                for pr in pose_results:
                    if pr.keypoints is not None:
                        kp_data = pr.keypoints.data.cpu().numpy()
                        for person_kp in kp_data:
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
                logger.error(f"Pose estimation error: {e}")

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
            "no_helmets": no_helmets,
            "plate_boxes": plate_boxes,
            "skeletons": skeletons
        }

    @staticmethod
    def _calculate_iou(b1: Dict[str, Any], b2: Dict[str, Any]) -> float:
        x1 = max(b1["x"], b2["x"])
        y1 = max(b1["y"], b2["y"])
        x2 = min(b1["x"] + b1["width"], b2["x"] + b2["width"])
        y2 = min(b1["y"] + b1["height"], b2["y"] + b2["height"])
        inter = max(0, x2 - x1) * max(0, y2 - y1)
        area1 = b1["width"] * b1["height"]
        area2 = b2["width"] * b2["height"]
        union = area1 + area2 - inter
        return inter / union if union > 0 else 0.0

detector = TrafficObjectDetector()
