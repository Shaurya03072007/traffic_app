import re
import uuid
from fastapi import APIRouter, HTTPException, status, Depends
from backend.app.models.schemas import LoginRequest, CitizenLoginRequest, AuthResponse, UserProfile
from backend.app.utils.security import create_access_token, get_current_user
from backend.app.services.supabase_service import supabase_service
from backend.app.utils.logging import logger

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Pre-seeded users for demo / LAN test suite
DEMO_USERS = {
    "admin@trafficpolice.gov.in": {
        "id": "a0000000-0000-0000-0000-000000000001",
        "email": "admin@trafficpolice.gov.in",
        "password": "AdminPassword@123",
        "full_name": "ACP R. K. Deshmukh",
        "role": "admin",
        "badge_number": "ACP-7701",
        "department": "HQ Traffic Enforcement Command",
        "phone": "+91 98490 11223"
    },
    "officer.sharma@trafficpolice.gov.in": {
        "id": "b0000000-0000-0000-0000-000000000002",
        "email": "officer.sharma@trafficpolice.gov.in",
        "password": "OfficerPassword@123",
        "full_name": "Sub-Inspector Vikram Sharma",
        "role": "officer",
        "badge_number": "SI-4421",
        "department": "Cyberabad Traffic Patrol",
        "phone": "+91 94401 55432"
    },
    "officer.verma@trafficpolice.gov.in": {
        "id": "c0000000-0000-0000-0000-000000000003",
        "email": "officer.verma@trafficpolice.gov.in",
        "password": "OfficerPassword@123",
        "full_name": "Head Constable Priya Verma",
        "role": "officer",
        "badge_number": "HC-8819",
        "department": "Madhapur Zone Enforcement",
        "phone": "+91 99882 33441"
    }
}

@router.post("/login", response_model=AuthResponse)
async def login(credentials: LoginRequest):
    """
    Unified Single Login: Checks credentials and resolves user role (admin vs officer).
    The client NEVER chooses its role; the backend determines it securely.
    """
    email_clean = credentials.email.lower().strip()
    
    # 1. Try Supabase Auth if connected
    if supabase_service.is_connected():
        try:
            client = supabase_service.get_client()
            res = client.auth.sign_in_with_password({
                "email": email_clean,
                "password": credentials.password
            })
            if res.user:
                profile_res = client.table("profiles").select("*").eq("id", res.user.id).single().execute()
                profile_data = profile_res.data or {}
                
                role = profile_data.get("role", "officer")
                user_profile = UserProfile(
                    id=res.user.id,
                    email=email_clean,
                    full_name=profile_data.get("full_name", res.user.email),
                    role=role,
                    badge_number=profile_data.get("badge_number"),
                    department=profile_data.get("department"),
                    phone=profile_data.get("phone")
                )
                
                token = create_access_token({
                    "sub": res.user.id,
                    "email": email_clean,
                    "role": role,
                    "badge_number": user_profile.badge_number,
                    "name": user_profile.full_name
                })
                
                logger.info(f"User {email_clean} logged in via Supabase. Assigned role: {role}")
                return AuthResponse(access_token=token, user=user_profile)
        except Exception as e:
            logger.warning(f"Supabase login attempt error: {e}. Checking local demo users.")

    # 2. Check Demo / LAN Credentials
    if email_clean in DEMO_USERS:
        stored = DEMO_USERS[email_clean]
        if stored["password"] == credentials.password:
            user_profile = UserProfile(
                id=stored["id"],
                email=stored["email"],
                full_name=stored["full_name"],
                role=stored["role"],
                badge_number=stored["badge_number"],
                department=stored["department"],
                phone=stored["phone"]
            )
            token = create_access_token({
                "sub": stored["id"],
                "email": stored["email"],
                "role": stored["role"],
                "badge_number": stored["badge_number"],
                "name": stored["full_name"]
            })
            logger.info(f"User {email_clean} logged in. Resolved role: {stored['role']}")
            return AuthResponse(access_token=token, user=user_profile)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid traffic police credentials. Please check email and password."
    )

@router.post("/citizen-login", response_model=AuthResponse)
async def citizen_login(credentials: CitizenLoginRequest):
    """
    Citizen / Vehicle Owner Login:
    Plate Number is the ID, and registered phone number is the Password.
    """
    from backend.app.api.admin import REGISTERED_VEHICLES
    from backend.app.api.violations import LOCAL_VIOLATIONS

    plate_input = re.sub(r'[\s\-]', '', credentials.vehicle_number).upper()
    phone_digits = re.sub(r'\D', '', credentials.phone_number)[-10:]

    if not plate_input:
        raise HTTPException(status_code=400, detail="Vehicle number plate is required.")
    if len(phone_digits) < 10:
        raise HTTPException(status_code=400, detail="Please enter a valid 10-digit mobile number.")

    # 1. Search in Registered Vehicles
    matched_vehicle = None
    for v in REGISTERED_VEHICLES:
        v_plate = re.sub(r'[\s\-]', '', v.get("vehicle_number", "")).upper()
        if v_plate == plate_input:
            matched_vehicle = v
            break

    # 2. Search in Violations if not in vehicles
    matched_violation_phone = None
    for viol in LOCAL_VIOLATIONS:
        v_plate = re.sub(r'[\s\-]', '', viol.get("vehicle_number", "")).upper()
        if v_plate == plate_input and viol.get("owner_phone"):
            matched_violation_phone = viol.get("owner_phone")
            break

    expected_phone = None
    owner_name = "Vehicle Owner"
    if matched_vehicle:
        expected_phone = matched_vehicle.get("owner_phone")
        owner_name = matched_vehicle.get("owner_name", "Vehicle Owner")
    elif matched_violation_phone:
        expected_phone = matched_violation_phone

    if not expected_phone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle '{plate_input}' was not found in the regional motor vehicle database."
        )

    expected_digits = re.sub(r'\D', '', expected_phone)[-10:]

    if phone_digits != expected_digits:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Mobile number does not match the registered owner for vehicle {plate_input}."
        )

    citizen_id = f"citizen_{plate_input}"
    v_details = matched_vehicle or {
        "vehicle_number": plate_input,
        "vehicle_type": "Two-Wheeler",
        "owner_name": owner_name,
        "owner_phone": expected_phone,
        "registration_status": "Active",
        "insurance_valid_until": "2027-12-31"
    }

    user_profile = UserProfile(
        id=citizen_id,
        email=f"{plate_input.lower()}@citizen.trafficpolice.gov.in",
        full_name=owner_name,
        role="citizen",
        phone=expected_phone,
        vehicle_number=plate_input,
        vehicle_info=v_details
    )

    token = create_access_token({
        "sub": citizen_id,
        "email": user_profile.email,
        "role": "citizen",
        "vehicle_number": plate_input,
        "name": owner_name
    })

    logger.info(f"Citizen owner {owner_name} logged in for vehicle {plate_input}")
    return AuthResponse(access_token=token, user=user_profile)

@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(user_payload: dict = Depends(get_current_user)):
    """Returns profile for currently authenticated token."""
    email = user_payload.get("email", "")
    if email in DEMO_USERS:
        d = DEMO_USERS[email]
        return UserProfile(
            id=d["id"], email=d["email"], full_name=d["full_name"],
            role=d["role"], badge_number=d["badge_number"],
            department=d["department"], phone=d["phone"]
        )
    return UserProfile(
        id=user_payload.get("sub", str(uuid.uuid4())),
        email=email,
        full_name=user_payload.get("name", "Authorized Officer"),
        role=user_payload.get("role", "officer"),
        badge_number=user_payload.get("badge_number"),
        phone=user_payload.get("phone"),
        vehicle_number=user_payload.get("vehicle_number")
    )
