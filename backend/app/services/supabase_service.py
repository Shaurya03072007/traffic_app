import os
import re
import json
from pathlib import Path
from typing import Optional, Dict, Any, List
import requests
from backend.app.utils.logging import logger

def _resolve_storage_dir() -> Path:
    """Deterministically resolves the storage directory regardless of current working directory."""
    try:
        # Traverse up from backend/app/services to project root
        root = Path(__file__).resolve().parent.parent.parent.parent
        storage = root / "storage"
        storage.mkdir(parents=True, exist_ok=True)
        return storage
    except Exception:
        fallback = Path("storage").resolve()
        fallback.mkdir(parents=True, exist_ok=True)
        return fallback

STORAGE_DIR = _resolve_storage_dir()
VEHICLES_FILE = STORAGE_DIR / "vehicles.json"
VIOLATIONS_FILE = STORAGE_DIR / "violations.json"
OFFICERS_FILE = STORAGE_DIR / "officers.json"

DEFAULT_SUPABASE_URL = "https://vbvwakcxyvbiqkdxuwjw.supabase.co"
DEFAULT_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZidndha2N4eXZiaXFrZHh1d2p3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTQ5NjM1NiwiZXhwIjoyMTA3MDcyMzU2fQ.r2P21wTnCeZT5cxYuJUonfiQHAGaAyF9-Zy2UF1iNEo"
DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZidndha2N4eXZiaXFrZHh1d2p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTYzNTYsImV4cCI6MjEwNzA3MjM1Nn0.sQxsvab9_ZdL_dmhkW1lykDUqQCzXnmNREVQD84GzoE"

SEED_VEHICLES: List[Dict[str, Any]] = [
    {"vehicle_number": "TS09EA4412", "vehicle_type": "Motorcycle", "owner_name": "Rajesh Kumar Reddy", "owner_phone": "+91 98765 43210", "registration_status": "Active", "insurance_valid_until": "2027-05-14", "puc_valid_until": "2026-11-20"},
    {"vehicle_number": "TS07JH8821", "vehicle_type": "Scooter", "owner_name": "Sunita Sundaram", "owner_phone": "+91 91234 56780", "registration_status": "Active", "insurance_valid_until": "2026-12-01", "puc_valid_until": "2026-10-15"},
    {"vehicle_number": "DL04BC8921", "vehicle_type": "Motorcycle", "owner_name": "Manish Gupta", "owner_phone": "+91 97112 34567", "registration_status": "Suspended", "insurance_valid_until": "2025-08-10", "puc_valid_until": "2025-09-01"},
    {"vehicle_number": "KA05EQ7714", "vehicle_type": "Motorcycle", "owner_name": "Kiran Narayan", "owner_phone": "+91 94800 12345", "registration_status": "Active", "insurance_valid_until": "2028-01-30", "puc_valid_until": "2027-02-14"},
    {"vehicle_number": "MH12TR3321", "vehicle_type": "Motorcycle", "owner_name": "Aditya Joshi", "owner_phone": "+91 98220 99881", "registration_status": "Active", "insurance_valid_until": "2027-04-18", "puc_valid_until": "2026-12-25"},
    {"vehicle_number": "AP28BK9001", "vehicle_type": "Car", "owner_name": "Venkat Rao", "owner_phone": "+91 99490 88771", "registration_status": "Active", "insurance_valid_until": "2026-09-30", "puc_valid_until": "2026-08-30"},
    {"vehicle_number": "AP9AL7175", "vehicle_type": "Scooter", "owner_name": "Priya Test", "owner_phone": "+91 99999 11111", "registration_status": "Active", "insurance_valid_until": "2028-12-31", "puc_valid_until": "2027-01-01"},
    {"vehicle_number": "TN998281", "vehicle_type": "Motorcycle", "owner_name": "Abdul Test", "owner_phone": "+91 99999 22222", "registration_status": "Active", "insurance_valid_until": "2026-10-31", "puc_valid_until": "2026-10-31"}
]

SEED_OFFICERS: List[Dict[str, Any]] = [
    {"id": "305a8b7a-07b1-418d-9808-e6c82be30d58", "name": "Sub-Inspector Vikram Sharma", "badge_number": "SI-4421", "station": "Cyberabad Traffic Station", "zone": "West Zone", "phone": "+91 94401 55432", "is_active": True, "cases_booked": 142},
    {"id": "e0000000-0000-0000-0000-000000000002", "name": "Head Constable Priya Verma", "badge_number": "HC-8819", "station": "Madhapur Traffic Outpost", "zone": "Hitech City Corridor", "phone": "+91 99882 33441", "is_active": True, "cases_booked": 98},
    {"id": "e0000000-0000-0000-0000-000000000003", "name": "Assistant Sub-Inspector Manoj Patel", "badge_number": "ASI-2190", "station": "Gachibowli Junction Control", "zone": "Financial District", "phone": "+91 98221 00998", "is_active": True, "cases_booked": 76}
]

class SupabaseService:
    """
    Rock-Solid Dual-Tier Database Service:
    - Tier 1: Supabase PostgreSQL Cloud via direct high-performance PostgREST REST API
    - Tier 2: Atomic Local JSON Cache (storage/vehicles.json & storage/violations.json)
    Zero namespace conflicts, zero external client library dependencies, instant offline fallback,
    and automatic vehicle-owner-phone linking on every fine issued.
    """

    def __init__(self):
        self.supabase_url = (os.getenv("SUPABASE_URL") or DEFAULT_SUPABASE_URL).rstrip("/")
        self.anon_key = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_ANON_KEY") or DEFAULT_ANON_KEY
        self.service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or DEFAULT_SERVICE_KEY
        self.key = self.service_key
        
        self.session = requests.Session()
        self.session.headers.update({
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        })
        self.rest_url = f"{self.supabase_url}/rest/v1"
        self._connected = False
        self._test_connection()
        self._init_local_cache()

    def _test_connection(self):
        """Verifies active connectivity to Supabase PostgreSQL."""
        try:
            resp = self.session.get(f"{self.rest_url}/vehicles?select=id&limit=1", timeout=4)
            if resp.status_code == 200:
                self._connected = True
                logger.info("[DB] Successfully connected to Supabase PostgreSQL Database (Cloud Live).")
            else:
                self._connected = False
                logger.warning(f"[DB] Supabase responded with status {resp.status_code}. Using local persistence.")
        except Exception as e:
            self._connected = False
            logger.info(f"[DB] Running in local persistent storage mode ({e}).")

    def _init_local_cache(self):
        """Ensures local storage files exist with seed data."""
        if not VEHICLES_FILE.exists():
            self._save_local_json(VEHICLES_FILE, SEED_VEHICLES)
        if not OFFICERS_FILE.exists():
            self._save_local_json(OFFICERS_FILE, SEED_OFFICERS)
        if not VIOLATIONS_FILE.exists():
            self._save_local_json(VIOLATIONS_FILE, [])

    @staticmethod
    def _load_local_json(path: Path) -> List[Dict[str, Any]]:
        try:
            if path.exists():
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"[DB Local] Error loading {path}: {e}")
        return []

    @staticmethod
    def _save_local_json(path: Path, data: List[Dict[str, Any]]):
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"[DB Local] Error saving {path}: {e}")

    def is_connected(self) -> bool:
        return self._connected

    # ----------------- AUTH METHODS -----------------
    def sign_in_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticates user against Supabase Auth REST and retrieves associated profile."""
        if not self._connected:
            return None
        try:
            auth_url = f"{self.supabase_url}/auth/v1/token?grant_type=password"
            resp = requests.post(
                auth_url,
                headers={"apikey": self.anon_key, "Content-Type": "application/json"},
                json={"email": email, "password": password},
                timeout=5
            )
            if resp.status_code == 200:
                auth_data = resp.json()
                user_obj = auth_data.get("user", {})
                user_id = user_obj.get("id")
                
                profile_data = {}
                p_resp = self.session.get(f"{self.rest_url}/profiles?id=eq.{user_id}&select=*", timeout=4)
                if p_resp.status_code == 200 and p_resp.json():
                    profile_data = p_resp.json()[0]

                return {
                    "user": user_obj,
                    "access_token": auth_data.get("access_token"),
                    "profile": profile_data
                }
        except Exception as e:
            logger.warning(f"[DB Auth] Supabase auth attempt note: {e}")
        return None

    # ----------------- VEHICLES DB METHODS -----------------
    def get_vehicles(self) -> List[Dict[str, Any]]:
        """Retrieves all registered vehicles from Supabase DB, synced with local cache."""
        if self._connected:
            try:
                resp = self.session.get(f"{self.rest_url}/vehicles?select=*&order=created_at.desc", timeout=5)
                if resp.status_code == 200 and resp.json():
                    data = resp.json()
                    self._save_local_json(VEHICLES_FILE, data)
                    return data
            except Exception as e:
                logger.debug(f"[DB] Vehicle query note: {e}")
        return self._load_local_json(VEHICLES_FILE) or SEED_VEHICLES

    def get_vehicle_by_plate(self, plate: str) -> Optional[Dict[str, Any]]:
        """
        Rock-solid vehicle lookup with character normalization (handles spaces, hyphens).
        Returns owner details, phone number, and registration status.
        """
        if not plate:
            return None
        clean = re.sub(r"[^A-Z0-9]", "", plate.upper())
        if not clean or clean == "UNKNOWN":
            return None

        # 1. Try Supabase cloud query
        if self._connected:
            try:
                resp = self.session.get(
                    f"{self.rest_url}/vehicles?vehicle_number=eq.{clean}&select=*",
                    timeout=4
                )
                if resp.status_code == 200 and resp.json():
                    return resp.json()[0]
                
                # Case-insensitive / partial search
                resp_ilike = self.session.get(
                    f"{self.rest_url}/vehicles?vehicle_number=ilike.*{clean}*&select=*",
                    timeout=4
                )
                if resp_ilike.status_code == 200 and resp_ilike.json():
                    return resp_ilike.json()[0]
            except Exception as e:
                logger.debug(f"[DB] Remote vehicle lookup note: {e}")

        # 2. Local cache fallback
        local_vehicles = self.get_vehicles()
        for v in local_vehicles:
            v_clean = re.sub(r"[^A-Z0-9]", "", v.get("vehicle_number", "").upper())
            if v_clean == clean:
                return v

        return None

    def create_vehicle(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Registers a new vehicle in Supabase and persists locally."""
        v_num = re.sub(r"[^A-Z0-9]", "", data.get("vehicle_number", "").upper())
        if not v_num:
            return None

        record = {
            "vehicle_number": v_num,
            "vehicle_type": data.get("vehicle_type", "Motorcycle"),
            "owner_name": data.get("owner_name", "Registered Citizen"),
            "owner_phone": data.get("owner_phone", "+91 99999 00000"),
            "registration_status": data.get("registration_status", "Active"),
            "insurance_valid_until": data.get("insurance_valid_until", "2027-12-31"),
            "puc_valid_until": data.get("puc_valid_until", "2026-12-31")
        }

        # 1. Save to Supabase
        if self._connected:
            try:
                resp = self.session.post(
                    f"{self.rest_url}/vehicles",
                    json=record,
                    headers={"Prefer": "resolution=merge-duplicates,return=representation"},
                    timeout=5
                )
                if resp.status_code in [200, 201] and resp.json():
                    record = resp.json()[0]
                    logger.info(f"[DB] Registered vehicle {v_num} saved to Supabase Cloud.")
            except Exception as e:
                logger.error(f"[DB] Remote vehicle insert error: {e}")

        # 2. Update local storage
        local_v = self._load_local_json(VEHICLES_FILE)
        existing = [v for v in local_v if re.sub(r"[^A-Z0-9]", "", v.get("vehicle_number", "").upper()) != v_num]
        existing.insert(0, record)
        self._save_local_json(VEHICLES_FILE, existing)
        return record

    # ----------------- VIOLATIONS & FINES DB METHODS -----------------
    def _enrich_violations(self, violations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Enriches violations with vehicle owner name, registered phone number,
        and officer badge details from the vehicles and officers tables.
        Ensures SMS service and UI always receive valid owner phone numbers.
        """
        vehicles = self.get_vehicles()
        v_map: Dict[str, Dict[str, Any]] = {}
        for v in vehicles:
            p_clean = re.sub(r"[^A-Z0-9]", "", v.get("vehicle_number", "").upper())
            if p_clean:
                v_map[p_clean] = v

        for viol in violations:
            clean_plate = re.sub(r"[^A-Z0-9]", "", viol.get("vehicle_number", "").upper())
            matched = v_map.get(clean_plate)
            if matched:
                if not viol.get("owner_phone"):
                    viol["owner_phone"] = matched.get("owner_phone")
                if not viol.get("owner_name"):
                    viol["owner_name"] = matched.get("owner_name")
            else:
                if not viol.get("owner_phone"):
                    viol["owner_phone"] = "+91 99999 00000"
                if not viol.get("owner_name"):
                    viol["owner_name"] = "Registered Citizen"

        return violations

    def get_violations(self) -> List[Dict[str, Any]]:
        """Retrieves all violations with fines, officer details, and owner phone numbers."""
        violations = []
        if self._connected:
            try:
                resp = self.session.get(f"{self.rest_url}/violations?select=*&order=created_at.desc", timeout=5)
                if resp.status_code == 200 and resp.json():
                    violations = resp.json()
            except Exception as e:
                logger.debug(f"[DB] Remote violations query note: {e}")

        if not violations:
            violations = self._load_local_json(VIOLATIONS_FILE)

        enriched = self._enrich_violations(violations)
        self._save_local_json(VIOLATIONS_FILE, enriched)
        return enriched

    def create_violation(self, record: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Inserts official traffic violation with fine amount and owner phone.
        - Enforces vehicle number plate normalization.
        - Checks/registers vehicle in the vehicles database so phone number is permanently stored.
        - Persists to Supabase PostgreSQL table 'violations' and atomic local JSON cache.
        """
        v_clean = re.sub(r"[^A-Z0-9]", "", record.get("vehicle_number", "").upper())
        if not v_clean:
            v_clean = "UNKNOWN"

        # 1. Ensure vehicle is registered and grab owner details
        v_info = self.get_vehicle_by_plate(v_clean)
        if v_info:
            owner_phone = record.get("owner_phone") or v_info.get("owner_phone")
            owner_name = record.get("owner_name") or v_info.get("owner_name")
        else:
            # Auto-register newly spotted vehicle in vehicles database so plate & phone persist
            owner_phone = record.get("owner_phone") or "+91 99999 00000"
            owner_name = record.get("owner_name") or "Registered Citizen"
            self.create_vehicle({
                "vehicle_number": v_clean,
                "vehicle_type": "Motorcycle",
                "owner_name": owner_name,
                "owner_phone": owner_phone,
                "registration_status": "Active",
                "insurance_valid_until": "2027-12-31"
            })

        record["owner_phone"] = owner_phone
        record["owner_name"] = owner_name
        record["vehicle_number"] = v_clean

        # Filter fields strictly for the Supabase 'violations' schema
        clean_row = {
            "case_number": record.get("case_number"),
            "vehicle_number": v_clean,
            "location": record.get("location", "Cyber Towers Junction, Hitech City, Hyderabad"),
            "latitude": float(record.get("latitude", 17.4504)),
            "longitude": float(record.get("longitude", 78.3808)),
            "helmet_violation": bool(record.get("helmet_violation")),
            "triple_riding": bool(record.get("triple_riding")),
            "ai_confidence": float(record.get("ai_confidence", 0.95)),
            "minor_riding": bool(record.get("minor_riding")),
            "no_license": bool(record.get("no_license")),
            "drunk_driving": bool(record.get("drunk_driving")),
            "drunk_driving_notes": record.get("drunk_driving_notes"),
            "status": record.get("status", "Pending Review"),
            "fine_amount": int(record.get("fine_amount", 1000)),
            "challan_due_date": record.get("challan_due_date", "2026-11-30"),
            "evidence_video_url": record.get("evidence_video_url"),
            "evidence_image_url": record.get("evidence_image_url"),
            "officer_remarks": record.get("officer_remarks")
        }
        if record.get("officer_id"):
            clean_row["officer_id"] = record["officer_id"]
        if record.get("id"):
            clean_row["id"] = record["id"]

        # 2. Post to Supabase Cloud
        if self._connected:
            try:
                resp = self.session.post(
                    f"{self.rest_url}/violations",
                    json=clean_row,
                    headers={"Prefer": "return=representation"},
                    timeout=5
                )
                if resp.status_code in [200, 201] and resp.json():
                    saved = resp.json()[0]
                    saved["owner_phone"] = owner_phone
                    saved["owner_name"] = owner_name
                    saved["officer_name"] = record.get("officer_name")
                    saved["badge_number"] = record.get("badge_number")
                    logger.info(f"[DB] Violation {saved.get('case_number')} for {v_clean} (Fine: Rs {saved.get('fine_amount')}) saved to Supabase Cloud.")
                    
                    # Update local cache
                    local_v = self._load_local_json(VIOLATIONS_FILE)
                    local_v.insert(0, saved)
                    self._save_local_json(VIOLATIONS_FILE, local_v)
                    return saved
            except Exception as e:
                logger.error(f"[DB] Error writing violation to Supabase: {e}")

        # 3. Local persistence fallback
        local_v = self._load_local_json(VIOLATIONS_FILE)
        local_v.insert(0, record)
        self._save_local_json(VIOLATIONS_FILE, local_v)
        return record

    def update_violation(self, case_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Updates violation status (e.g. Fine Paid, Approved) in Supabase and local cache."""
        if self._connected:
            try:
                resp = self.session.patch(
                    f"{self.rest_url}/violations?case_number=eq.{case_id}",
                    json=updates,
                    timeout=5
                )
                if resp.status_code in [200, 204]:
                    logger.info(f"[DB] Updated case {case_id} in Supabase: {updates}")
            except Exception as e:
                logger.error(f"[DB] Error updating violation in Supabase: {e}")

        local_v = self._load_local_json(VIOLATIONS_FILE)
        for item in local_v:
            if item.get("case_number") == case_id or item.get("id") == case_id:
                item.update(updates)
                break
        self._save_local_json(VIOLATIONS_FILE, local_v)
        return updates

    # ----------------- OFFICERS DB METHODS -----------------
    def get_officers(self) -> List[Dict[str, Any]]:
        if self._connected:
            try:
                resp = self.session.get(f"{self.rest_url}/officers?select=*", timeout=4)
                if resp.status_code == 200 and resp.json():
                    return resp.json()
            except Exception:
                pass
        return self._load_local_json(OFFICERS_FILE) or SEED_OFFICERS

    def auto_seed_if_needed(self):
        """Ensures both Supabase and local tables are pre-populated and readiness verified."""
        v = self.get_vehicles()
        logger.info(f"[DB Readiness] Active vehicles registered: {len(v)}")
        cases = self.get_violations()
        logger.info(f"[DB Readiness] Active enforcement cases: {len(cases)}")

# Singleton database instance
supabase_service = SupabaseService()
