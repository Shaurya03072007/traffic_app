import os
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

# Singleton instance
supabase_service = SupabaseService()
