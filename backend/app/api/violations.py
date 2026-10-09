import os
import json
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from backend.app.models.schemas import ViolationCreate, ViolationResponse, ViolationStatusUpdate
from backend.app.utils.security import get_current_user, get_optional_current_user, require_officer, require_admin
from backend.app.services.supabase_service import supabase_service
from backend.app.utils.logging import logger

router = APIRouter(prefix="/api/violations", tags=["Violations & Cases"])

STORAGE_FILE = Path("storage/violations.json")

def _load_violations() -> List[dict]:
    if STORAGE_FILE.exists():
        try:
            with open(STORAGE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data
        except Exception as e:
            logger.error(f"Failed to load violations cache: {e}")
    return []

def _save_violations(violations: List[dict]):
    try:
        STORAGE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(STORAGE_FILE, "w", encoding="utf-8") as f:
            json.dump(violations, f, indent=2, default=str)
    except Exception as e:
        logger.error(f"Failed to persist violations cache: {e}")

# In-memory violation repository initialized with seed / persisted cases
LOCAL_VIOLATIONS: List[dict] = _load_violations()

def calculate_fine(data: ViolationCreate) -> int:
    """Calculates fine under Indian Motor Vehicles Amendment Act 2019."""
    fine = 0
    if data.helmet_violation:
        fine += 1000  # Section 194D MVA (No helmet)
    if data.triple_riding:
        fine += 1000  # Section 194C MVA (Overloading/Triple riding)
    if data.minor_riding:
        fine += 25000 # Section 199A MVA (Juvenile driving)
    if data.no_license:
        fine += 5000  # Section 181 MVA (Driving without license)
    if data.drunk_driving:
        fine += 10000 # Section 185 MVA (Drunk driving 1st offence)
    return max(500, fine)

@router.post("", response_model=ViolationResponse, status_code=status.HTTP_201_CREATED)
async def create_violation(
    violation_data: ViolationCreate,
    current_user: dict = Depends(require_officer)
):
    """
    Submits a finalized case created by a traffic officer after video AI review.
    Enforces server-side validation and calculates official challan fine amount.
    """
    case_num = f"TRF-2026-{uuid.uuid4().hex[:6].upper()}"
    fine = calculate_fine(violation_data)
    
    from backend.app.api.admin import REGISTERED_VEHICLES
    owner_phone = None
    for v in REGISTERED_VEHICLES:
        if v.get("vehicle_number") == violation_data.vehicle_number.upper().strip():
            owner_phone = v.get("owner_phone")
            break
            
    new_record = {
        "id": str(uuid.uuid4()),
        "case_number": case_num,
        "officer_id": current_user.get("sub"),
        "officer_name": current_user.get("name", "Field Officer"),
        "badge_number": current_user.get("badge_number", "POL-001"),
        "vehicle_number": violation_data.vehicle_number.upper().strip(),
        "location": violation_data.location,
        "latitude": violation_data.latitude,
        "longitude": violation_data.longitude,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "helmet_violation": violation_data.helmet_violation,
        "triple_riding": violation_data.triple_riding,
        "ai_confidence": violation_data.ai_confidence,
        "minor_riding": violation_data.minor_riding,
        "no_license": violation_data.no_license,
        "drunk_driving": violation_data.drunk_driving,
        "drunk_driving_notes": violation_data.drunk_driving_notes,
        "status": "Pending Review",
        "fine_amount": fine,
        "challan_due_date": "2026-10-30",
        "evidence_video_url": violation_data.evidence_video_url,
        "evidence_image_url": violation_data.evidence_image_url,
        "officer_remarks": violation_data.officer_remarks,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "owner_phone": owner_phone
    }
    
    LOCAL_VIOLATIONS.insert(0, new_record)
    _save_violations(LOCAL_VIOLATIONS)
    logger.info(f"Officer {current_user.get('email')} submitted case {case_num} for vehicle {new_record['vehicle_number']}")
    return new_record

@router.get("", response_model=List[ViolationResponse])
async def list_violations(
    status: Optional[str] = None,
    vehicle: Optional[str] = None,
    user: Optional[dict] = Depends(get_optional_current_user)
):
    """
    Returns list of violations.
    If role == 'officer', filters to their own cases unless admin.
    """
    results = LOCAL_VIOLATIONS
    
    if user and user.get("role") == "officer":
        # Officer view: can see their cases
        officer_id = user.get("sub")
        badge = user.get("badge_number")
        results = [v for v in results if v.get("officer_id") == officer_id or v.get("badge_number") == badge]
        
    if status:
        results = [v for v in results if v.get("status") == status]
    if vehicle:
        results = [v for v in results if vehicle.upper() in v.get("vehicle_number", "").upper()]
        
    return results

@router.get("/{case_id}", response_model=ViolationResponse)
async def get_violation_by_id(case_id: str, user: dict = Depends(get_current_user)):
    for v in LOCAL_VIOLATIONS:
        if v["id"] == case_id or v["case_number"] == case_id:
            return v
    raise HTTPException(status_code=404, detail="Case record not found")

@router.patch("/{case_id}", response_model=ViolationResponse)
async def update_violation_status(
    case_id: str,
    update: ViolationStatusUpdate,
    admin_user: dict = Depends(require_admin)
):
    """Admin updates case status (e.g. Challan Generated, Fine Paid, Dismissed)."""
    for v in LOCAL_VIOLATIONS:
        if v["id"] == case_id or v["case_number"] == case_id:
            v["status"] = update.status
            if update.officer_remarks:
                v["officer_remarks"] = update.officer_remarks
            _save_violations(LOCAL_VIOLATIONS)
            logger.info(f"Admin updated case {case_id} status to {update.status}")
            return v
    raise HTTPException(status_code=404, detail="Case record not found")
