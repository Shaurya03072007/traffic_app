from typing import List, Dict, Any

class TripleRidingDetector:
    """
    Evaluates whether three or more distinct individuals are co-riding a single two-wheeler.
    Uses YOLO26x-Pose human skeletal keypoint verification combined with motorcycle spatial bounds.
    """
    @staticmethod
    def evaluate(motorcycle_records: List[Dict[str, Any]], skeletons: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Inspects each motorcycle and counts verified associated riders using both
        detected person boxes and skeletal keypoints from YOLO26x-Pose.
        """
        max_riders_on_single_bike = 0
        culprit_bike = None
        method_used = "box_association"
        
        for record in motorcycle_records:
            moto = record.get("motorcycle", {})
            mx = moto.get("x", 0)
            my = moto.get("y", 0)
            mw = moto.get("width", 0)
            mh = moto.get("height", 0)
            
            riders = record.get("riders", [])
            # Filter riders with robust association confidence
            valid_riders = [r for r in riders if r.get("association_confidence", 0.0) >= 0.15]
            rider_count = len(valid_riders)
            
            # Skeletal keypoint verification using YOLO26x-Pose
            # Count distinct human heads/shoulders whose spatial coordinates fall within the motorcycle zone
            skeletal_riders_count = 0
            if skeletons:
                for skel in skeletons:
                    # Check head or shoulder points
                    points_to_check = skel.get("head_points", []) + skel.get("shoulder_points", [])
                    in_zone = False
                    for pt in points_to_check:
                        x, y = pt[0], pt[1]
                        # Is point horizontally aligned with motorcycle (+ margin) and above/on seat?
                        if (mx - mw * 0.20) <= x <= (mx + mw + mw * 0.20) and (my - mh * 0.8) <= y <= (my + mh * 0.8):
                            in_zone = True
                            break
                    if in_zone:
                        skeletal_riders_count += 1
                        
            # Use whichever provides highest reliable detection
            effective_count = max(rider_count, skeletal_riders_count)
            if skeletal_riders_count >= 3:
                method_used = "yolo26x_skeletal_pose"
                
            if effective_count > max_riders_on_single_bike:
                max_riders_on_single_bike = effective_count
                culprit_bike = record

        # Under Indian Motor Vehicles Act Section 128, carrying more than one pillion rider is illegal
        if max_riders_on_single_bike >= 3:
            confidence = min(0.98, 0.88 + (max_riders_on_single_bike - 3) * 0.04)
            return {
                "detected": True,
                "confidence": round(confidence, 2),
                "rider_count": max_riders_on_single_bike,
                "details": f"Motorcycle detected with {max_riders_on_single_bike} co-riders (Section 128 MVA Violation - {method_used})",
                "bike_box": culprit_bike["motorcycle"] if culprit_bike else None
            }
        else:
            return {
                "detected": False,
                "confidence": 0.94,
                "rider_count": max_riders_on_single_bike,
                "details": f"Single/Pillion riding detected ({max_riders_on_single_bike} rider(s) within permissible capacity)"
            }

triple_riding_detector = TripleRidingDetector()

