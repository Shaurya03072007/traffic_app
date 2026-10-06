import React, { useState } from 'react';
import { ViolationRecord } from '../types';
import { PrintChallanModal } from './PrintChallanModal';
import { X, Shield, AlertTriangle, CheckCircle, Video, Image, FileText, Check, MapPin, Calendar, User, Cpu, DollarSign } from 'lucide-react';

interface CaseDetailsModalProps {
  violation: ViolationRecord;
  onClose: () => void;
  onUpdateStatus: (caseId: string, newStatus: ViolationRecord['status']) => void;
}

export const CaseDetailsModal: React.FC<CaseDetailsModalProps> = ({ violation, onClose, onUpdateStatus }) => {
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [activeMediaTab, setActiveMediaTab] = useState<'image' | 'video'>('image');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Challan Generated': return 'bg-blue-600/20 text-blue-700 border-blue-600/40';
      case 'Fine Paid': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'Pending Review': return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      case 'Dismissed': return 'bg-slate-500/20 text-slate-600 border-slate-500/40';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="bg-white border border-slate-200 text-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-6">
          {/* Header */}
          <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600/10 border border-blue-600/30 flex items-center justify-center text-blue-700">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-bold font-mono text-slate-900 tracking-wide">{violation.caseNumber}</h2>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${getStatusColor(violation.status)}`}>
                    {violation.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600">Vehicle: <span className="font-mono font-bold text-blue-700">{violation.vehicleNumber}</span></p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowPrintModal(true)}
                className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-700 border border-blue-600/40 text-xs font-semibold flex items-center space-x-1.5 transition-all"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>e-Challan Notice</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[75vh] overflow-y-auto">
            {/* Left Column: Visual Evidence Player / Photo */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  Visual Evidence Telemetry
                </h3>
                <div className="flex bg-slate-100 p-0.5 rounded-md text-xs">
                  <button
                    onClick={() => setActiveMediaTab('image')}
                    className={`px-2.5 py-1 rounded flex items-center space-x-1 ${
                      activeMediaTab === 'image' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600'
                    }`}
                  >
                    <Image className="w-3 h-3" />
                    <span>Annotated Snapshot</span>
                  </button>
                  <button
                    onClick={() => setActiveMediaTab('video')}
                    className={`px-2.5 py-1 rounded flex items-center space-x-1 ${
                      activeMediaTab === 'video' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600'
                    }`}
                  >
                    <Video className="w-3 h-3" />
                    <span>Patrol Video</span>
                  </button>
                </div>
              </div>

              {/* Media Viewport */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center">
                {activeMediaTab === 'image' ? (
                  <div className="relative w-full h-full">
                    <img
                      src={violation.evidenceImageUrl || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&q=80'}
                      alt="Evidence Frame"
                      className="w-full h-full object-cover"
                    />
                    {/* Simulated Detection Bounding Box Overlays */}
                    {violation.helmetViolation && (
                      <div className="absolute top-[20%] left-[35%] w-[25%] h-[25%] border-2 border-red-500 rounded bg-red-500/10 pointer-events-none flex items-start justify-start p-1">
                        <span className="bg-red-600 text-slate-900 text-[9px] font-mono font-bold px-1 rounded">
                          NO HELMET ({(violation.aiConfidence * 100).toFixed(0)}%)
                        </span>
                      </div>
                    )}
                    {violation.tripleRiding && (
                      <div className="absolute top-[25%] left-[25%] w-[45%] h-[55%] border-2 border-orange-500 rounded bg-orange-500/10 pointer-events-none flex items-start justify-end p-1">
                        <span className="bg-orange-600 text-slate-900 text-[9px] font-mono font-bold px-1 rounded">
                          TRIPLE RIDING (3 RIDERS)
                        </span>
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-mono text-slate-700">
                      CAM: PATROL-HD • SEC: 01.4s • FPS: 25.0
                    </div>
                  </div>
                ) : (
                  <video
                    src={violation.evidenceVideoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              {/* AI Confidence & Model Details Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-sky-400" />
                    AI Computer Vision Model:
                  </span>
                  <span className="text-xs font-mono font-semibold text-sky-300">
                    {violation.modelName || 'YOLOv8-TrafficCustom-v1.2'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-600">Helmet Detection:</div>
                    <div className="font-bold text-blue-700">
                      {violation.helmetViolation ? `Violation (${(violation.aiConfidence * 100).toFixed(0)}%)` : 'Compliant'}
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="text-[11px] text-slate-600">Rider Capacity:</div>
                    <div className="font-bold text-orange-400">
                      {violation.tripleRiding ? 'Triple Riding Confirmed' : 'Permissible Capacity'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Case Violations, Officer Notes & Actions */}
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1">
                  Enforcement Summary
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" /> Location:
                    </span>
                    <span className="text-slate-800 font-medium text-right max-w-[60%]">{violation.location}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" /> Timestamp:
                    </span>
                    <span className="text-slate-800 font-mono">{violation.timestamp}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" /> Enforcing Officer:
                    </span>
                    <span className="text-slate-800 font-medium">{violation.officerName} ({violation.badgeNumber})</span>
                  </div>
                </div>
              </div>

              {/* Detected & Confirmed Violations List */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1">
                  Offences Recorded
                </h3>
                <div className="space-y-2">
                  {violation.helmetViolation && (
                    <div className="p-2.5 rounded-lg bg-blue-600/10 border border-blue-600/30 text-xs flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-blue-700" />
                        <div>
                          <div className="font-semibold text-blue-700">Riding without Protective Helmet</div>
                          <div className="text-[10px] text-blue-700/80">Sec. 194D MVA • AI Verified</div>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-blue-700">₹ 1,000</span>
                    </div>
                  )}

                  {violation.tripleRiding && (
                    <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <div>
                          <div className="font-semibold text-red-300">Triple Riding / Overloading Two-Wheeler</div>
                          <div className="text-[10px] text-red-400/80">Sec. 128/194C MVA • Spatial Association</div>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-red-400">₹ 1,000</span>
                    </div>
                  )}

                  {violation.minorRiding && (
                    <div className="p-2.5 rounded-lg bg-pink-500/10 border border-pink-500/30 text-xs flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-pink-400" />
                        <div>
                          <div className="font-semibold text-pink-300">Underage / Minor Driving Vehicle</div>
                          <div className="text-[10px] text-pink-400/80">Sec. 199A MVA • Officer Verified</div>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-pink-400">₹ 25,000</span>
                    </div>
                  )}

                  {violation.noLicense && (
                    <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-blue-400" />
                        <div>
                          <div className="font-semibold text-blue-300">Driving Without Valid Licence</div>
                          <div className="text-[10px] text-blue-400/80">Sec. 181 MVA • Database Verified</div>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-blue-400">₹ 5,000</span>
                    </div>
                  )}

                  {violation.drunkDriving && (
                    <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-xs flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-purple-400" />
                        <div>
                          <div className="font-semibold text-purple-300">Driving Under Influence of Alcohol</div>
                          <div className="text-[10px] text-purple-400/80">
                            Sec. 185 MVA • {violation.drunkDrivingNotes || 'Alcometer Tested'}
                          </div>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-purple-400">₹ 10,000</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-semibold uppercase tracking-wider">Total Fine Payable:</span>
                  <span className="text-base font-bold font-mono text-blue-700">₹ {violation.fineAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Officer Remarks */}
              {violation.officerRemarks && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="text-slate-600 font-semibold mb-1">Field Officer Remarks:</div>
                  <div className="text-slate-700 italic">{violation.officerRemarks}</div>
                </div>
              )}

              {/* Administrative Status Updates */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1">
                  Administrative Disposition
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => onUpdateStatus(violation.id, 'Challan Generated')}
                    className={`p-2 rounded-lg text-xs font-semibold border transition-all ${
                      violation.status === 'Challan Generated'
                        ? 'bg-blue-600 text-white border-amber-500'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:border-amber-500/50'
                    }`}
                  >
                    Issue Challan
                  </button>
                  <button
                    onClick={() => onUpdateStatus(violation.id, 'Fine Paid')}
                    className={`p-2 rounded-lg text-xs font-semibold border transition-all ${
                      violation.status === 'Fine Paid'
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:border-emerald-500/50'
                    }`}
                  >
                    Mark Paid
                  </button>
                  <button
                    onClick={() => onUpdateStatus(violation.id, 'Dismissed')}
                    className={`p-2 rounded-lg text-xs font-semibold border transition-all ${
                      violation.status === 'Dismissed'
                        ? 'bg-slate-600 text-slate-900 border-slate-500'
                        : 'bg-slate-100 text-slate-600 border-slate-300 hover:border-slate-500'
                    }`}
                  >
                    Dismiss Case
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPrintModal && (
        <PrintChallanModal
          violation={violation}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </>
  );
};
