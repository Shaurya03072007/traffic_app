import uuid
from typing import Dict, Any, Optional
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from backend.app.models.schemas import VideoDetectionsResult
from backend.app.utils.security import require_officer
from backend.app.services.evidence import EvidenceManager
from backend.app.services.video_processor import video_processor
from backend.app.utils.logging import logger

router = APIRouter(prefix="/api/videos", tags=["Videos & AI Processing"])

# In-memory storage for processed video detection results
DETECTION_CACHE: Dict[str, Dict[str, Any]] = {}

@router.post("/upload", response_model=VideoDetectionsResult)
async def upload_and_process_video(
    file: UploadFile = File(...),
    officer_user: dict = Depends(require_officer)
):
    """
    1. Authenticates officer.
    2. Validates video MIME type and file structure.
    3. Saves file to evidence storage.
    4. Extracts frames and executes AI pipeline (YOLO + Tracker + Helmet + Triple Riding).
    5. Returns detection results with confidence and bounding boxes for officer review.
    """
    if not file.content_type or not ("video" in file.content_type or file.filename.endswith(('.mp4', '.avi', '.mov', '.webm'))):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid video file format. Supported: MP4, AVI, MOV, WebM."
        )

    case_id = f"TRF-2026-{uuid.uuid4().hex[:6].upper()}"
    logger.info(f"Officer {officer_user.get('email')} uploaded video for case {case_id}")

    try:
        # Save video file
        saved_path, video_url = await EvidenceManager.save_upload_video(file, case_id)
        
        # Process video with AI computer vision pipeline
        result = video_processor.process_video_file(saved_path, case_id)
        result["evidence_video_url"] = video_url
        
        # Cache results for review screen lookup
        DETECTION_CACHE[case_id] = result
        
        return result
    except Exception as e:
        logger.error(f"Error processing video for case {case_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Video processing failed: {str(e)}"
        )

@router.get("/{case_id}")
async def get_video_status(case_id: str, officer_user: dict = Depends(require_officer)):
    if case_id in DETECTION_CACHE:
        return {"status": "completed", "data": DETECTION_CACHE[case_id]}
    return {"status": "not_found", "message": f"Case {case_id} not in active processing queue"}

@router.get("/detections/{video_id}")
async def get_video_detections(video_id: str, officer_user: dict = Depends(require_officer)):
    if video_id in DETECTION_CACHE:
        return DETECTION_CACHE[video_id]
    raise HTTPException(status_code=404, detail="Detection results not found")
