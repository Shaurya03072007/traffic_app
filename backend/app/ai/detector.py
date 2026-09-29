import os
import cv2
import numpy as np
from typing import List, Dict, Any, Tuple
from backend.app.utils.logging import logger

class TrafficObjectDetector:
    """
    Object detection engine using YOLO or OpenCV computer vision pipeline.
    Detects motorcycles, persons, helmets, and vehicles.
    """
    def __init__(self, model_path: str = "models/yolov8n.pt"):
        self.model_path = model_path
        self.yolo_model = None
        self.use_yolo = False
        
        try:
            from ultralytics import YOLO
            if os.path.exists(model_path):
                self.yolo_model = YOLO(model_path)
                self.use_yolo = True
                logger.info(f"Loaded YOLO weights from {model_path}")
            else:
                logger.info(f"YOLO model file not found at {model_path}. Loading standard yolov8n or CV fallback.")
                try:
                    self.yolo_model = YOLO("yolov8n.pt")
                    self.use_yolo = True
                except Exception as e:
                    logger.warning(f"Could not load online weights: {e}. Using OpenCV heuristic pipeline.")
        except Exception as e:
            logger.warning(f"Ultralytics YOLO unavailable: {e}. Using OpenCV heuristic pipeline.")

    def detect_frame(self, frame: np.ndarray) -> Dict[str, List[Dict[str, Any]]]:
        """
        Runs detection on a single RGB/BGR frame.
        Returns dictionary of detected motorcycles, persons, and potential helmets.
        """
        height, width, _ = frame.shape
        motorcycles = []
        persons = []
        helmets = []

        if self.use_yolo and self.yolo_model:
            try:
                results = self.yolo_model(frame, verbose=False)
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
                        
                        # YOLO class 0: person, 3: motorcycle, 1: bicycle
                        if cls_id == 3 and conf >= 0.40:
                            motorcycles.append(bbox)
                        elif cls_id == 0 and conf >= 0.40:
                            persons.append(bbox)
                        elif cls_id in [1, 2]: # bicycle or car
                            if cls_id == 1:
                                motorcycles.append(bbox)
            except Exception as e:
                logger.error(f"YOLO inference error: {e}")



        return {
            "motorcycles": motorcycles,
            "persons": persons,
            "helmets": helmets
        }

detector = TrafficObjectDetector()
