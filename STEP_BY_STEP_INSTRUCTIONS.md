# TRAFFICWATCH: COMPLETE ZERO-TO-HERO STEP-BY-STEP INSTRUCTIONS GUIDE
### For Beginners, College Evaluation Panels & Local LAN Setup

This guide is designed for developers with zero prior experience in Python, Android Studio, or Supabase. Follow these exact steps sequentially.

---

## SYSTEM ARCHITECTURE OVERVIEW

The system consists of three interconnected components running over your local Wi-Fi or LAN:

```
+-------------------------------------------------------------------------+
|                              LOCAL AREA NETWORK (LAN)                   |
|                                                                         |
|   +--------------------------+          +---------------------------+   |
|   |   ANDROID MOBILE APP     |          |      WEB ADMIN PORTAL     |   |
|   | (Traffic Police Officer) |          | (ACP / HQ Administration) |   |
|   |    Kotlin + CameraX      |          |       React + Vite        |   |
|   +------------+-------------+          +-------------+-------------+   |
|                |                                      |                 |
|   POST /videos/upload                    GET /violations, Dashboard     |
|   POST /violations                                    |                 |
|                v                                      v                 |
|   +-----------------------------------------------------------------+   |
|   |                  FASTAPI PYTHON BACKEND SERVER                  |   |
|   |                     Runs on: 192.168.X.X:8000                   |   |
|   |                                                                 |   |
|   |  - Video Processing & 4 FPS Frame Sampler                       |   |
|   |  - YOLOv8 Object Detection (Motorcycles, Helmets, Riders)       |   |
|   |  - Rider-Vehicle Spatial Centroid Associator (Triple Riding)    |   |
|   |  - Number Plate OCR Localizer                                   |   |
|   |  - Role Resolution (Admin vs Officer)                           |   |
|   +--------------------------------+--------------------------------+   |
|                                    |                                    |
+------------------------------------|------------------------------------+
                                     |
                                     v
                  +-------------------------------------+
                  |           SUPABASE CLOUD            |
                  |                                     |
                  |  - PostgreSQL Database              |
                  |  - Row Level Security (RLS)         |
                  |  - Supabase Auth (Single Login)     |
                  |  - Storage Buckets (Evidence Video) |
                  +-------------------------------------+
```

---

## PREREQUISITES INSTALLED ON YOUR PC
Ensure you have the following installed on Windows/Mac:
1. **Windows 10/11** or macOS / Linux
2. **VS Code** (Visual Studio Code)
3. **Android Studio Hedgehog / Iguana / Jellyfish**

---

## STEP 1: INSTALL PYTHON & CREATE VIRTUAL ENVIRONMENT

1. Download **Python 3.10 or 3.11** from [https://www.python.org/downloads/](https://www.python.org/downloads/).
   > **CRITICAL WINDOWS STEP:** On the first installer screen, make sure to check the box:
   > `☑ Add python.exe to PATH` before clicking Install.

2. Open **PowerShell** or **Command Prompt** as Administrator and verify:
   ```powershell
   python --version
   pip --version
   ```

3. Navigate to the project root directory:
   ```powershell
   cd path\to\traffic-management-system
   ```

4. Create an isolated Python virtual environment:
   ```powershell
   python -m venv venv
   ```

5. Activate the virtual environment:
   - On Windows PowerShell:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
     *(If PowerShell blocks scripts, run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`)*
   - On Windows CMD:
     ```cmd
     venv\Scripts\activate.bat
     ```
   - On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

---

## STEP 2: INSTALL BACKEND PYTHON DEPENDENCIES

1. Navigate to the backend folder:
   ```powershell
   cd backend
   ```

2. Upgrade `pip` and install all required libraries:
   ```powershell
   python -m pip install --upgrade pip
   pip install -r requirements.txt
   ```

3. Download the open-source YOLO weights model:
   ```powershell
   python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"
   ```
   *(This downloads `yolov8n.pt` ~6MB directly into your backend folder)*

---

## STEP 3: CONFIGURE SUPABASE (DATABASE & STORAGE)

1. Open [https://supabase.com/](https://supabase.com/) in your browser.
2. Sign up or log in, then click **"New Project"**.
3. Choose a project name (e.g. `trafficwatch-db`), set a strong database password, and select your region (e.g. `ap-south-1` Mumbai or nearest).
4. Click **Create new project** and wait ~1 minute for provisioning.

### Create Database Schema:
1. In the left navigation of your Supabase dashboard, click the **SQL Editor** icon (marked with `>_`).
2. Click **"+ New Query"**.
3. Open the file `supabase/schema.sql` from this project, copy its entire contents, paste it into the Supabase SQL editor, and click **RUN**.
4. Next, copy the contents of `supabase/policies.sql`, paste into a new query, and click **RUN** to enable Row Level Security.
5. Next, copy the contents of `supabase/seed.sql`, paste into a new query, and click **RUN** to populate the demo vehicles, officers, and initial violation cases.

### Create Evidence Storage Bucket:
1. In Supabase left sidebar, click **Storage**.
2. Click **"New Bucket"**.
3. Name the bucket: `evidence`
4. Set bucket to **Public** (or configure authenticated policy).
5. Click **Save**.

### Retrieve Your API Keys:
1. Go to **Project Settings** (gear icon) > **API**.
2. Copy your **Project URL** (e.g. `https://xyzcompany.supabase.co`).
3. Copy your **`anon` `public` key**.
4. Copy your **`service_role` `secret` key**.

---

## STEP 4: CONFIGURE BACKEND ENVIRONMENT VARIABLES

1. Inside the `backend` folder, duplicate `.env.example` and rename it to `.env`:
   ```powershell
   copy .env.example .env
   ```

2. Open `backend/.env` in VS Code and fill in your Supabase credentials:
   ```env
   HOST=0.0.0.0
   PORT=8000
   SUPABASE_URL="https://your-project-id.supabase.co"
   SUPABASE_KEY="your-anon-public-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   JWT_SECRET="traffic_police_secure_lan_jwt_secret_9981"
   ```

---

## STEP 5: FIND YOUR PC'S LAN IP ADDRESS & CONFIGURE FIREWALL

Because the Android application runs on a physical smartphone or emulator on your local Wi-Fi, it **CANNOT connect to `http://localhost:8000`** (since `localhost` inside Android means the phone itself!).

### Find Your PC IP Address:
1. Open PowerShell and run:
   ```powershell
   ipconfig
   ```
2. Look for **Wireless LAN adapter Wi-Fi** or **Ethernet adapter**.
3. Note your **IPv4 Address**, for example: `192.168.1.100`.

### Open Windows Firewall for Port 8000:
1. Open PowerShell **as Administrator** and paste:
   ```powershell
   netsh advfirewall firewall add rule name="TrafficWatch FastAPI Server" dir=in action=allow protocol=TCP localport=8000
   ```
   *(This ensures your Android phone can reach the backend without Windows silently blocking incoming connections)*

---

## STEP 6: START THE FASTAPI BACKEND SERVER

1. Make sure your virtual environment is active in PowerShell.
2. In the `backend` folder, run:
   ```powershell
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
3. You should see:
   ```
   INFO: Started server process
   INFO: Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
   ```
4. Verify by opening your browser to: `http://localhost:8000/docs`. You will see the interactive Swagger API documentation.

---

## STEP 7: INSTALL NODE.JS & START THE WEB DASHBOARD

1. Download and install **Node.js (LTS version 20 or 22)** from [https://nodejs.org/](https://nodejs.org/).
2. Open a new terminal in the project root:
   ```powershell
   npm install
   ```
3. Start the Vite React development server:
   ```powershell
   npm run dev
   ```
4. Open your browser to `http://localhost:3000` (or `http://localhost:5173`).
5. You will see the **TrafficWatch Unified Login Screen**.

---

## STEP 8: SETUP & RUN THE ANDROID APPLICATION IN ANDROID STUDIO

1. Launch **Android Studio**.
2. Click **Open** and select the folder:
   `traffic-management-system/android/TrafficOfficer`
3. Wait for Android Studio to sync Gradle dependencies (this takes 2-3 minutes the first time).
4. Open the file:
   `app/src/main/java/com/trafficofficer/app/data/api/TrafficApiService.kt`
5. Update the IP address:
   - If using the **Android Emulator** on your PC:
     Keep: `http://10.0.2.2:8000/`
   - If using a **Physical Android Phone connected over Wi-Fi**:
     Change to your PC's IP, e.g.: `http://192.168.1.100:8000/`
   *(Note: You can also change this IP directly on the app's login screen using the LAN Settings toggle!)*
6. Connect your phone via USB with **USB Debugging** enabled in Developer Options, or launch an Android Virtual Device (AVD).
7. Click the green **Run (▶)** button in Android Studio.
8. The **"Traffic Officer"** application will build and launch on your phone.

---

## STEP 9: END-TO-END DEMO TEST SCENARIO (EXAM / VIVA WALKTHROUGH)

Follow this exact sequence to demonstrate the entire project to your examiner or evaluation committee:

### Phase A: Officer Workflow (Android Phone or Web Patrol Portal)
1. Launch the **Traffic Officer** application on Android (or navigate to Officer Portal in Web).
2. Enter the field officer credentials:
   - **Email:** `officer.sharma@trafficpolice.gov.in`
   - **Password:** `OfficerPassword@123`
3. Click **"OFFICER LOGIN"**.
4. The system validates credentials and automatically directs you to the **Traffic Officer Dashboard** displaying:
   - Officer Name: Sub-Inspector Vikram Sharma
   - Badge Number: SI-4421
   - Actions: `[CAPTURE LIVE VIDEO]` and `[UPLOAD VIDEO]`
   - Recent shift cases.
5. Tap **`[UPLOAD VIDEO]`** (or Capture Live Video) and select a video showing a motorcycle.
6. The app uploads the video to the FastAPI server:
   - Server runs YOLOv8 object detection on sampled 4 FPS frames.
   - Algorithm tracks person centroids relative to the motorcycle seat plane.
   - Evaluates whether head area contains an approved helmet shell.
   - Evaluates rider count for Section 128 triple-riding infractions.
   - Runs optical license plate character recognition (e.g. `TS09EA4412`).
7. The **CASE REVIEW SCREEN** opens:
   - Vehicle Number: `TS09EA4412` (editable if OCR misread due to mud or angle).
   - AI Detections:
     - `☑ Helmet Violation (Confidence: 94%)`
     - `☑ Triple Riding (Confidence: 91%)`
   - Reviewer can uncheck any box if the officer determines the AI had a false detection!
   - Under **Officer Observations (Manual Human Finding)**, the officer can check:
     - `☑ Minor Rider` (Underage driving)
     - `☑ No Valid Driving Licence`
     - `☑ Drunk Driving` (Enter breathalyzer reading: `68mg/100ml`)
   - GPS location and timestamp are recorded automatically.
8. Click **`[SUBMIT CASE TO CENTRAL SYSTEM]`**.
9. The violation case is stored in the database.

### Phase B: Administrative Command Review (Web Portal)
1. On your PC, open `http://localhost:3000` (or `http://localhost:5173`).
2. Log in using the central login form (remember: NO role dropdown!):
   - **Email:** `admin@trafficpolice.gov.in`
   - **Password:** `AdminPassword@123`
3. Click **"AUTHENTICATE & ENTER PORTAL"**.
4. The system recognizes the `admin` role and automatically redirects to `/admin/dashboard`.
5. The **Admin Dashboard** displays:
   - Live KPI counters: Total Cases, Today's Cases, Helmet Violations, Triple Riding, Drunk Driving cases, Fines Paid.
   - The newly submitted case appears at the top of the **Enforcement Cases Register**!
6. Click **"INSPECT"** on the case:
   - Case Details Modal opens showing the high-resolution evidence photo with detection bounding boxes overlay.
   - Review AI confidence scores (`YOLOv8-TrafficCustom-v1.2`).
   - Review the officer's manual observations (Minor rider, Drunk driving test results).
   - Switch to **GIS Radar Map** to view the exact intersection pin.
7. Click **`[e-Challan Notice]`**:
   - The official legal e-Challan document is generated with Indian Motor Vehicles Act sections (`Sec. 194D`, `Sec. 128`, `Sec. 185`), compound fine amount, and printable receipt.

---

## TROUBLESHOOTING & FAQ

### Q1: The Android app says "Cannot connect to server at 192.168.X.X:8000"
- Verify your PC and Android phone are connected to the **SAME Wi-Fi network**.
- Verify your PC's IP using `ipconfig` (IPs can change when reconnecting to Wi-Fi).
- Check Windows Firewall: Run the firewall command from **Step 5**.
- Make sure `uvicorn` is running with `--host 0.0.0.0` (not `127.0.0.1`).

### Q2: Android app throws cleartext network traffic error
- In Android, cleartext HTTP is enabled via `network_security_config.xml` in this project. Ensure you do not remove `android:usesCleartextTraffic="true"` from `AndroidManifest.xml`.

### Q3: How do I test without physical phone or camera?
- Use the built-in **AI Video Lab** tab in the web application or click the quick demo videos provided in the testbench. It simulates all 4 project cases (Normal Motorcycle, Helmet Violation, Triple Riding, Compound Infraction).
