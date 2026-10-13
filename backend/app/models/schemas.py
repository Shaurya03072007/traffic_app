from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

# ----------------- AUTH SCHEMAS -----------------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class CitizenLoginRequest(BaseModel):
    vehicle_number: str
    phone_number: str

class UserProfile(BaseModel):
    id: str
    email: str
    full_name: str
    role: str # "admin" | "officer" | "citizen"
    badge_number: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    vehicle_number: Optional[str] = None
    vehicle_info: Optional[Dict[str, Any]] = None

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile

# ----------------- AI DETECTION SCHEMAS -----------------
class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float

class AIDetectionItem(BaseModel):
    detected: bool
    confidence: float
    details: Optional[str] = None
    bounding_box: Optional[BoundingBox] = None

class VideoDetectionsResult(BaseModel):
    model_config = {"protected_namespaces": ()}
    case_id: str
    processed_frames: int
    duration_seconds: float
    helmet_violation: AIDetectionItem
    triple_riding: AIDetectionItem
    motorcycle_detected: bool
    riders_count: int
    detected_license_plate: Optional[str] = None
    plate_confidence: float = 0.0
    evidence_frame_url: Optional[str] = None
    evidence_video_url: Optional[str] = None
    model_name: str = "YOLOv8-TrafficCustom-v1.2"

# ----------------- VIOLATION SCHEMAS -----------------
class ViolationCreate(BaseModel):
    vehicle_number: str
    location: str
    latitude: float
    longitude: float
    
    # AI visual flags (verified by officer)
    helmet_violation: bool = False
    triple_riding: bool = False
    ai_confidence: float = 0.0
    
    # Officer manual observations
    minor_riding: bool = False
    no_license: bool = False
    drunk_driving: bool = False
    drunk_driving_notes: Optional[str] = None
    
    # Evidence & Notes
    evidence_video_url: Optional[str] = None
    evidence_image_url: Optional[str] = None
    officer_remarks: Optional[str] = None
    
    # Optional fine override and vehicle owner details
    fine_amount: Optional[int] = None
    owner_phone: Optional[str] = None
    owner_name: Optional[str] = None

class ViolationResponse(BaseModel):
    id: str
    case_number: str
    officer_id: Optional[str] = None
    officer_name: Optional[str] = None
    badge_number: Optional[str] = None
    vehicle_number: str
    location: str
    latitude: float
    longitude: float
    timestamp: datetime
    
    helmet_violation: bool
    triple_riding: bool
    ai_confidence: float
    
    minor_riding: bool
    no_license: bool
    drunk_driving: bool
    drunk_driving_notes: Optional[str] = None
    
    status: str
    fine_amount: int
    challan_due_date: Optional[str] = None
    evidence_video_url: Optional[str] = None
    evidence_image_url: Optional[str] = None
    officer_remarks: Optional[str] = None
    created_at: datetime
    owner_phone: Optional[str] = None
    owner_name: Optional[str] = None

class ViolationStatusUpdate(BaseModel):
    status: str
    officer_remarks: Optional[str] = None

# ----------------- STATS SCHEMAS -----------------
class AdminDashboardStats(BaseModel):
    total_cases: int
    today_cases: int
    helmet_violations: int
    triple_riding_cases: int
    licence_violations: int
    minor_rider_cases: int
    drunk_driving_cases: int
    total_fines_collected: int
    active_officers_count: int
    recent_cases: List[ViolationResponse]

class VehicleCreate(BaseModel):
    vehicle_number: Optional[str] = None
    vehicleNumber: Optional[str] = None
    vehicle_type: Optional[str] = "Motorcycle"
    vehicleType: Optional[str] = None
    owner_name: Optional[str] = None
    ownerName: Optional[str] = None
    owner_phone: Optional[str] = None
    ownerPhone: Optional[str] = None
    registration_status: Optional[str] = "Active"
    registrationStatus: Optional[str] = None
    insurance_valid_until: Optional[str] = "2027-12-31"
    insuranceValidUntil: Optional[str] = None

    def to_clean_dict(self) -> dict:
        v_num = self.vehicle_number or self.vehicleNumber or ""
        return {
            "vehicle_number": v_num.strip().upper(),
            "vehicle_type": self.vehicle_type or self.vehicleType or "Motorcycle",
            "owner_name": self.owner_name or self.ownerName or "Registered Citizen",
            "owner_phone": self.owner_phone or self.ownerPhone or "+91 99999 00000",
            "registration_status": self.registration_status or self.registrationStatus or "Active",
            "insurance_valid_until": self.insurance_valid_until or self.insuranceValidUntil or "2027-12-31"
        }
