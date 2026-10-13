import os
import sys
import time
import importlib.util
import subprocess
import urllib.request
from pathlib import Path

REQUIRED_MODULES = [
    ("fastapi", "fastapi>=0.115.0"),
    ("uvicorn", "uvicorn[standard]>=0.31.0"),
    ("pydantic", "pydantic>=2.9.2"),
    ("multipart", "python-multipart>=0.0.12"),
    ("jose", "python-jose[cryptography]>=3.3.0"),
    ("passlib", "passlib[bcrypt]>=1.7.4"),
    ("supabase", "supabase>=2.8.1"),
    ("cv2", "opencv-python-headless>=4.10.0.84"),
    ("ultralytics", "ultralytics>=8.3.1"),
    ("numpy", "numpy>=1.26.4"),
    ("requests", "requests>=2.32.3"),
    ("dotenv", "python-dotenv>=1.0.1"),
    ("aiofiles", "aiofiles>=24.1.0"),
    ("websockets", "websockets>=13.1"),
    ("PIL", "pillow>=10.4.0"),
    ("easyocr", "easyocr>=1.7.2"),
    ("torch", "torch"),
]

REQUIRED_MODELS = {}

def check_and_install_libraries():
    """
    Scans Python environment for all mandatory packages.
    Installs any missing libraries automatically using pip.
    """
    print("=" * 70)
    print("[BOOTSTRAP] Checking required Python dependencies...")
    missing = []
    
    for mod_name, pkg_spec in REQUIRED_MODULES:
        spec = importlib.util.find_spec(mod_name)
        if spec is None:
            missing.append((mod_name, pkg_spec))

    if not missing:
        print("[BOOTSTRAP] All required Python dependencies are installed and up to date.")
    else:
        print(f"[BOOTSTRAP] Found {len(missing)} missing package(s). Installing automatically...")
        for mod_name, pkg_spec in missing:
            print(f"[BOOTSTRAP] Installing '{pkg_spec}'...")
            try:
                subprocess.check_call([
                    sys.executable, "-m", "pip", "install", pkg_spec, "--no-warn-script-location"
                ])
                print(f"[BOOTSTRAP] Successfully installed '{mod_name}'.")
            except Exception as e:
                print(f"[BOOTSTRAP ERROR] Failed to install '{pkg_spec}': {e}")
                raise

def _download_file(url: str, dest_path: Path, desc: str):
    print(f"[BOOTSTRAP] Downloading {desc}...")
    print(f"            Source: {url}")
    print(f"            Target: {dest_path}")
    
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = dest_path.with_suffix(".tmp")
    
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "TrafficWatch-AutoBootstrap/1.0"}
    )
    
    with urllib.request.urlopen(req) as response, open(temp_path, "wb") as out_file:
        total_size = int(response.info().get("Content-Length", 0))
        downloaded = 0
        chunk_size = 1024 * 512 # 512 KB
        last_log = time.time()
        
        while True:
            chunk = response.read(chunk_size)
            if not chunk:
                break
            out_file.write(chunk)
            downloaded += len(chunk)
            if total_size > 0 and time.time() - last_log > 1.0:
                percent = (downloaded / total_size) * 100
                mb_down = downloaded / (1024 * 1024)
                mb_total = total_size / (1024 * 1024)
                print(f"[BOOTSTRAP] Progress: {percent:.1f}% ({mb_down:.1f} MB / {mb_total:.1f} MB)", end="\r")
                last_log = time.time()

    print(f"\n[BOOTSTRAP] Finished downloading {dest_path.name} ({downloaded / (1024*1024):.1f} MB).")
    temp_path.replace(dest_path)

def check_and_download_models():
    """
    Scans the models directory for all mandatory deep learning weights.
    Downloads any missing model files directly from the remote repository.
    """
    print("[BOOTSTRAP] Checking AI model weights in models/ directory...")
    
    candidates_dirs = [
        Path("models"),
        Path(__file__).resolve().parent.parent.parent.parent / "models",
    ]
    models_dir = Path("models")
    for cd in candidates_dirs:
        if cd.exists():
            models_dir = cd
            break
            
    models_dir.mkdir(parents=True, exist_ok=True)
    
    for filename, info in REQUIRED_MODELS.items():
        target_path = models_dir / filename
        min_bytes = info.get("min_bytes", 1_000_000)
        
        if not target_path.exists() or target_path.stat().st_size < min_bytes:
            print(f"[BOOTSTRAP] Model file '{filename}' missing or incomplete.")
            try:
                _download_file(info["url"], target_path, info["desc"])
            except Exception as e:
                print(f"[BOOTSTRAP ERROR] Failed to download '{filename}': {e}")
                # Don't crash immediately if offline; fallback might exist
        else:
            size_mb = target_path.stat().st_size / (1024 * 1024)
            print(f"[BOOTSTRAP] Model '{filename}' verified ({size_mb:.1f} MB).")

    print("[BOOTSTRAP] All AI models and dependencies verified. Server is ready.")
    print("=" * 70)

def ensure_system_ready():
    """
    Master pre-flight check invoked on FastAPI startup.
    Ensures zero-downtime automated setup for local, LAN, or production environments.
    """
    check_and_install_libraries()
    check_and_download_models()

if __name__ == "__main__":
    ensure_system_ready()
