from typing import List, Dict, Any, Optional

class TripleRidingDetector:
    """
    Evaluates whether three or more distinct individuals are co-riding a single two-wheeler.
    Uses multi-signal verification:
    1. Direct deep-learning head/helmet counts (NHelmet + Helmet detections situated on the bike)
    2. Associated person bounding boxes (spatial containment on seat plane)
    3. 17-Keypoint skeletal human pose heads/shoulders
    """
    @staticmethod
    def evaluate(
        motorcycle_records: List[Dict[str, Any]],
        skeletons: Optional[List[Dict[str, Any]]] = None,
        detections: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Inspects each motorcycle and counts verified associated riders.
        """
        max_riders_on_single_bike = 0
        culprit_bike = None
        method_used = "deep_learning_head_count"

        # Collect all head detections (helmets + bare heads) if available
        all_head_boxes = []
        if detections:
            all_head_boxes.extend(detections.get("helmets", []))
            all_head_boxes.extend(detections.get("no_helmets", []))

        for record in motorcycle_records:
            moto = record.get("motorcycle", {})
            mx = moto.get("x", 0)
            my = moto.get("y", 0)
            mw = moto.get("width", 0)
            mh = moto.get("height", 0)

            # Signal 1: Deep learning head count in the motorcycle zone
            dl_head_count = 0
            for hb in all_head_boxes:
                hx = hb["x"] + hb["width"] / 2.0
                hy = hb["y"] + hb["height"] / 2.0
                # Head must be horizontally aligned with the bike and above/on seat
                if (mx - mw * 0.30) <= hx <= (mx + mw + mw * 0.30) and (my - mh * 1.1) <= hy <= (my + mh * 0.7):
                    dl_head_count += 1

            # Signal 2: Rider box association
            riders = record.get("riders", [])
            valid_riders = [r for r in riders if r.get("association_confidence", 0.0) >= 0.12]
            rider_count = len(valid_riders)

            # Signal 3: Skeletal pose keypoint verification
            skeletal_riders_count = 0
            if skeletons:
                for skel in skeletons:
                    points_to_check = skel.get("head_points", []) + skel.get("shoulder_points", [])
                    in_zone = False
                    for pt in points_to_check:
                        x, y = pt[0], pt[1]
                        if (mx - mw * 0.25) <= x <= (mx + mw + mw * 0.25) and (my - mh * 0.9) <= y <= (my + mh * 0.8):
                            in_zone = True
                            break
                    if in_zone:
                        skeletal_riders_count += 1

            # Combined multi-modal rider count for this bike
            effective_count = max(dl_head_count, rider_count, skeletal_riders_count)
            if effective_count >= 3:
                if dl_head_count >= 3:
                    method_used = "deep_learning_head_cluster"
                elif skeletal_riders_count >= 3:
                    method_used = "skeletal_pose_verification"
                else:
                    method_used = "spatial_box_association"

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
                "details": f"Motorcycle carrying {max_riders_on_single_bike} co-riders (Section 128 MVA Violation - {method_used})",
                "bike_box": culprit_bike["motorcycle"] if culprit_bike else None
            }
        else:
            return {
                "detected": False,
                "confidence": 0.92,
                "rider_count": max_riders_on_single_bike,
                "details": f"Normal passenger capacity: {max_riders_on_single_bike} rider(s) on motorcycle"
            }

triple_riding_detector = TripleRidingDetector()
