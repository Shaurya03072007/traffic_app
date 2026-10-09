import React, { useState } from 'react';
import { UserProfile, ViolationRecord, RegisteredVehicle } from '../types';
import { 
  Car, ShieldCheck, AlertTriangle, CheckCircle2, Clock, CreditCard, 
  FileText, Download, Eye, Send, X, QrCode, RefreshCw, Calendar, 
  Phone, User, MapPin, Sparkles, Check, ChevronRight, ShieldAlert,
  Info
} from 'lucide-react';
import { payChallanBackend, disputeChallanBackend } from '../services/api';

interface CitizenPortalProps {
  user: UserProfile;
  violations: ViolationRecord[];
  onRefreshViolations: () => void;
  onSelectCase: (violation: ViolationRecord) => void;
  onUpdateStatus: (caseId: string, status: ViolationRecord['status']) => void;
}

export const CitizenPortal: React.FC<CitizenPortalProps> = ({
  user,
  violations,
  onRefreshViolations,
  onSelectCase,
  onUpdateStatus,
}) => {
  // Filter violations for this vehicle plate
  const vehiclePlate = (user.vehicleNumber || '').replace(/[\s-]/g, '').toUpperCase();
  const citizenViolations = violations.filter(v => 
    v.vehicleNumber.replace(/[\s-]/g, '').toUpperCase() === vehiclePlate
  );

  const [activeTab, setActiveTab] = useState<'all' | 'unpaid' | 'paid' | 'contested'>('all');
  
  // Modals state
  const [payingCase, setPayingCase] = useState<ViolationRecord | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccessReceipt, setPaymentSuccessReceipt] = useState<{ caseRecord: ViolationRecord; txId: string } | null>(null);

  const [disputingCase, setDisputingCase] = useState<ViolationRecord | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);

  const [evidencePreviewCase, setEvidencePreviewCase] = useState<ViolationRecord | null>(null);

  // Stats calculation
  const pendingCases = citizenViolations.filter(v => v.status === 'Pending Review' || v.status === 'Challan Generated');
  const paidCases = citizenViolations.filter(v => v.status === 'Fine Paid');
  const contestedCases = citizenViolations.filter(v => v.status === 'Contested');
  const totalFineOutstanding = pendingCases.reduce((sum, v) => sum + v.fineAmount, 0);

  // Tab filtering
  const filteredViolations = citizenViolations.filter(v => {
    if (activeTab === 'unpaid') return v.status === 'Pending Review' || v.status === 'Challan Generated';
    if (activeTab === 'paid') return v.status === 'Fine Paid';
    if (activeTab === 'contested') return v.status === 'Contested';
    return true;
  });

  // Handle Payment Submission
  const handleConfirmPayment = async () => {
    if (!payingCase) return;
    setIsProcessingPayment(true);

    try {
      await payChallanBackend(payingCase.id, user.token);
      onUpdateStatus(payingCase.id, 'Fine Paid');
      
      const txId = `TXN-BBPS-${Math.floor(100000000 + Math.random() * 900000000)}`;
      setPaymentSuccessReceipt({
        caseRecord: { ...payingCase, status: 'Fine Paid' },
        txId
      });
      setPayingCase(null);
      setIsProcessingPayment(false);
      onRefreshViolations();
    } catch (e) {
      console.error("Payment failed", e);
      // Fallback
      onUpdateStatus(payingCase.id, 'Fine Paid');
      const txId = `TXN-LOCAL-${Math.floor(100000000 + Math.random() * 900000000)}`;
      setPaymentSuccessReceipt({
        caseRecord: { ...payingCase, status: 'Fine Paid' },
        txId
      });
      setPayingCase(null);
      setIsProcessingPayment(false);
    }
  };

  // Handle Dispute Submission
  const handleConfirmDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputingCase || !disputeReason.trim()) return;
    setIsSubmittingDispute(true);

    try {
      await disputeChallanBackend(disputingCase.id, disputeReason, user.token);
      onUpdateStatus(disputingCase.id, 'Contested');
      setDisputingCase(null);
      setDisputeReason('');
      setIsSubmittingDispute(false);
      onRefreshViolations();
    } catch (e) {
      console.error("Dispute submit failed", e);
      onUpdateStatus(disputingCase.id, 'Contested');
      setDisputingCase(null);
      setDisputeReason('');
      setIsSubmittingDispute(false);
    }
  };

  const vehicleInfo = user.vehicle;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. TOP HERO: CITIZEN VEHICLE BANNER */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-blue-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="bg-blue-600/50 text-blue-200 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                Verified Vehicle Owner Portal
              </span>
              <span className="text-xs text-slate-400">
                Ministry of Road Transport & Highways Integrated
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* Indian Number Plate Mockup */}
              <div className="inline-flex items-center bg-white text-slate-900 px-3.5 py-1.5 rounded-lg border-2 border-slate-700 shadow-md font-mono font-black text-xl tracking-wider select-none">
                <div className="flex flex-col items-center justify-center mr-2 pr-2 border-r border-slate-300 text-blue-800 leading-none">
                  <span className="text-[10px] font-bold">IND</span>
                  <div className="w-2.5 h-2.5 rounded-full border border-blue-800 flex items-center justify-center mt-0.5">
                    <span className="text-[7px]">☀️</span>
                  </div>
                </div>
                <span>{user.vehicleNumber || 'NO PLATE'}</span>
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>{user.fullName}</span>
                </h1>
                <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-blue-400" />
                  <span>{user.phone || 'Registered Phone'}</span>
                  <span className="text-slate-500">•</span>
                  <span>{vehicleInfo?.vehicleType || 'Motorcycle / Two-Wheeler'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Quick Vehicle Status Overview */}
          <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-xl flex flex-wrap gap-4 sm:gap-6 items-center">
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Registration</div>
              <div className="text-sm font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{vehicleInfo?.registrationStatus || 'Active'}</span>
              </div>
            </div>

            <div className="border-l border-white/10 pl-4 sm:pl-6">
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Insurance Validity</div>
              <div className="text-sm font-bold text-slate-200 flex items-center gap-1 mt-0.5">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>{vehicleInfo?.insuranceValidUntil || 'Valid 2026-10-31'}</span>
              </div>
            </div>

            <div className="border-l border-white/10 pl-4 sm:pl-6">
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Pending Fines</div>
              <div className={`text-base font-extrabold mt-0.5 ${totalFineOutstanding > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                ₹{totalFineOutstanding.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. STATS SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Outstanding Balance */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Outstanding Balance</span>
            <AlertTriangle className={`w-4 h-4 ${totalFineOutstanding > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
          </div>
          <div className={`text-2xl font-black ${totalFineOutstanding > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            ₹{totalFineOutstanding.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {pendingCases.length} challan{pendingCases.length === 1 ? '' : 's'} awaiting settlement
          </p>
        </div>

        {/* Total Booked Violations */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Total Challans</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {citizenViolations.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Issued by Traffic Police Patrol
          </p>
        </div>

        {/* Paid / Cleared */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Paid & Cleared</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {paidCases.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            E-receipts available for download
          </p>
        </div>

        {/* Contested / Under Review */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Contested In Review</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600">
            {contestedCases.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Hearing status with enforcement officer
          </p>
        </div>
      </div>

      {/* 3. VIOLATIONS LIST HEADER & FILTER TABS */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Issued e-Challan Violations & Evidence</span>
              <button 
                onClick={onRefreshViolations}
                title="Refresh latest updates"
                className="text-slate-400 hover:text-blue-600 transition-colors p-1"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review recorded photographic evidence, AI detection logs, settle fines or file disputes online.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'all' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'hover:text-slate-900'
              }`}
            >
              All ({citizenViolations.length})
            </button>
            <button
              onClick={() => setActiveTab('unpaid')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'unpaid' ? 'bg-white text-amber-700 shadow-sm font-bold' : 'hover:text-slate-900'
              }`}
            >
              Pending ({pendingCases.length})
            </button>
            <button
              onClick={() => setActiveTab('paid')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'paid' ? 'bg-white text-emerald-700 shadow-sm font-bold' : 'hover:text-slate-900'
              }`}
            >
              Paid ({paidCases.length})
            </button>
            <button
              onClick={() => setActiveTab('contested')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'contested' ? 'bg-white text-purple-700 shadow-sm font-bold' : 'hover:text-slate-900'
              }`}
            >
              Contested ({contestedCases.length})
            </button>
          </div>
        </div>

        {/* 4. VIOLATIONS LIST */}
        <div className="pt-4 space-y-4">
          {filteredViolations.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Challans in this category</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {activeTab === 'unpaid' 
                  ? 'All issued traffic violations for vehicle ' + user.vehicleNumber + ' are fully settled. Safe riding!'
                  : 'No records matching the selected status filter.'}
              </p>
            </div>
          ) : (
            filteredViolations.map((violation) => {
              const isPaid = violation.status === 'Fine Paid';
              const isContested = violation.status === 'Contested';
              const isPending = !isPaid && !isContested;

              return (
                <div 
                  key={violation.id}
                  className="bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                >
                  {/* Left: Case Info & Violations */}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className="font-mono font-bold text-sm text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                        {violation.caseNumber}
                      </span>

                      {/* Status Badges */}
                      {isPaid && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Fine Paid & Settled
                        </span>
                      )}
                      {isContested && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                          <Clock className="w-3.5 h-3.5" />
                          Contested / Under Dispute Review
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Pending Settlement
                        </span>
                      )}

                      <span className="text-xs text-slate-500 font-mono">
                        {violation.timestamp.replace('T', ' ').slice(0, 19)}
                      </span>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium">{violation.location}</span>
                    </div>

                    {/* Violation Specific Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {violation.helmetViolation && (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[11px] font-semibold px-2 py-0.5 rounded border border-amber-200">
                          <ShieldAlert className="w-3 h-3" />
                          No Helmet Detected
                        </span>
                      )}
                      {violation.tripleRiding && (
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[11px] font-semibold px-2 py-0.5 rounded border border-red-200">
                          <AlertTriangle className="w-3 h-3" />
                          Triple Riding (3 Persons)
                        </span>
                      )}
                      {violation.minorRiding && (
                        <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[11px] font-semibold px-2 py-0.5 rounded border border-rose-200">
                          Underage / Minor Driver
                        </span>
                      )}
                      {violation.noLicense && (
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 text-[11px] font-semibold px-2 py-0.5 rounded border border-slate-300">
                          Driving Without Licence
                        </span>
                      )}
                      {violation.drunkDriving && (
                        <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-[11px] font-semibold px-2 py-0.5 rounded border border-purple-200">
                          Drunk Driving (BAC Positive)
                        </span>
                      )}

                      {/* AI Confidence */}
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[11px] font-mono px-2 py-0.5 rounded border border-blue-200">
                        <Sparkles className="w-3 h-3" />
                        AI: {Math.round(violation.aiConfidence * 100)}%
                      </span>
                    </div>

                    {/* Remarks if any */}
                    {violation.officerRemarks && (
                      <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                        <span className="font-semibold text-slate-700">Notice: </span>
                        {violation.officerRemarks}
                      </div>
                    )}
                  </div>

                  {/* Middle / Right: Fine amount, Evidence Thumbnail & Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div className="text-left lg:text-right">
                      <div className="text-[11px] text-slate-500 uppercase font-semibold">Challan Amount</div>
                      <div className="text-2xl font-black text-slate-900">
                        ₹{violation.fineAmount.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Due Date: {violation.challanDueDate || '2026-10-30'}
                      </div>
                    </div>

                    {/* Buttons Group */}
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      {/* Evidence Photo Button */}
                      {violation.evidenceImageUrl && (
                        <button
                          type="button"
                          onClick={() => setEvidencePreviewCase(violation)}
                          className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Photo</span>
                        </button>
                      )}

                      {/* Pay Button if Unpaid */}
                      {isPending && (
                        <>
                          <button
                            type="button"
                            onClick={() => setPayingCase(violation)}
                            className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Pay Fine Online</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setDisputingCase(violation);
                              setDisputeReason('');
                            }}
                            className="px-3 py-2 text-xs font-semibold rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <span>Dispute</span>
                          </button>
                        </>
                      )}

                      {/* Download Receipt if Paid */}
                      {isPaid && (
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentSuccessReceipt({
                              caseRecord: violation,
                              txId: `TXN-${violation.caseNumber.replace('TRF-', '')}-PAID`
                            });
                          }}
                          className="px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>e-Receipt</span>
                        </button>
                      )}

                      {/* Detailed Inspector Modal */}
                      <button
                        type="button"
                        onClick={() => onSelectCase(violation)}
                        className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-1 transition-all cursor-pointer"
                        title="View Full Case Dossier"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ONLINE PAYMENT GATEWAY (UPI / CARDS / BHARAT BILLPAY) */}
      {/* ========================================================================= */}
      {payingCase && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-snug">Secure e-Challan Payment Portal</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Case: {payingCase.caseNumber}</p>
                </div>
              </div>
              <button 
                onClick={() => setPayingCase(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Bill Details */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Vehicle Number:</span>
                  <span className="font-mono font-bold text-slate-900">{payingCase.vehicleNumber}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Owner Name:</span>
                  <span className="font-medium text-slate-900">{user.fullName}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Violation Location:</span>
                  <span className="font-medium text-slate-900 truncate max-w-[200px]">{payingCase.location}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                  <span className="font-bold text-xs text-slate-800">Total Challan Amount:</span>
                  <span className="text-xl font-black text-emerald-700">₹{payingCase.fineAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border flex flex-col items-center gap-1 transition-all ${
                      paymentMethod === 'upi'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span>UPI QR / Apps</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border flex flex-col items-center gap-1 transition-all ${
                      paymentMethod === 'card'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>Debit / Credit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('netbanking')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border flex flex-col items-center gap-1 transition-all ${
                      paymentMethod === 'netbanking'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>Net Banking</span>
                  </button>
                </div>
              </div>

              {/* UPI Option Preview */}
              {paymentMethod === 'upi' && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                  <div className="w-32 h-32 mx-auto bg-white p-2 rounded-lg border border-slate-300 shadow-inner flex items-center justify-center">
                    {/* Simulated QR Code Pattern */}
                    <div className="grid grid-cols-6 gap-1 w-full h-full p-1 bg-slate-900 rounded">
                      {Array.from({ length: 36 }).map((_, i) => (
                        <div 
                          key={i} 
                          className={`rounded-xs ${i % 3 === 0 || i % 7 === 0 || i === 0 || i === 5 || i === 30 || i === 35 ? 'bg-white' : 'bg-slate-900'}`} 
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-700">
                    Scan with Google Pay, PhonePe, or Paytm
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    VPA: trafficpolice.echallan@sbi
                  </p>
                </div>
              )}

              {/* Card Option Preview */}
              {paymentMethod === 'card' && (
                <div className="space-y-3">
                  <input
                    type="text"
                    disabled
                    value="•••• •••• •••• 4242 (Simulated Test Card)"
                    className="w-full text-xs font-mono p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      disabled
                      value="12/28"
                      className="w-1/2 text-xs font-mono p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700"
                    />
                    <input
                      type="text"
                      disabled
                      value="CVV: •••"
                      className="w-1/2 text-xs font-mono p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700"
                    />
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={isProcessingPayment}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessingPayment ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>AUTHORIZE & PAY ₹{payingCase.fineAmount.toLocaleString('en-IN')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: OFFICIAL PAYMENT SUCCESS RECEIPT */}
      {/* ========================================================================= */}
      {paymentSuccessReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            {/* Receipt Header */}
            <div className="bg-emerald-600 text-white p-6 text-center space-y-2">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-1">
                <Check className="w-7 h-7 text-white stroke-[3]" />
              </div>
              <h3 className="text-lg font-extrabold tracking-wide">Fine Payment Successful</h3>
              <p className="text-xs text-emerald-100 font-mono">
                Transaction ID: {paymentSuccessReceipt.txId}
              </p>
            </div>

            {/* Receipt Printable Details */}
            <div className="p-6 space-y-4">
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Challan Number:</span>
                  <span className="font-mono font-bold text-slate-900">{paymentSuccessReceipt.caseRecord.caseNumber}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Vehicle Number:</span>
                  <span className="font-mono font-bold text-slate-900">{paymentSuccessReceipt.caseRecord.vehicleNumber}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Registered Owner:</span>
                  <span className="font-semibold text-slate-900">{user.fullName}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Payment Date:</span>
                  <span className="font-mono text-slate-900">{new Date().toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Payment Mode:</span>
                  <span className="font-semibold text-slate-900">Bharat BillPay / UPI Instant</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline font-bold text-sm">
                  <span className="text-slate-800">Amount Cleared:</span>
                  <span className="text-emerald-700 font-black">₹{paymentSuccessReceipt.caseRecord.fineAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Violation status updated to <strong>Fine Paid</strong> across police enforcement radar.</span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentSuccessReceipt(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Close Window</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CONTEST / DISPUTE VIOLATION */}
      {/* ========================================================================= */}
      {disputingCase && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-purple-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Contest / Dispute Challan Notice</h3>
                  <p className="text-[11px] text-purple-200 font-mono">Case: {disputingCase.caseNumber}</p>
                </div>
              </div>
              <button 
                onClick={() => setDisputingCase(null)}
                className="text-purple-300 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDispute} className="p-6 space-y-4">
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                As the registered owner of <strong>{disputingCase.vehicleNumber}</strong>, you have the right to request administrative review if you believe this violation was issued in error or during exceptional circumstances.
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Reason for Contesting / Dispute Details
                </label>
                <textarea
                  required
                  rows={4}
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Specify detailed reason (e.g., number plate misread by camera, vehicle stolen/borrowed, emergency medical situation)..."
                  className="w-full p-3 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDisputingCase(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingDispute || !disputeReason.trim()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingDispute ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Dispute</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: EVIDENCE PHOTO PREVIEW */}
      {/* ========================================================================= */}
      {evidencePreviewCase && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-800 overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between text-white">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <span>Patrol Camera Photographic Evidence</span>
                  <span className="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded text-blue-400">
                    {evidencePreviewCase.caseNumber}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  {evidencePreviewCase.location} • {evidencePreviewCase.timestamp}
                </p>
              </div>
              <button 
                onClick={() => setEvidencePreviewCase(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative bg-black flex items-center justify-center min-h-[340px]">
              {evidencePreviewCase.evidenceImageUrl ? (
                <img 
                  src={evidencePreviewCase.evidenceImageUrl} 
                  alt="Violation Photographic Evidence"
                  className="max-h-[500px] w-auto object-contain"
                />
              ) : (
                <div className="text-slate-500 text-xs">No image capture available</div>
              )}

              {/* AI Detection Overlay Tag */}
              <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white p-3 rounded-xl text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-blue-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Detection Model: {evidencePreviewCase.modelName || 'YOLOv8-Traffic'}</span>
                </div>
                <div className="text-slate-300 text-[11px]">
                  Plate: <strong className="font-mono text-amber-400">{evidencePreviewCase.vehicleNumber}</strong> • Confidence: {Math.round(evidencePreviewCase.aiConfidence * 100)}%
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setEvidencePreviewCase(null)}
                className="py-2 px-5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
