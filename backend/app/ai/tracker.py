from typing import List, Dict, Any, Tuple
import math

class RiderMotorcycleAssociator:
    """
    Associates detected persons with motorcycles based on spatial intersection,
    vertical overlap, and center-point proximity.
    
    LIMITATION NOTE (CRITICAL FOR POLICE ENFORCEMENT AUDIT):
    Associating persons with vehicles in 2D video coordinates has inherent optical limitations:
    1. Perspective overlap: A pedestrian standing on the pavement behind a moving motorcycle
       may appear vertically aligned with the motorcycle in the 2D camera plane.
    2. Occlusion: In dense traffic, adjacent two-wheelers can merge bounding boxes.
    Therefore, the algorithm uses strict vertical containment (person's base must rest on/near 
    motorcycle seat plane) and checks horizontal bounds. Any violation remains decision-support 
    for the human officer rather than an automated legal penalty.
    """
    
    @staticmethod
    def calculate_association_score(person: Dict[str, Any], motorcycle: Dict[str, Any]) -> float:
        px, py, pw, ph = person["x"], person["y"], person["width"], person["height"]
        mx, my, mw, mh = motorcycle["x"], motorcycle["y"], motorcycle["width"], motorcycle["height"]
        
        person_center_x = px + (pw / 2.0)
        person_bottom_y = py + ph
        moto_center_x = mx + (mw / 2.0)
        moto_center_y = my + (mh / 2.0)
        moto_top_y = my
        
        # Horizontal containment: Person center must be within or very close to motorcycle horizontal bounds
        h_margin = mw * 0.35
        if person_center_x < (mx - h_margin) or person_center_x > (mx + mw + h_margin):
            return 0.0 # Clear pedestrian outside the lateral zone of the bike
            
        # Vertical alignment: Rider must be seated on top portion of the motorcycle
        # Person bottom should be between moto top - 20% and moto middle + 30%
        v_dist = abs(person_bottom_y - (moto_top_y + mh * 0.3))
        max_allowed_v = mh * 0.7
        
        if v_dist > max_allowed_v:
            return 0.0 # Likely standing background pedestrian or distant object
            
        # Intersection over union approximation of rider base and motorcycle top
        overlap_score = max(0.0, 1.0 - (v_dist / max_allowed_v))
        h_score = max(0.0, 1.0 - (abs(person_center_x - moto_center_x) / (mw + 1e-5)))
        
        return (overlap_score * 0.6) + (h_score * 0.4)

    @classmethod
    def associate(cls, motorcycles: List[Dict[str, Any]], persons: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Assigns each person to their most probable motorcycle.
        Returns a list of motorcycle objects each containing an 'associated_riders' list.
        """
        results = []
        for moto in motorcycles:
            moto_record = {
                "motorcycle": moto,
                "riders": []
            }
            results.append(moto_record)
            
        for person in persons:
            best_match = None
            highest_score = 0.30 # Minimum association threshold
            
            for m_rec in results:
                score = cls.calculate_association_score(person, m_rec["motorcycle"])
                if score > highest_score:
                    highest_score = score
                    best_match = m_rec
                    
            if best_match is not None:
                person_copy = dict(person)
                person_copy["association_confidence"] = round(highest_score, 2)
                best_match["riders"].append(person_copy)
                
        return results

rider_associator = RiderMotorcycleAssociator()
