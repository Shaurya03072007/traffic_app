import os
import shutil
import uuid
from pathlib import Path
from typing import Optional, Tuple
from fastapi import UploadFile
from backend.app.utils.logging import logger

ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
STORAGE_DIR = ROOT_DIR / "storage" / "evidence"
TEMP_DIR = ROOT_DIR / "storage" / "temp"

# Ensure directories exist
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

class EvidenceManager:
    @staticmethod
    def sanitize_filename(filename: str, content_type: Optional[str] = None) -> str:
        clean = "".join(c for c in filename if c.isalnum() or c in "._- ").strip()
        ext = Path(clean).suffix.lower() if clean else ""
        if not ext:
            inferred_ext = ".mp4"
            if content_type:
                ct = content_type.lower()
                if "jpeg" in ct or "jpg" in ct:
                    inferred_ext = ".jpg"
                elif "png" in ct:
                    inferred_ext = ".png"
                elif "webp" in ct:
                    inferred_ext = ".webp"
                elif "webm" in ct:
                    inferred_ext = ".webm"
                elif "quicktime" in ct or "mov" in ct:
                    inferred_ext = ".mov"
                elif "video" in ct:
                    inferred_ext = ".mp4"
            clean = f"evidence_{uuid.uuid4().hex[:8]}{inferred_ext}"
        return clean

    @classmethod
    async def save_upload_video(cls, file: UploadFile, case_id: str) -> Tuple[Path, str]:
        """Saves uploaded media file (video or image) to disk and returns absolute path and relative URL."""
        case_dir = STORAGE_DIR / case_id
        case_dir.mkdir(parents=True, exist_ok=True)
        
        safe_name = cls.sanitize_filename(file.filename or "", file.content_type)
        target_path = case_dir / safe_name
        
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        relative_url = f"/static/evidence/{case_id}/{safe_name}"
        logger.info(f"Saved uploaded media for case {case_id} to {target_path}")
        return target_path, relative_url

    @classmethod
    def save_annotated_frame(cls, frame_bytes: bytes, case_id: str, frame_num: int) -> Tuple[Path, str]:
        """Saves evidence annotated frame image."""
        case_dir = STORAGE_DIR / case_id
        case_dir.mkdir(parents=True, exist_ok=True)
        
        frame_name = f"evidence_frame_{frame_num:04d}.jpg"
        target_path = case_dir / frame_name
        
        with open(target_path, "wb") as f:
            f.write(frame_bytes)
            
        relative_url = f"/static/evidence/{case_id}/{frame_name}"
        return target_path, relative_url

    @classmethod
    def cleanup_temp_files(cls):
        """Cleans up temp working files."""
        for item in TEMP_DIR.glob("*"):
            try:
                if item.is_file():
                    item.unlink()
            except Exception as e:
                logger.error(f"Error cleaning {item}: {e}")
