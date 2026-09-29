import React from 'react';
import { PoliceOfficer } from '../types';
import { Shield, Phone, MapPin, Award, CheckCircle, Radio } from 'lucide-react';

interface OfficersDirectoryProps {
  officers: PoliceOfficer[];
}

export const OfficersDirectory: React.FC<OfficersDirectoryProps> = ({ officers }) => {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-400" />
          Field Enforcement Officers Roster
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Authorized personnel active across Traffic Zones and mobile interceptor units.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {officers.map(officer => (
          <div key={officer.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-slate-800 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold font-mono">
                  {officer.badgeNumber.split('-')[0]}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">{officer.name}</h3>
                  <span className="text-xs font-mono text-amber-400">Badge: {officer.badgeNumber}</span>
                </div>
              </div>

              <span className="flex items-center space-x-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Active</span>
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
              <div className="flex items-center space-x-2">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>{officer.station} ({officer.zone})</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>{officer.phone}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Cases Enforced:</span>
              <span className="font-mono font-bold text-amber-400 text-sm">{officer.casesBooked}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
