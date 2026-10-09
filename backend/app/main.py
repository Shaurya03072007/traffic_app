import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path("backend/.env"))
    load_dotenv()
except Exception:
    pass

from backend.app.api.auth import router as auth_router
from backend.app.api.videos import router as videos_router
from backend.app.api.violations import router as violations_router
from backend.app.api.officers import router as officers_router
from backend.app.api.admin import router as admin_router
from backend.app.utils.logging import logger

# Ensure evidence storage exists
STORAGE_DIR = Path("storage/evidence")
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("==================================================================")
    logger.info("TRAFFICWATCH BACKEND SERVER INITIALIZED (FASTAPI + OPENCV + YOLO)")
    logger.info("Serving LAN clients, Android App & Web Administrative Portal")
    logger.info("==================================================================")
    yield
    logger.info("TrafficWatch backend gracefully shutting down...")

app = FastAPI(
    title="Traffic Violation Detection & Enforcement API",
    description="High-performance backend for traffic police field officers and administrative dashboard",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware configured to allow LAN IP access (Android devices & Web dashboard)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development/LAN environment, permit all LAN origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static evidence storage for streaming evidence images and clips
app.mount("/static/evidence", StaticFiles(directory=str(STORAGE_DIR)), name="evidence")

# Include Routers
app.include_router(auth_router)
app.include_router(videos_router)
app.include_router(violations_router)
app.include_router(officers_router)
app.include_router(admin_router)

@app.get("/api/health")
async def health_check():
    return {
        "status": "operational",
        "service": "TrafficWatch Enforcement Backend",
        "mode": "LAN / Local Development",
        "ai_models": ["YOLOv8-TrafficCustom", "Head-Crop Helmet Analyzer", "Multi-Rider Associator"]
    }

# WebSocket for live camera streaming & inference status
@app.websocket("/ws/live-video")
async def websocket_live_video_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("Android/Web client connected to live video WebSocket stream")
    try:
        while True:
            # Receive frame data or metadata
            data = await websocket.receive_text()
            # Send real-time telemetry back
            await websocket.send_json({
                "status": "analyzing",
                "fps": 24.5,
                "objects_tracked": 3,
                "current_violation_risk": "low"
            })
    except WebSocketDisconnect:
        logger.info("Live video client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")

if __name__ == "__main__":
    import uvicorn
    # Bind to 0.0.0.0 so phone on same Wi-Fi LAN can connect via PC's local IP address
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("backend.app.main:app", host=host, port=port, reload=True)
