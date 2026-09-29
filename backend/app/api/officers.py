from typing import List
from fastapi import APIRouter, Depends
from backend.app.models.schemas import ViolationResponse
from backend.app.utils.security import require_officer
from backend.app.api.violations import LOCAL_VIOLATIONS

router = APIRouter(prefix="/api/officer", tags=["Officer Workflow"])

@router.get("/cases", response_model=List[ViolationResponse])
async def get_officer_cases(officer_user: dict = Depends(require_officer)):
    """Fetches recent cases booked by the currently authenticated field officer."""
    officer_id = officer_user.get("sub")
    badge = officer_user.get("badge_number")
    
    # Return cases assigned to this officer, or all recent if admin inspecting
    if officer_user.get("role") == "admin":
        return LOCAL_VIOLATIONS
        
    officer_cases = [
        v for v in LOCAL_VIOLATIONS
        if v.get("officer_id") == officer_id or v.get("badge_number") == badge
    ]
    return officer_cases
