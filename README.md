# TrafficWatch - AI Traffic Violation & Enforcement Management System

A production-structured, full-stack traffic enforcement system modeled on modern Indian traffic-police workflow (Major / College Project). Designed for local LAN and local development deployment.

---

## 1. PROJECT ARCHITECTURE

The system consists of three coordinated parts:

1. **Android Application (`android/TrafficOfficer`)**:
   - Built with **Kotlin** and **Jetpack Compose**.
   - Used exclusively by authorized field traffic officers.
   - Features video capture using device camera, video upload, and a case review screen.
   - Single unified authentication against backend.
   - **Crucial Security Constraint:** Never exposes an admin interface; does not hold the database service-role key.

2. **Backend Server (`backend/`)**:
   - Built with **Python** and **FastAPI** + **Uvicorn**.
   - Integrates **OpenCV**, **Ultralytics YOLO**, and spatial centroid tracking.
   - Computes helmet violation probabilities and counts riders associated with a vehicle.
   - Automatic role resolution via secure JWT authentication.
   - WebSocket endpoint for live camera telemetry.

3. **Web Administrative Dashboard (`src/` / `web/`)**:
   - Built with **React 19**, **Vite**, and **Tailwind CSS**.
   - **Single Unified Login Screen:** Evaluates credentials and automatically routes `admin` to `/admin/dashboard` and `officer` to `/officer/dashboard`.
   - Real-time geospatial GIS map via **Leaflet + OpenStreetMap**.
   - Detailed evidence inspector with bounding-box canvas overlays.
   - Official e-Challan generation under the Indian Motor Vehicles Act.
   - Interactive AI Video Lab for demo evaluation.

4. **Central Database & Auth (`supabase/`)**:
   - **PostgreSQL** schema with `profiles`, `officers`, `violations`, `ai_detections`, `vehicles`, and `evidence`.
   - **Row Level Security (RLS)** ensuring officers access only authorized cases.

---

## 2. REPOSITORY FILE STRUCTURE

```
traffic-management-system/
├── STEP_BY_STEP_INSTRUCTIONS.md # Complete zero-to-hero setup guide for beginners
├── README.md                    # Project documentation
│
├── supabase/
│   ├── schema.sql               # PostgreSQL tables, types, triggers, and indexes
│   ├── seed.sql                 # Indian vehicles, officers, violations, and telemetry
│   └── policies.sql             # Row Level Security (RLS) policies
│
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point, CORS, and WebSocket
│   │   ├── api/
│   │   │   ├── auth.py          # Unified login and token validation
│   │   │   ├── videos.py        # Video upload and AI pipeline trigger
│   │   │   ├── violations.py    # Violation submission and status updates
│   │   │   ├── officers.py      # Officer shift case management
│   │   │   └── admin.py         # Administrative metrics and statistics
│   │   ├── ai/
│   │   │   ├── detector.py      # YOLOv8 & OpenCV computer vision inference
│   │   │   ├── tracker.py       # Spatial motorcycle-rider associator
│   │   │   ├── helmet.py        # Head crop and helmet contour analysis
│   │   │   ├── triple_riding.py # Multi-rider detection (Section 128 MVA)
│   │   │   └── plate_ocr.py     # Indian license plate OCR localizer
│   │   ├── services/
│   │   │   ├── supabase_service.py # Supabase client integration
│   │   │   ├── video_processor.py  # 4 FPS frame sampling and annotation
│   │   │   └── evidence.py         # Evidence storage manager
│   │   ├── models/
│   │   │   └── schemas.py       # Pydantic data validation schemas
│   │   └── utils/
│   │       ├── security.py      # JWT authentication and role enforcement
│   │       └── logging.py       # Standardized logger
│   ├── requirements.txt         # Python dependencies
│   └── .env.example             # Backend configuration template
│
├── android/TrafficOfficer/
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml # Permissions (Camera, Network, Cleartext)
│   │   │   ├── res/xml/network_security_config.xml # LAN IP cleartext allowance
│   │   │   └── java/com/trafficofficer/app/
│   │   │       ├── MainActivity.kt # Navigation host
│   │   │       ├── data/
│   │   │       │   ├── api/TrafficApiService.kt # Retrofit & OkHttp client
│   │   │       │   └── model/Models.kt # Data classes
│   │   │       └── ui/
│   │   │           ├── login/LoginScreen.kt # Single login (NO role selector)
│   │   │           ├── dashboard/OfficerDashboardScreen.kt # Officer UI
│   │   │           ├── capture/VideoCaptureScreen.kt # CameraX recording
│   │   │           ├── review/OfficerReviewScreen.kt # Case review & manual flags
│   │   │           └── theme/Theme.kt # Police Material3 styling
│   │   └── build.gradle.kts     # App module dependencies
│   ├── build.gradle.kts
│   └── settings.gradle.kts
│
└── src/                         # React Web Application (Vite + Tailwind CSS)
    ├── App.tsx                  # Main router and state coordinator
    ├── pages/
    │   ├── AdminDashboard.tsx   # Admin overview, statistics, and table
    │   └── OfficerDashboard.tsx # Browser portal mirroring the Android app
    ├── components/
    │   ├── Navbar.tsx           # Official header with status badges
    │   ├── LoginPage.tsx        # Single login page with auto-routing
    │   ├── LeafletMap.tsx       # Interactive OpenStreetMap violation radar
    │   ├── CaseDetailsModal.tsx # Evidence inspector with video/photo
    │   ├── PrintChallanModal.tsx# Printable Indian e-Challan receipt
    │   ├── DemoVideoLab.tsx     # 4 benchmark video test cases
    │   ├── ArchitectureViewer.tsx # Architecture and LAN configuration
    │   ├── OfficersDirectory.tsx# Active police roster
    │   └── VehiclesDirectory.tsx# Vahan vehicle registration lookup
    ├── services/
    │   └── api.ts               # Pre-seeded database and API client
    └── types/
        └── index.ts             # TypeScript interface definitions
```

---

## 3. IMPORTANT AI ETHICS & LEGAL LIMITATIONS

Under Indian jurisprudence and constitutional principles of evidence:

1. **Probabilistic Decision Support:** AI visual detection is probabilistic and serves strictly as decision-support for the field officer. An automated legal penalty is **never** issued solely based on raw AI prediction without human review.
2. **Sobriety / Drunk Driving:** The system **never** infers alcohol consumption from facial video. Drunk driving (`Section 185 MVA`) is strictly logged through an official officer observation accompanied by an authorized breathalyzer / alcometer reading.
3. **Licence Verification:** Licence validity is verified via official registry lookup, not inferred visually from video.
4. **Human-in-the-Loop Override:** The Officer Review Screen enables officers to correct any false positive before legal case submission.

---

## 4. ARCHITECTURAL TRADEOFF ANALYSIS

| Ingestion Strategy | Frame Rate | Compute Load | Latency | Evaluation Verdict |
|---|---|---|---|---|
| **Every Frame** | 30 FPS | Very High (100% CPU/GPU) | High (Queue lag) | Unsuitable for multi-officer LAN |
| **Frame Sampling** | **4 FPS** | **Balanced (85% reduction)** | **Sub-second** | **Optimal Project Selection** |
| **Short Chunks** | WebM Chunks | Medium | Near Real-time | Useful for live dashcam feeds |

---

## 5. DEFAULT TEST CREDENTIALS

The web portal and Android app use a single login screen. The backend automatically detects the user's role upon successful authentication:

| Role | Email | Password | Resulting View |
|---|---|---|---|
| **Admin** | `admin@trafficpolice.gov.in` | `AdminPassword@123` | Redirects to `/admin/dashboard` |
| **Officer** | `officer.sharma@trafficpolice.gov.in` | `OfficerPassword@123` | Redirects to `/officer/dashboard` |
| **Officer** | `officer.verma@trafficpolice.gov.in` | `OfficerPassword@123` | Redirects to `/officer/dashboard` |

---

## 6. QUICK START COMMANDS

### Start Backend (Python FastAPI):
```bash
cd backend
python -m venv venv
source venv/bin/activate    # or .\venv\Scripts\activate on Windows
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Start Web Portal (React + Vite):
```bash
npm install
npm run dev
```

### Run Android App:
Open `android/TrafficOfficer` in Android Studio and press **Run (▶)**.
See `STEP_BY_STEP_INSTRUCTIONS.md` for complete zero-to-hero instructions.
