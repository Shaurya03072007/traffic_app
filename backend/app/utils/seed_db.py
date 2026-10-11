import os
from typing import Dict, Any, List
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path("backend/.env"))
load_dotenv()

from backend.app.utils.logging import logger
from backend.app.services.supabase_service import supabase_service

DEMO_AUTH_USERS = [
    {
        "email": "admin@trafficpolice.gov.in",
        "password": "AdminPassword@123",
        "full_name": "ACP R. K. Deshmukh",
        "role": "admin",
        "badge_number": "ACP-7701",
        "department": "HQ Traffic Management & Enforcement",
        "phone": "+91 98490 11223"
    },
    {
        "email": "officer.sharma@trafficpolice.gov.in",
        "password": "OfficerPassword@123",
        "full_name": "Sub-Inspector Vikram Sharma",
        "role": "officer",
        "badge_number": "SI-4421",
        "department": "Cyberabad Traffic Police",
        "phone": "+91 94401 55432",
        "station": "Cyberabad Traffic Station",
        "zone": "West Zone"
    },
    {
        "email": "officer.verma@trafficpolice.gov.in",
        "password": "OfficerPassword@123",
        "full_name": "Head Constable Priya Verma",
        "role": "officer",
        "badge_number": "HC-8819",
        "department": "Madhapur Zone Enforcement",
        "phone": "+91 99882 33441",
        "station": "Madhapur Traffic Outpost",
        "zone": "Hitech City Corridor"
    }
]

SEED_VEHICLES = [
    {"vehicle_number": "TS09EA4412", "vehicle_type": "Motorcycle", "owner_name": "Rajesh Kumar Reddy", "owner_phone": "+91 98765 43210", "registration_status": "Active", "insurance_valid_until": "2027-05-14", "puc_valid_until": "2026-11-20"},
    {"vehicle_number": "TS07JH8821", "vehicle_type": "Scooter", "owner_name": "Sunita Sundaram", "owner_phone": "+91 91234 56780", "registration_status": "Active", "insurance_valid_until": "2026-12-01", "puc_valid_until": "2026-10-15"},
    {"vehicle_number": "DL04BC8921", "vehicle_type": "Motorcycle", "owner_name": "Manish Gupta", "owner_phone": "+91 97112 34567", "registration_status": "Suspended", "insurance_valid_until": "2025-08-10", "puc_valid_until": "2025-09-01"},
    {"vehicle_number": "KA05EQ7714", "vehicle_type": "Motorcycle", "owner_name": "Kiran Narayan", "owner_phone": "+91 94800 12345", "registration_status": "Active", "insurance_valid_until": "2028-01-30", "puc_valid_until": "2027-02-14"},
    {"vehicle_number": "MH12TR3321", "vehicle_type": "Motorcycle", "owner_name": "Aditya Joshi", "owner_phone": "+91 98220 99881", "registration_status": "Active", "insurance_valid_until": "2027-04-18", "puc_valid_until": "2026-12-25"},
    {"vehicle_number": "AP9AL7175", "vehicle_type": "Scooter", "owner_name": "Priya Test", "owner_phone": "+91 99999 11111", "registration_status": "Active", "insurance_valid_until": "2028-12-31", "puc_valid_until": "2027-01-01"},
    {"vehicle_number": "TN998281", "vehicle_type": "Motorcycle", "owner_name": "Abdul Test", "owner_phone": "+91 99999 22222", "registration_status": "Active", "insurance_valid_until": "2026-10-31", "puc_valid_until": "2026-10-31"}
]

SEED_VIOLATIONS = [
    {
        "case_number": "TRF-2026-000101",
        "vehicle_number": "TS09EA4412",
        "location": "Cyber Towers Junction, Hitech City, Hyderabad",
        "latitude": 17.4504,
        "longitude": 78.3808,
        "helmet_violation": True,
        "triple_riding": False,
        "ai_confidence": 0.94,
        "minor_riding": False,
        "no_license": False,
        "drunk_driving": False,
        "status": "Challan Generated",
        "fine_amount": 1000,
        "challan_due_date": "2026-10-30",
        "evidence_video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        "evidence_image_url": "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&q=80",
        "officer_remarks": "Rider proceeding towards Mindspace circle without protective headgear. Captured on patrol camera."
    },
    {
        "case_number": "TRF-2026-000102",
        "vehicle_number": "TS07JH8821",
        "location": "Inorbit Mall Crossroads, Madhapur, Hyderabad",
        "latitude": 17.4359,
        "longitude": 78.3867,
        "helmet_violation": True,
        "triple_riding": True,
        "ai_confidence": 0.91,
        "minor_riding": True,
        "no_license": True,
        "drunk_driving": False,
        "status": "Pending Review",
        "fine_amount": 35000,
        "challan_due_date": "2026-10-30",
        "evidence_video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        "evidence_image_url": "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&q=80",
        "officer_remarks": "Three youths observed riding two-wheeler at high speed. Driver confirmed juvenile without licence."
    },
    {
        "case_number": "TRF-2026-000103",
        "vehicle_number": "DL04BC8921",
        "location": "Kukatpally Y-Junction, NH-65, Hyderabad",
        "latitude": 17.4875,
        "longitude": 78.4116,
        "helmet_violation": False,
        "triple_riding": True,
        "ai_confidence": 0.88,
        "minor_riding": False,
        "no_license": False,
        "drunk_driving": True,
        "status": "Challan Generated",
        "fine_amount": 11000,
        "challan_due_date": "2026-10-15",
        "evidence_video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
        "evidence_image_url": "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&q=80",
        "officer_remarks": "Triple riding detected; driver stopped at checkpoint and tested positive for alcohol."
    },
    {
        "case_number": "TRF-2026-000104",
        "vehicle_number": "KA05EQ7714",
        "location": "Gachibowli Outer Ring Road Entry, Hyderabad",
        "latitude": 17.4401,
        "longitude": 78.3489,
        "helmet_violation": True,
        "triple_riding": False,
        "ai_confidence": 0.96,
        "minor_riding": False,
        "no_license": False,
        "drunk_driving": False,
        "status": "Fine Paid",
        "fine_amount": 1000,
        "challan_due_date": "2026-10-20",
        "evidence_video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
        "evidence_image_url": "https://images.unsplash.com/photo-1558980664-769d59546b3d?w=800&q=80",
        "officer_remarks": "Pillion and rider both without standard BIS helmets."
    },
    {
        "case_number": "TRF-2026-000105",
        "vehicle_number": "MH12TR3321",
        "location": "Bio-Diversity Park Circle, Old Mumbai Highway",
        "latitude": 17.4298,
        "longitude": 78.3789,
        "helmet_violation": True,
        "triple_riding": True,
        "ai_confidence": 0.92,
        "minor_riding": False,
        "no_license": True,
        "drunk_driving": False,
        "status": "Pending Review",
        "fine_amount": 3000,
        "challan_due_date": "2026-10-30",
        "evidence_video_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
        "evidence_image_url": "https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=800&q=80",
        "officer_remarks": "Multiple riders without safety helmets. Vehicle was not carrying original registration or insurance documents."
    }
]

def seed_database():
    """Seeds Supabase database with users, profiles, officers, vehicles, and violations."""
    if not supabase_service.is_connected():
        logger.warning("[SEED] Supabase is not connected. Skipping DB seed.")
        return False

    client = supabase_service.get_client()
    logger.info("[SEED] Seeding Supabase PostgreSQL database...")

    # 1. Seed Auth Users & Profiles
    user_map = {}
    try:
        existing_users = client.auth.admin.list_users()
        existing_map = {u.email.lower(): u for u in existing_users}
    except Exception as e:
        logger.error(f"[SEED] Could not list existing auth users: {e}")
        existing_map = {}

    for u_info in DEMO_AUTH_USERS:
        email = u_info["email"].lower()
        user_id = None
        if email in existing_map:
            user_id = existing_map[email].id
            logger.info(f"[SEED] Auth user already exists: {email} ({user_id})")
        else:
            try:
                created = client.auth.admin.create_user({
                    "email": email,
                    "password": u_info["password"],
                    "email_confirm": True
                })
                user_id = created.user.id
                logger.info(f"[SEED] Created auth user: {email} ({user_id})")
            except Exception as e:
                logger.warning(f"[SEED] Error creating auth user {email}: {e}")

        if user_id:
            user_map[email] = user_id
            # Upsert Profile
            try:
                client.table("profiles").upsert({
                    "id": user_id,
                    "email": email,
                    "full_name": u_info["full_name"],
                    "role": u_info["role"],
                    "badge_number": u_info["badge_number"],
                    "department": u_info.get("department", "Traffic Enforcement Division"),
                    "phone": u_info.get("phone")
                }).execute()
                logger.info(f"[SEED] Upserted profile for {email}")
            except Exception as e:
                logger.error(f"[SEED] Error upserting profile {email}: {e}")

            # Upsert Officer if applicable
            if u_info["role"] == "officer":
                try:
                    client.table("officers").upsert({
                        "profile_id": user_id,
                        "badge_number": u_info["badge_number"],
                        "name": u_info["full_name"],
                        "station": u_info.get("station", "Traffic Outpost"),
                        "zone": u_info.get("zone", "Central Traffic Zone"),
                        "phone": u_info.get("phone"),
                        "is_active": True
                    }, on_conflict="badge_number").execute()
                    logger.info(f"[SEED] Upserted officer record for {u_info['badge_number']}")
                except Exception as e:
                    logger.error(f"[SEED] Error upserting officer {u_info['badge_number']}: {e}")

    # 2. Seed Vehicles
    for v in SEED_VEHICLES:
        try:
            client.table("vehicles").upsert(v, on_conflict="vehicle_number").execute()
        except Exception as e:
            logger.error(f"[SEED] Error upserting vehicle {v['vehicle_number']}: {e}")
    logger.info(f"[SEED] Synced {len(SEED_VEHICLES)} registered vehicles in Supabase.")

    # 3. Seed Violations
    for viol in SEED_VIOLATIONS:
        try:
            client.table("violations").upsert(viol, on_conflict="case_number").execute()
        except Exception as e:
            logger.error(f"[SEED] Error upserting violation {viol['case_number']}: {e}")
    logger.info(f"[SEED] Synced {len(SEED_VIOLATIONS)} demo violations in Supabase.")

    logger.info("[SEED] Database seeding complete!")
    return True

if __name__ == "__main__":
    seed_database()
