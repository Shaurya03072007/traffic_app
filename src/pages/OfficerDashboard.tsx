import React, { useState, useRef } from 'react';
import { UserProfile, ViolationRecord } from '../types';
import { Video, Upload, Check, AlertTriangle, Shield, ArrowLeft, Camera, RefreshCw, Car, FileText, CheckSquare, Square, Info } from 'lucide-react';

interface OfficerDashboardProps {
  user: UserProfile;
  violations: ViolationRecord[];
  onAddViolation: (violation: ViolationRecord) => void;
  onSelectCase: (violation: ViolationRecord) => void;
}

type OfficerStep = 'dashboard' | 'capture_live' | 'upload_file' | 'analyzing' | 'review_case';

export const OfficerDashboard: React.FC<OfficerDashboardProps> = ({ user, violations, onAddViolation, onSelectCase }) => {
  const [currentStep, setCurrentStep] = useState<OfficerStep>('dashboard');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // Review screen state pre-populated from AI pipeline
  const [vehicleNumber, setVehicleNumber] = useState('TS09EA4412');
  const [plateConfidence, setPlateConfidence] = useState(0.88);
  const [helmetConfirmed, setHelmetConfirmed] = useState(true);
  const [tripleRidingConfirmed, setTripleRidingConfirmed] = useState(true);
  const [minorRiding, setMinorRiding] = useState(false);
  const [noLicense, setNoLicense] = useState(false);
  const [drunkDriving, setDrunkDriving] = useState(false);
  const [drunkDrivingNotes, setDrunkDrivingNotes] = useState('');
  const [officerRemarks, setOfficerRemarks] = useState('');

  const timerRef = useRef<any>(null);

  // Filter cases booked by this officer
  const officerCases = violations.filter(v => 
    v.officerId === user.id || v.badgeNumber === user.badgeNumber || user.role === 'admin'
  );

  const startRecording = () => {
    setIsRecording(true);
    setRecordingSeconds(0);
    timerRef.current = setInterval(() => {
      setRecordingSeconds(prev => prev + 1);
    }, 1000);
  };

  const stopRecordingAndAnalyze = () => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setCurrentStep('analyzing');
    setAnalysisProgress(0);

    const interval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setCurrentStep('review_case');
          return 100;
        }
        return prev + 20;
      });
    }, 300);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCurrentStep('analyzing');
      setAnalysisProgress(0);

      const interval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setCurrentStep('review_case');
            return 100;
          }
          return prev + 25;
        });
      }, 250);
    }
  };

  const handleSubmitFinalCase = () => {
    const caseId = `TRF-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    
    // Calculate fine amount under MVA
    let fine = 0;
    if (helmetConfirmed) fine += 1000;
    if (tripleRidingConfirmed) fine += 1000;
    if (minorRiding) fine += 25000;
    if (noLicense) fine += 5000;
    if (drunkDriving) fine += 10000;
    fine = Math.max(500, fine);

    const now = new Date();
    const timestampStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

    const newRecord: ViolationRecord = {
      id: `case-${Date.now()}`,
      caseNumber: caseId,
      officerId: user.id,
      officerName: user.fullName,
      badgeNumber: user.badgeNumber || 'SI-4421',
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      location: 'Cyber Towers Junction, Hitech City, Hyderabad',
      latitude: 17.4504,
      longitude: 78.3808,
      timestamp: timestampStr,
      helmetViolation: helmetConfirmed,
      tripleRiding: tripleRidingConfirmed,
      aiConfidence: 0.94,
      minorRiding,
      noLicense,
      drunkDriving,
      drunkDrivingNotes: drunkDriving ? drunkDrivingNotes : undefined,
      status: 'Pending Review',
      fineAmount: fine,
      challanDueDate: '2026-10-30',
      evidenceVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      evidenceImageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&q=80',
      officerRemarks: officerRemarks || 'Violations recorded via field patrol camera and verified by officer.',
      modelName: 'YOLOv8-TrafficCustom-v1.2',
      createdAt: new Date().toISOString()
    };

    onAddViolation(newRecord);
    setCurrentStep('dashboard');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ---------------- STEP 1: OFFICER DASHBOARD ---------------- */}
      {currentStep === 'dashboard' && (
        <>
          {/* Main Officer ID Card (Matching Android Header) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
                  FIELD PATROL WORKFLOW
                </span>
                <h1 className="text-2xl font-black text-white mt-1">Traffic Officer</h1>
                <div className="flex items-center space-x-2 mt-1 text-sm text-slate-300">
                  <span className="font-semibold text-slate-100">{user.fullName}</span>
                  <span className="text-slate-500">•</span>
                  <span className="font-mono text-amber-400">Badge: {user.badgeNumber || 'SI-4421'}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{user.department || 'Cyberabad Traffic Police'}</p>
              </div>

              {/* Action Buttons (Strictly specified in prompt section 4) */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentStep('capture_live')}
                  className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-red-600/20 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>CAPTURE LIVE VIDEO</span>
                </button>

                <button
                  onClick={() => setCurrentStep('upload_file')}
                  className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>UPLOAD VIDEO</span>
                </button>
              </div>
            </div>
          </div>

          {/* Recent Cases Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Recent Cases Booked by Shift
              </h2>
              <span className="text-xs font-mono text-slate-400">Total: {officerCases.length}</span>
            </div>

            <div className="divide-y divide-slate-800/80">
              {officerCases.map(item => (
                <div
                  key={item.id}
                  onClick={() => onSelectCase(item)}
                  className="py-3 flex items-center justify-between hover:bg-slate-800/40 px-3 rounded-lg cursor-pointer transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-xs text-amber-400">{item.caseNumber}</span>
                      <span className="font-mono font-bold text-sm text-white">{item.vehicleNumber}</span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <span>{item.location}</span>
                      <span>•</span>
                      <span className="font-mono text-[11px] text-slate-500">{item.timestamp}</span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {item.helmetViolation && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">Helmet</span>
                      )}
                      {item.tripleRiding && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-medium">Triple Riding</span>
                      )}
                      {item.drunkDriving && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-medium">Drunk Driving</span>
                      )}
                      {item.minorRiding && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 font-medium">Minor Rider</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      {item.status}
                    </span>
                    <div className="text-xs font-mono font-bold text-amber-400 mt-1">₹ {item.fineAmount}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ---------------- STEP 2: VIDEO CAPTURE (LIVE CAMERA) ---------------- */}
      {currentStep === 'capture_live' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <button
              onClick={() => setCurrentStep('dashboard')}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
            <span className="text-xs font-bold text-red-400 font-mono uppercase">Live Patrol Camera Mode</span>
          </div>

          <div className="relative aspect-video rounded-xl bg-black overflow-hidden border border-slate-800 flex items-center justify-center">
            {/* Simulated Live Camera Feed */}
            <img
              src="https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=900&q=80"
              alt="Live Camera View"
              className="w-full h-full object-cover opacity-85"
            />
            <div className="scanline-overlay absolute inset-0" />

            {/* Camera Reticle & Target HUD */}
            <div className="absolute inset-8 border border-white/20 rounded-lg pointer-events-none flex flex-col justify-between p-4">
              <div className="flex justify-between items-center text-[10px] font-mono text-amber-400">
                <span>FPS: 25.0 • ISO: AUTO</span>
                <span>GPS: 17.4504° N, 78.3808° E</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                <span>OFFICER: {user.badgeNumber || 'SI-4421'}</span>
                <span>ZONE: CYBER TOWERS</span>
              </div>
            </div>

            {/* Recording Timer */}
            {isRecording && (
              <div className="absolute top-4 left-4 bg-red-600/90 text-white px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-2 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-white" />
                <span>REC 00:{String(recordingSeconds).padStart(2, '0')}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-4">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="px-6 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-xl shadow-red-600/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <div className="w-3 h-3 rounded-full bg-white" />
                <span>START RECORDING EVIDENCE</span>
              </button>
            ) : (
              <button
                onClick={stopRecordingAndAnalyze}
                className="px-6 py-3 rounded-full bg-slate-100 hover:bg-white text-slate-950 font-bold text-sm shadow-xl flex items-center gap-2 transition-all cursor-pointer"
              >
                <div className="w-3 h-3 rounded-sm bg-red-600" />
                <span>STOP & RUN AI INFERENCE</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ---------------- STEP 3: VIDEO UPLOAD (FROM DISK) ---------------- */}
      {currentStep === 'upload_file' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <button
              onClick={() => setCurrentStep('dashboard')}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
            <span className="text-xs font-bold text-amber-400 font-mono uppercase">Upload Patrol Video</span>
          </div>

          <div className="border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-2xl p-12 text-center transition-all bg-slate-950/50">
            <Upload className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <h3 className="text-base font-bold text-white mb-1">Select Recorded Video File</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
              Upload patrol bodycam, dashcam, or phone recorded footage (MP4, AVI, MOV, WebM).
            </p>
            <label className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 cursor-pointer inline-flex items-center gap-2">
              <span>CHOOSE VIDEO FILE</span>
              <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      )}

      {/* ---------------- STEP 4: AI PROCESSING ANIMATION ---------------- */}
      {currentStep === 'analyzing' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-lg font-bold text-white">Running AI Computer Vision Pipeline</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            1. Extracting frames at 4 FPS sampling • 2. YOLO motorcycle/person detection • 3. Head crop helmet analysis • 4. Centroid rider capacity tracking • 5. License plate localization
          </p>
          <div className="w-64 bg-slate-800 h-2 rounded-full mx-auto overflow-hidden mt-4">
            <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${analysisProgress}%` }} />
          </div>
          <span className="text-xs font-mono text-amber-400 block">{analysisProgress}% Complete</span>
        </div>
      )}

      {/* ---------------- STEP 5: CASE REVIEW SCREEN (PROMPT SECTION 10 SPEC) ---------------- */}
      {currentStep === 'review_case' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider">Case Review & Final Verification</h2>
              <p className="text-xs text-slate-400">Review AI detections and specify manual officer observations before creating legal record.</p>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
              TRF-2026-NEW
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Vehicle Plate & Evidence */}
            <div className="space-y-4">
              {/* Vehicle Number Editable Field */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Vehicle Number:
                  </label>
                  <span className="text-[11px] font-mono text-amber-400">
                    OCR Conf: {(plateConfidence * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-amber-400 font-mono font-bold text-lg focus:outline-none focus:border-amber-500"
                  placeholder="TS09EA4412"
                />
                <p className="text-[11px] text-slate-500">
                  Officer can edit vehicle number if dirt or extreme angle distorted OCR text.
                </p>
              </div>

              {/* Evidence Snapshot */}
              <div className="relative aspect-video rounded-xl bg-black overflow-hidden border border-slate-800">
                <img
                  src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&q=80"
                  alt="Evidence"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-black/80 px-2 py-1 rounded text-[10px] font-mono text-slate-300">
                  EVIDENCE SNAPSHOT #045
                </div>
              </div>
            </div>

            {/* Right Column: AI Detections & Manual Observations */}
            <div className="space-y-4">
              {/* AI DETECTIONS (PROMPT SECTION 10) */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-200 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                  <span>AI Detections (Decision-Support)</span>
                  <span className="text-[10px] text-slate-500 lowercase">Click to override</span>
                </div>

                {/* Helmet: DETECTED Confidence 94% */}
                <div
                  onClick={() => setHelmetConfirmed(!helmetConfirmed)}
                  className="p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/40 cursor-pointer flex items-center justify-between transition-all"
                >
                  <div>
                    <div className="font-semibold text-xs text-white">Helmet Violation:</div>
                    <div className="text-xs text-amber-400 font-mono font-bold">DETECTED</div>
                    <div className="text-[11px] text-slate-400">Confidence: 94%</div>
                  </div>
                  <div className={`w-5 h-5 rounded flex items-center justify-center ${helmetConfirmed ? 'bg-amber-500 text-slate-950' : 'border border-slate-600'}`}>
                    {helmetConfirmed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>

                {/* Triple Riding: DETECTED Confidence 91% */}
                <div
                  onClick={() => setTripleRidingConfirmed(!tripleRidingConfirmed)}
                  className="p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-orange-500/40 cursor-pointer flex items-center justify-between transition-all"
                >
                  <div>
                    <div className="font-semibold text-xs text-white">Triple Riding:</div>
                    <div className="text-xs text-orange-400 font-mono font-bold">DETECTED</div>
                    <div className="text-[11px] text-slate-400">Confidence: 91%</div>
                  </div>
                  <div className={`w-5 h-5 rounded flex items-center justify-center ${tripleRidingConfirmed ? 'bg-orange-500 text-slate-950' : 'border border-slate-600'}`}>
                    {tripleRidingConfirmed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              </div>

              {/* MANUAL OFFICER OBSERVATIONS (PROMPT SECTION 9 & 10) */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-200 border-b border-slate-800 pb-1.5">
                  Officer Observations (Manual Human Finding)
                </div>

                {/* [ ] Minor Rider */}
                <div
                  onClick={() => setMinorRiding(!minorRiding)}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer text-xs"
                >
                  <span className="text-slate-300">Minor Rider / Underage Driver</span>
                  <div className={`w-4 h-4 rounded flex items-center justify-center ${minorRiding ? 'bg-pink-500 text-white' : 'border border-slate-600'}`}>
                    {minorRiding && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                {/* [ ] No Valid Licence */}
                <div
                  onClick={() => setNoLicense(!noLicense)}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer text-xs"
                >
                  <span className="text-slate-300">No Valid Driving Licence</span>
                  <div className={`w-4 h-4 rounded flex items-center justify-center ${noLicense ? 'bg-blue-500 text-white' : 'border border-slate-600'}`}>
                    {noLicense && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                {/* [ ] Suspected Drunk Driving */}
                <div
                  onClick={() => setDrunkDriving(!drunkDriving)}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer text-xs"
                >
                  <span className="text-slate-300">Suspected / Tested Drunk Driving</span>
                  <div className={`w-4 h-4 rounded flex items-center justify-center ${drunkDriving ? 'bg-purple-500 text-white' : 'border border-slate-600'}`}>
                    {drunkDriving && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                {drunkDriving && (
                  <input
                    type="text"
                    value={drunkDrivingNotes}
                    onChange={(e) => setDrunkDrivingNotes(e.target.value)}
                    placeholder="Breathalyzer BAC reading (e.g. 65mg/100ml)"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-purple-500/50 text-xs text-purple-300 placeholder-slate-500 focus:outline-none"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Automatic Metadata Strip */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block">Location:</span>
              <span className="text-slate-300 font-medium">17.4504° N, 78.3808° E (Cyber Towers)</span>
            </div>
            <div>
              <span className="text-slate-500 block">Timestamp:</span>
              <span className="text-slate-300 font-mono">Automatic (Current Local Time)</span>
            </div>
            <div>
              <span className="text-slate-500 block">Enforcing Officer:</span>
              <span className="text-slate-300 font-semibold">{user.fullName} ({user.badgeNumber})</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setCurrentStep('dashboard')}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel & Discard
            </button>

            <button
              onClick={handleSubmitFinalCase}
              className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 flex items-center gap-2 cursor-pointer transition-all"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>SUBMIT CASE TO CENTRAL SYSTEM</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
