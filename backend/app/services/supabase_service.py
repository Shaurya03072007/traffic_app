import os
import re
from typing import Optional, Dict, Any, List
from backend.app.utils.logging import logger

# Try importing supabase
try:
    from supabase import create_client, Client
    HAS_SUPABASE_LIB = True
except ImportError:
    HAS_SUPABASE_LIB = False
    logger.warning("Supabase Python client not installed. Falling back to local data store.")

class SupabaseService:
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL", "")
        self.supabase_key = os.getenv("SUPABASE_KEY", "")
        self.supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        self.client: Optional[Any] = None
        self.initialized = False

        if HAS_SUPABASE_LIB and self.supabase_url and not self.supabase_url.startswith("https://your-project"):
            try:
                # Use service role key if available for administrative actions
                key_to_use = self.supabase_service_key or self.supabase_key
                self.client = create_client(self.supabase_url, key_to_use)
                self.initialized = True
                logger.info("Successfully connected to Supabase PostgreSQL & Auth.")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {e}. Using local store.")
        else:
            logger.info("Supabase credentials not configured. Operating in local project demo mode.")

    def get_client(self):
        return self.client

    def is_connected(self) -> bool:
        return self.initialized and self.client is not None

    # ----------------- VIOLATIONS DB METHODS -----------------
    def get_violations(self) -> List[Dict[str, Any]]:
        if not self.is_connected():
            return []
        try:
            res = self.client.table("violations").select("*").order("created_at", desc=True).execute()
            return res.data or []
        except Exception as e:
            logger.error(f"[DB] Error querying violations from Supabase: {e}")
            return []

    def create_violation(self, record: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not self.is_connected():
            return None
        try:
            # Clean fields matching schema
            row = {
                "case_number": record.get("case_number"),
                "vehicle_number": record.get("vehicle_number"),
                "location": record.get("location"),
                "latitude": record.get("latitude"),
                "longitude": record.get("longitude"),
                "helmet_violation": bool(record.get("helmet_violation")),
                "triple_riding": bool(record.get("triple_riding")),
                "ai_confidence": float(record.get("ai_confidence", 0.0)),
                "minor_riding": bool(record.get("minor_riding")),
                "no_license": bool(record.get("no_license")),
                "drunk_driving": bool(record.get("drunk_driving")),
                "drunk_driving_notes": record.get("drunk_driving_notes"),
                "status": record.get("status", "Pending Review"),
                "fine_amount": int(record.get("fine_amount", 0)),
                "challan_due_date": record.get("challan_due_date"),
                "evidence_video_url": record.get("evidence_video_url"),
                "evidence_image_url": record.get("evidence_image_url"),
                "officer_remarks": record.get("officer_remarks")
            }
            if record.get("id"):
                row["id"] = record["id"]

            res = self.client.table("violations").insert(row).execute()
            if res.data:
                logger.info(f"[DB] Violation {row['case_number']} inserted into Supabase PostgreSQL.")
                return res.data[0]
        except Exception as e:
            logger.error(f"[DB] Error inserting violation into Supabase: {e}")
        return None

    def update_violation(self, case_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not self.is_connected():
            return None
        try:
            # Query by id or case_number
            res = self.client.table("violations").update(updates).or_(f"id.eq.{case_id},case_number.eq.{case_id}").execute()
            if res.data:
                logger.info(f"[DB] Case {case_id} updated in Supabase: {updates}")
                return res.data[0]
        except Exception as e:
            logger.error(f"[DB] Error updating violation {case_id} in Supabase: {e}")
        return None

    # ----------------- VEHICLES DB METHODS -----------------
    def get_vehicles(self) -> List[Dict[str, Any]]:
        if not self.is_connected():
            return []
        try:
            res = self.client.table("vehicles").select("*").order("created_at", desc=True).execute()
            return res.data or []
        except Exception as e:
            logger.error(f"[DB] Error querying vehicles from Supabase: {e}")
            return []

    def get_vehicle_by_plate(self, plate: str) -> Optional[Dict[str, Any]]:
        if not self.is_connected() or not plate:
            return None
        clean = re.sub(r'[^A-Z0-9]', '', plate.upper())
        try:
            # Try exact match first
            res = self.client.table("vehicles").select("*").ilike("vehicle_number", f"%{clean}%").limit(5).execute()
            if res.data:
                for v in res.data:
                    v_clean = re.sub(r'[^A-Z0-9]', '', v.get("vehicle_number", "").upper())
                    if v_clean == clean:
                        return v
                return res.data[0]
        except Exception as e:
            logger.error(f"[DB] Error finding vehicle {plate} in Supabase: {e}")
        return None

    def create_vehicle(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not self.is_connected():
            return None
        try:
            res = self.client.table("vehicles").upsert(data, on_conflict="vehicle_number").execute()
            if res.data:
                logger.info(f"[DB] Vehicle {data.get('vehicle_number')} saved to Supabase.")
                return res.data[0]
        except Exception as e:
            logger.error(f"[DB] Error creating vehicle in Supabase: {e}")
        return None

    # ----------------- OFFICERS DB METHODS -----------------
    def get_officers(self) -> List[Dict[str, Any]]:
        if not self.is_connected():
            return []
        try:
            res = self.client.table("officers").select("*").execute()
            return res.data or []
        except Exception as e:
            logger.error(f"[DB] Error querying officers from Supabase: {e}")
            return []

    # ----------------- AUTO SEED -----------------
    def auto_seed_if_needed(self):
        if not self.is_connected():
            return
        try:
            res = self.client.table("vehicles").select("id").limit(1).execute()
            if not res.data or len(res.data) == 0:
                logger.info("[DB] Supabase database empty. Running initial seed...")
                from backend.app.utils.seed_db import seed_database
                seed_database()
        except Exception as e:
            logger.warning(f"[DB] Could not check/auto-seed database: {e}")

# Singleton instance
supabase_service = SupabaseService()
