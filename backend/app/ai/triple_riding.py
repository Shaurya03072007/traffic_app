from typing import List, Dict, Any

class TripleRidingDetector:
    """
    Evaluates whether three or more distinct individuals are co-riding a single two-wheeler.
    Uses motorcycle-rider association graphs rather than raw frame person count.
    """
    @staticmethod
    def evaluate(motorcycle_records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Inspects each motorcycle and counts verified associated riders.
        """
        max_riders_on_single_bike = 0
        culprit_bike = None
        
        for record in motorcycle_records:
            riders = record.get("riders", [])
            # Filter riders with robust association confidence
            valid_riders = [r for r in riders if r.get("association_confidence", 0.0) >= 0.35]
            rider_count = len(valid_riders)
            
            if rider_count > max_riders_on_single_bike:
                max_riders_on_single_bike = rider_count
                culprit_bike = record

        # Under Indian Motor Vehicles Act Section 128, carrying more than one pillion rider is illegal
        if max_riders_on_single_bike >= 3:
            # Triple riding confirmed
            confidence = min(0.96, 0.85 + (max_riders_on_single_bike - 3) * 0.05)
            return {
                "detected": True,
                "confidence": round(confidence, 2),
                "rider_count": max_riders_on_single_bike,
                "details": f"Motorcycle detected with {max_riders_on_single_bike} co-riders (Section 128 MVA Violation)",
                "bike_box": culprit_bike["motorcycle"] if culprit_bike else None
            }
        else:
            return {
                "detected": False,
                "confidence": 0.92,
                "rider_count": max_riders_on_single_bike,
                "details": f"Single/Pillion riding detected ({max_riders_on_single_bike} rider(s) within permissible capacity)"
            }

triple_riding_detector = TripleRidingDetector()
