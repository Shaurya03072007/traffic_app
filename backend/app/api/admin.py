from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from backend.app.models.schemas import AdminDashboardStats, VehicleCreate
from backend.app.utils.security import require_admin
from backend.app.api.violations import LOCAL_VIOLATIONS

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

@router.get("/dashboard", response_model=AdminDashboardStats)
async def get_dashboard(admin_user: dict = Depends(require_admin)):
    total = len(LOCAL_VIOLATIONS)
    helmets = sum(1 for v in LOCAL_VIOLATIONS if v.get("helmet_violation"))
    triples = sum(1 for v in LOCAL_VIOLATIONS if v.get("triple_riding"))
    licence = sum(1 for v in LOCAL_VIOLATIONS if v.get("no_license"))
    minors = sum(1 for v in LOCAL_VIOLATIONS if v.get("minor_riding"))
    drunks = sum(1 for v in LOCAL_VIOLATIONS if v.get("drunk_driving"))
    fines_collected = sum(v.get("fine_amount", 0) for v in LOCAL_VIOLATIONS if v.get("status") == "Fine Paid")

    return AdminDashboardStats(
        total_cases=total,
        today_cases=2,
        helmet_violations=helmets,
        triple_riding_cases=triples,
        licence_violations=licence,
        minor_rider_cases=minors,
        drunk_driving_cases=drunks,
        total_fines_collected=fines_collected,
        active_officers_count=len(OFFICERS_LIST),
        recent_cases=LOCAL_VIOLATIONS[:10]
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
    return OFFICERS_LIST

@router.get("/vehicles")
async def list_vehicles(admin_user: dict = Depends(require_admin)):
    return REGISTERED_VEHICLES

@router.post("/vehicles")
async def create_vehicle(vehicle: VehicleCreate, admin_user: dict = Depends(require_admin)):
    # Append the new vehicle to our mock database
    new_vehicle = vehicle.dict()
    REGISTERED_VEHICLES.append(new_vehicle)
    return {"message": "Vehicle registered successfully", "vehicle": new_vehicle}
