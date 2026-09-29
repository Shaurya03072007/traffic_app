import React from 'react';
import { RegisteredVehicle } from '../types';
import { Car, ShieldCheck, AlertCircle, Phone, Calendar } from 'lucide-react';

interface VehiclesDirectoryProps {
  vehicles: RegisteredVehicle[];
}

export const VehiclesDirectory: React.FC<VehiclesDirectoryProps> = ({ vehicles }) => {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Car className="w-5 h-5 text-sky-400" />
          Vehicle Registration & Vahan Registry Lookup
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Connected state motor vehicle registry for automated license plate cross-referencing.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Vehicle Number</th>
                <th className="py-3 px-4">Vehicle Type</th>
                <th className="py-3 px-4">Registered Owner</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">Insurance Validity</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {vehicles.map(v => (
                <tr key={v.vehicleNumber} className="hover:bg-slate-800/40 transition-all">
                  <td className="py-3 px-4 font-mono font-extrabold text-amber-400 text-sm tracking-wide">
                    {v.vehicleNumber}
                  </td>
                  <td className="py-3 px-4 text-slate-300">{v.vehicleType}</td>
                  <td className="py-3 px-4 font-semibold text-white">{v.ownerName}</td>
                  <td className="py-3 px-4 font-mono text-slate-400">{v.ownerPhone}</td>
                  <td className="py-3 px-4 font-mono text-slate-400">{v.insuranceValidUntil}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                      v.registrationStatus === 'Active'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-red-500/20 text-red-300 border-red-500/30'
                    }`}>
                      {v.registrationStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
