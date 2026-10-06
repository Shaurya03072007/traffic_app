import React from 'react';
import { ViolationRecord } from '../types';
import { X, Printer, Shield, CheckCircle, QrCode } from 'lucide-react';

interface PrintChallanModalProps {
  violation: ViolationRecord;
  onClose: () => void;
}

export const PrintChallanModal: React.FC<PrintChallanModalProps> = ({ violation, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border border-slate-300 my-8">
        {/* Header bar (Not printed) */}
        <div className="bg-white text-slate-900 px-6 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <Printer className="w-4 h-4 text-blue-700" />
            <span className="font-semibold text-sm">Official Electronic Traffic Violation Notice (e-Challan)</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center space-x-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PRINT CHALLAN</span>
            </button>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Document */}
        <div className="p-8 font-serif leading-relaxed">
          {/* Emblem & Department Title */}
          <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
            <div className="text-xs tracking-widest font-bold uppercase text-slate-600">Government of India / State Traffic Police</div>
            <div className="text-xl font-black uppercase tracking-wide text-white mt-1">E-Challan Notice of Traffic Violation</div>
            <div className="text-xs text-slate-600 italic">Issued under Section 133 of the Motor Vehicles Act, 1988 (as amended)</div>
          </div>

          {/* Challan & Vehicle Summary Table */}
          <div className="grid grid-cols-2 gap-4 text-xs font-sans mb-6 bg-slate-50 p-4 rounded border border-slate-200">
            <div>
              <div className="text-slate-500 font-semibold">Challan / Case ID:</div>
              <div className="font-mono font-bold text-sm text-slate-900">{violation.caseNumber}</div>
            </div>
            <div>
              <div className="text-slate-500 font-semibold">Vehicle Registration:</div>
              <div className="font-mono font-black text-base text-red-700">{violation.vehicleNumber}</div>
            </div>
            <div>
              <div className="text-slate-500 font-semibold">Date & Time of Infraction:</div>
              <div className="text-slate-800 font-medium">{violation.timestamp}</div>
            </div>
            <div>
              <div className="text-slate-500 font-semibold">Enforcement Location:</div>
              <div className="text-slate-800 font-medium">{violation.location}</div>
            </div>
            <div>
              <div className="text-slate-500 font-semibold">Booking Officer:</div>
              <div className="text-slate-800 font-medium">{violation.officerName} (Badge: {violation.badgeNumber})</div>
            </div>
            <div>
              <div className="text-slate-500 font-semibold">Payment Due Date:</div>
              <div className="text-slate-800 font-bold">{violation.challanDueDate || 'Within 30 Days'}</div>
            </div>
          </div>

          {/* Violations Itemization */}
          <div className="mb-6 font-sans text-xs">
            <div className="font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-300 pb-1">
              Table of Detected Offences & Legal Penalties
            </div>
            <table className="w-full text-left border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="border border-slate-300 p-2">#</th>
                  <th className="border border-slate-300 p-2">Offence Description</th>
                  <th className="border border-slate-300 p-2">MVA Section</th>
                  <th className="border border-slate-300 p-2">Verification Source</th>
                  <th className="border border-slate-300 p-2 text-right">Penalty (₹)</th>
                </tr>
              </thead>
              <tbody>
                {violation.helmetViolation && (
                  <tr>
                    <td className="border border-slate-300 p-2">1</td>
                    <td className="border border-slate-300 p-2 font-semibold">Driving / Riding without Protective Headgear</td>
                    <td className="border border-slate-300 p-2 font-mono">Sec. 194D MVA</td>
                    <td className="border border-slate-300 p-2 text-emerald-700 font-medium">AI Camera Detection (94% Conf)</td>
                    <td className="border border-slate-300 p-2 text-right font-mono">₹ 1,000</td>
                  </tr>
                )}
                {violation.tripleRiding && (
                  <tr>
                    <td className="border border-slate-300 p-2">2</td>
                    <td className="border border-slate-300 p-2 font-semibold">Carrying more than one pillion rider (Triple Riding)</td>
                    <td className="border border-slate-300 p-2 font-mono">Sec. 128 / 194C MVA</td>
                    <td className="border border-slate-300 p-2 text-emerald-700 font-medium">AI Multi-Rider Associator (91% Conf)</td>
                    <td className="border border-slate-300 p-2 text-right font-mono">₹ 1,000</td>
                  </tr>
                )}
                {violation.minorRiding && (
                  <tr>
                    <td className="border border-slate-300 p-2">3</td>
                    <td className="border border-slate-300 p-2 font-semibold">Offences by Juveniles / Minor driving vehicle</td>
                    <td className="border border-slate-300 p-2 font-mono">Sec. 199A MVA</td>
                    <td className="border border-slate-300 p-2 text-blue-700 font-medium">Officer Field Inspection</td>
                    <td className="border border-slate-300 p-2 text-right font-mono">₹ 25,000</td>
                  </tr>
                )}
                {violation.noLicense && (
                  <tr>
                    <td className="border border-slate-300 p-2">4</td>
                    <td className="border border-slate-300 p-2 font-semibold">Driving vehicle without valid Driving Licence</td>
                    <td className="border border-slate-300 p-2 font-mono">Sec. 181 MVA</td>
                    <td className="border border-slate-300 p-2 text-blue-700 font-medium">Officer Record Verification</td>
                    <td className="border border-slate-300 p-2 text-right font-mono">₹ 5,000</td>
                  </tr>
                )}
                {violation.drunkDriving && (
                  <tr>
                    <td className="border border-slate-300 p-2">5</td>
                    <td className="border border-slate-300 p-2 font-semibold">Driving under influence of alcohol / intoxicating drugs</td>
                    <td className="border border-slate-300 p-2 font-mono">Sec. 185 MVA</td>
                    <td className="border border-slate-300 p-2 text-purple-700 font-medium">Alcometer Breathalyzer Test</td>
                    <td className="border border-slate-300 p-2 text-right font-mono">₹ 10,000</td>
                  </tr>
                )}
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={4} className="border border-slate-300 p-2 text-right">TOTAL COMPOUND FINE PAYABLE:</td>
                  <td className="border border-slate-300 p-2 text-right font-mono text-sm text-red-700">₹ {violation.fineAmount.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Evidence Frame Preview & QR Code */}
          <div className="grid grid-cols-3 gap-4 mb-6 font-sans text-xs items-center bg-slate-50 p-3 rounded border border-slate-200">
            <div className="col-span-2">
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Photographic Evidence Snapshot</div>
              {violation.evidenceImageUrl ? (
                <img src={violation.evidenceImageUrl} alt="Evidence" className="h-28 w-full object-cover rounded border border-slate-300" />
              ) : (
                <div className="h-28 bg-slate-200 flex items-center justify-center text-slate-500 rounded">Evidence snapshot recorded</div>
              )}
            </div>
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-white text-slate-900 flex items-center justify-center rounded p-1 mb-1">
                <QrCode className="w-16 h-16 text-slate-900" />
              </div>
              <div className="text-[9px] text-slate-600">Scan via Parivahan or UPI to pay fine</div>
            </div>
          </div>

          {/* Legal Footnote */}
          <div className="text-[10px] text-slate-500 border-t border-slate-300 pt-3">
            <p>1. Notice is hereby given to pay the compounded fine within 30 days via the official State Police Portal or Virtual Court system.</p>
            <p>2. Computer Vision visual indicators are verified by an authorized field officer prior to legal notice issuance.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
