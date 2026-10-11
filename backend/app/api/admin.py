import re
from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from backend.app.models.schemas import AdminDashboardStats, VehicleCreate
from backend.app.utils.security import require_admin
from backend.app.api.violations import get_all_active_violations
from backend.app.services.supabase_service import supabase_service
from backend.app.utils.logging import logger

router = APIRouter(prefix="/api/admin", tags=["Admin Portal & Analytics"])

REGISTERED_VEHICLES = [
    {"vehicle_number": "TS09EA4412", "vehicle_type": "Motorcycle", "owner_name": "Rajesh Kumar Reddy", "owner_phone": "+91 98765 43210", "registration_status": "Active", "insurance_valid_until": "2027-05-14"},
    {"vehicle_number": "TS07JH8821", "vehicle_type": "Scooter", "owner_name": "Sunita Sundaram", "owner_phone": "+91 91234 56780", "registration_status": "Active", "insurance_valid_until": "2026-12-01"},
    {"vehicle_number": "DL04BC8921", "vehicle_type": "Motorcycle", "owner_name": "Manish Gupta", "owner_phone": "+91 97112 34567", "registration_status": "Suspended", "insurance_valid_until": "2025-08-10"},
    {"vehicle_number": "KA05EQ7714", "vehicle_type": "Motorcycle", "owner_name": "Kiran Narayan", "owner_phone": "+91 94800 12345", "registration_status": "Active", "insurance_valid_until": "2028-01-30"},
    {"vehicle_number": "MH12TR3321", "vehicle_type": "Motorcycle", "owner_name": "Aditya Joshi", "owner_phone": "+91 98220 99881", "registration_status": "Active", "insurance_valid_until": "2027-04-18"},
    {"vehicle_number": "AP9AL7175", "vehicle_type": "Scooter", "owner_name": "Priya Test", "owner_phone": "+91 99999 11111", "registration_status": "Active", "insurance_valid_until": "2028-12-31"},
    {"vehicle_number": "TN998281", "vehicle_type": "Motorcycle", "owner_name": "Abdul Test", "owner_phone": "+91 99999 22222", "registration_status": "Active", "insurance_valid_until": "2026-10-31"}
]

OFFICERS_LIST = [
    {"id": "d0000000-0000-0000-0000-000000000001", "name": "Sub-Inspector Vikram Sharma", "badge_number": "SI-4421", "station": "Cyberabad Traffic Station", "zone": "West Zone", "phone": "+91 94401 55432", "active": True, "cases_booked": 142},
    {"id": "e0000000-0000-0000-0000-000000000002", "name": "Head Constable Priya Verma", "badge_number": "HC-8819", "station": "Madhapur Traffic Outpost", "zone": "Hitech City", "phone": "+91 99882 33441", "active": True, "cases_booked": 98},
    {"id": "e0000000-0000-0000-0000-000000000003", "name": "Assistant Sub-Inspector Manoj Patel", "badge_number": "ASI-2190", "station": "Gachibowli Junction Control", "zone": "Financial District", "phone": "+91 98221 00998", "active": True, "cases_booked": 76}
]

def get_all_active_vehicles() -> List[dict]:
    """Retrieves vehicles from Supabase DB, falling back to local list."""
    if supabase_service.is_connected():
        db_v = supabase_service.get_vehicles()
        if db_v and len(db_v) > 0:
            seen = set()
            merged = []
            for v in db_v:
                clean = re.sub(r'[^A-Z0-9]', '', v.get("vehicle_number", "").upper())
                seen.add(clean)
                merged.append(v)
            for v in REGISTERED_VEHICLES:
                clean = re.sub(r'[^A-Z0-9]', '', v.get("vehicle_number", "").upper())
                if clean not in seen:
                    merged.append(v)
            return merged
    return REGISTERED_VEHICLES

@router.get("/dashboard", response_model=AdminDashboardStats)
async def get_dashboard(admin_user: dict = Depends(require_admin)):
    active_cases = get_all_active_violations()
    total = len(active_cases)
    helmets = sum(1 for v in active_cases if v.get("helmet_violation"))
    triples = sum(1 for v in active_cases if v.get("triple_riding"))
    licence = sum(1 for v in active_cases if v.get("no_license"))
    minors = sum(1 for v in active_cases if v.get("minor_riding"))
    drunks = sum(1 for v in active_cases if v.get("drunk_driving"))
    fines_collected = sum(v.get("fine_amount", 0) for v in active_cases if v.get("status") == "Fine Paid")

    officers = OFFICERS_LIST
    if supabase_service.is_connected():
        db_officers = supabase_service.get_officers()
        if db_officers:
            officers = db_officers

    return AdminDashboardStats(
        total_cases=total,
        today_cases=min(total, 5),
        helmet_violations=helmets,
        triple_riding_cases=triples,
        licence_violations=licence,
        minor_rider_cases=minors,
        drunk_driving_cases=drunks,
        total_fines_collected=fines_collected,
        active_officers_count=len(officers),
        recent_cases=active_cases[:10]
    )

@router.get("/statistics")
async def get_statistics(admin_user: dict = Depends(require_admin)):
    return {
        "violations_by_day": [
            {"day": "Mon", "helmet": 14, "triple": 6, "drunk": 1},
            {"day": "Tue", "helmet": 18, "triple": 8, "drunk": 2},
            {"day": "Wed", "helmet": 22, "triple": 9, "drunk": 1},
            {"day": "Thu", "helmet": 19, "triple": 7, "drunk": 3},
            {"day": "Fri", "helmet": 28, "triple": 15, "drunk": 8},
            {"day": "Sat", "helmet": 35, "triple": 22, "drunk": 12},
            {"day": "Sun", "helmet": 31, "triple": 19, "drunk": 9}
        ],
        "violations_by_type": [
            {"name": "Helmet Violation", "count": 147, "color": "#f59e0b"},
            {"name": "Triple Riding", "count": 86, "color": "#ef4444"},
            {"name": "No Valid Licence", "count": 42, "color": "#3b82f6"},
            {"name": "Drunk Driving", "count": 36, "color": "#8b5cf6"},
            {"name": "Minor Rider", "count": 19, "color": "#ec4899"}
        ],
        "top_locations": [
            {"location": "Cyber Towers Junction", "count": 52},
            {"location": "Inorbit Mall Crossroads", "count": 41},
            {"location": "Kukatpally Y-Junction", "count": 38},
            {"location": "Gachibowli ORR Entry", "count": 29}
        ]
    }

@router.get("/officers")
async def list_officers(admin_user: dict = Depends(require_admin)):
    if supabase_service.is_connected():
        db_officers = supabase_service.get_officers()
        if db_officers:
            return db_officers
    return OFFICERS_LIST

@router.get("/vehicles")
async def list_vehicles(admin_user: dict = Depends(require_admin)):
    return get_all_active_vehicles()

@router.get("/vehicles/{plate_number}")
async def get_vehicle_by_plate(plate_number: str):
    # Check Supabase
    if supabase_service.is_connected():
        v = supabase_service.get_vehicle_by_plate(plate_number)
        if v:
            return v

    norm = re.sub(r'[\s\-]', '', plate_number).upper()
    for v in REGISTERED_VEHICLES:
        if re.sub(r'[\s\-]', '', v.get("vehicle_number", "")).upper() == norm:
            return v
    raise HTTPException(status_code=404, detail=f"Vehicle '{plate_number}' not found")

@router.post("/vehicles")
async def create_vehicle(vehicle: VehicleCreate, admin_user: dict = Depends(require_admin)):
    new_vehicle = vehicle.dict()
    # Save to Supabase
    if supabase_service.is_connected():
        supabase_service.create_vehicle(new_vehicle)
    # Also update local list
    REGISTERED_VEHICLES.append(new_vehicle)
    logger.info(f"Admin registered new vehicle: {new_vehicle.get('vehicle_number')}")
    return {"message": "Vehicle registered successfully", "vehicle": new_vehicle}
