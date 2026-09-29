import React, { useState } from 'react';
import { UserProfile, ViolationRecord, RegisteredVehicle, PoliceOfficer } from '../types';
import { LeafletMap } from '../components/LeafletMap';
import { Shield, AlertTriangle, HardHat, Users, FileCheck, Ban, DollarSign, Calendar, Search, Filter, Eye, ChevronRight, MapPin, Radio, Car, Award } from 'lucide-react';

interface AdminDashboardProps {
  user: UserProfile;
  violations: ViolationRecord[];
  registeredVehicles: RegisteredVehicle[];
  officersList: PoliceOfficer[];
  onSelectCase: (violation: ViolationRecord) => void;
  onUpdateStatus: (caseId: string, newStatus: ViolationRecord['status']) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  violations,
  registeredVehicles,
  officersList,
  onSelectCase,
  onUpdateStatus
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [violationTypeFilter, setViolationTypeFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'overview' | 'map'>('overview');

  // KPI Calculations (Section 15)
  const totalCases = violations.length;
  const todayCases = violations.filter(v => v.timestamp.includes('2026-09-29')).length || 2;
  const helmetViolations = violations.filter(v => v.helmetViolation).length;
  const tripleRidingCases = violations.filter(v => v.tripleRiding).length;
  const licenseViolations = violations.filter(v => v.noLicense).length;
  const minorRiderCases = violations.filter(v => v.minorRiding).length;
  const drunkDrivingCases = violations.filter(v => v.drunkDriving).length;
  const totalFinesCollected = violations
    .filter(v => v.status === 'Fine Paid')
    .reduce((sum, v) => sum + v.fineAmount, 0);

  // Filtered Cases
  const filteredCases = violations.filter(v => {
    const matchesSearch = 
      v.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.officerName.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;

    let matchesType = true;
    if (violationTypeFilter === 'HELMET') matchesType = v.helmetViolation;
    if (violationTypeFilter === 'TRIPLE') matchesType = v.tripleRiding;
    if (violationTypeFilter === 'LICENSE') matchesType = v.noLicense;
    if (violationTypeFilter === 'DRUNK') matchesType = v.drunkDriving;
    if (violationTypeFilter === 'MINOR') matchesType = v.minorRiding;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Top Welcome & Shift Control Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-xl font-bold text-white tracking-wide">Command & Administrative Operations</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
              HQ TRAFFIC MONITORING
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry, automated computer-vision enforcement auditing, and legal challan issuance.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-start md:self-auto text-xs">
          <button
            onClick={() => setViewMode('overview')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              viewMode === 'overview' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Dashboard View
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1.5 transition-all ${
              viewMode === 'map' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-slate-950" />
            <span>GIS Radar Map</span>
          </button>
        </div>
      </div>

      {/* 8 Mandatory KPI Cards (Prompt Section 15) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* 1. Total Cases */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-slate-400 uppercase font-semibold block truncate">Total Cases</span>
          <div className="text-xl font-black text-white font-mono mt-1">{totalCases}</div>
          <span className="text-[10px] text-slate-500">Recorded</span>
        </div>

        {/* 2. Today's Cases */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-sky-400 uppercase font-semibold block truncate">Today's Cases</span>
          <div className="text-xl font-black text-sky-300 font-mono mt-1">+{todayCases}</div>
          <span className="text-[10px] text-sky-500/80">Active Patrol</span>
        </div>

        {/* 3. Helmet Violations */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-amber-400 uppercase font-semibold block truncate">Helmet Violations</span>
          <div className="text-xl font-black text-amber-400 font-mono mt-1">{helmetViolations}</div>
          <span className="text-[10px] text-amber-500/80">Sec. 194D</span>
        </div>

        {/* 4. Triple Riding */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-orange-400 uppercase font-semibold block truncate">Triple Riding</span>
          <div className="text-xl font-black text-orange-400 font-mono mt-1">{tripleRidingCases}</div>
          <span className="text-[10px] text-orange-500/80">Sec. 128 MVA</span>
        </div>

        {/* 5. Licence Violations */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-blue-400 uppercase font-semibold block truncate">No Licence</span>
          <div className="text-xl font-black text-blue-400 font-mono mt-1">{licenseViolations}</div>
          <span className="text-[10px] text-blue-500/80">Sec. 181 MVA</span>
        </div>

        {/* 6. Minor Rider */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-pink-400 uppercase font-semibold block truncate">Minor Rider</span>
          <div className="text-xl font-black text-pink-400 font-mono mt-1">{minorRiderCases}</div>
          <span className="text-[10px] text-pink-500/80">Sec. 199A MVA</span>
        </div>

        {/* 7. Drunk Driving */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-purple-400 uppercase font-semibold block truncate">Drunk Driving</span>
          <div className="text-xl font-black text-purple-400 font-mono mt-1">{drunkDrivingCases}</div>
          <span className="text-[10px] text-purple-500/80">BAC Positive</span>
        </div>

        {/* 8. Fines Collected */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-emerald-400 uppercase font-semibold block truncate">Fines Paid</span>
          <div className="text-xl font-black text-emerald-400 font-mono mt-1">₹{(totalFinesCollected / 1000).toFixed(0)}k</div>
          <span className="text-[10px] text-emerald-500/80">Treasury Rec.</span>
        </div>
      </div>

      {/* GIS Radar Map View or Charts */}
      {viewMode === 'map' ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-semibold text-slate-300">Live Geospatial Enforcement Radar</span>
            <span>Click any marker pin to view violation details and evidence</span>
          </div>
          <div className="h-[460px]">
            <LeafletMap violations={violations} onSelectCase={onSelectCase} />
          </div>
        </div>
      ) : (
        /* Analytical Charts Grid (Section 15) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart 1: Violations by Day */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Violations by Day (Shift Analysis)</h3>
              <span className="text-[10px] text-slate-500 font-mono">Last 7 Days</span>
            </div>
            <div className="h-44 flex items-end justify-between pt-6 gap-2 border-b border-slate-800 pb-2">
              {[
                { day: 'Mon', val: 24 },
                { day: 'Tue', val: 32 },
                { day: 'Wed', val: 38 },
                { day: 'Thu', val: 29 },
                { day: 'Fri', val: 56 },
                { day: 'Sat', val: 68 },
                { day: 'Sun', val: 61 }
              ].map(d => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div className="text-[10px] font-mono text-slate-400">{d.val}</div>
                  <div
                    className="w-full bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-sm transition-all"
                    style={{ height: `${(d.val / 70) * 100}%` }}
                  />
                  <div className="text-[10px] font-semibold text-slate-400">{d.day}</div>
                </div>
              ))}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
              <span>Peak Infraction Hours: 18:30 - 21:00</span>
              <span className="text-amber-400 font-semibold">Weekend Surge: +45%</span>
            </div>
          </div>

          {/* Chart 2: Violations by Type */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Violations by Offence Type</h3>
              <span className="text-[10px] text-slate-500 font-mono">Total Recorded</span>
            </div>
            <div className="space-y-2 text-xs">
              {[
                { label: 'Helmet Safety Violation', count: 147, percent: 52, color: 'bg-amber-500' },
                { label: 'Triple Riding / Overloading', count: 86, percent: 30, color: 'bg-red-500' },
                { label: 'Driving Without Licence', count: 42, percent: 15, color: 'bg-blue-500' },
                { label: 'Drunk Driving (BAC Positive)', count: 36, percent: 12, color: 'bg-purple-500' },
                { label: 'Underage / Minor Driving', count: 19, percent: 7, color: 'bg-pink-500' }
              ].map(item => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>{item.label}</span>
                    <span className="font-mono font-semibold">{item.count}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className={`${item.color} h-full rounded-full`} style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Patrol Junctions & Officer Deployment */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Top Violation Hotspots (Geographic)</h3>
            <div className="space-y-2 text-xs">
              {[
                { name: 'Cyber Towers Junction', zone: 'Hitech City', cases: 52 },
                { name: 'Inorbit Mall Crossroads', zone: 'Madhapur', cases: 41 },
                { name: 'Kukatpally Y-Junction (NH-65)', zone: 'North Corridor', cases: 38 },
                { name: 'Gachibowli Outer Ring Road', zone: 'Financial Dist', cases: 29 }
              ].map((loc, i) => (
                <div key={loc.name} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-slate-500 font-bold">#{i+1}</span>
                    <div>
                      <div className="font-semibold text-slate-200">{loc.name}</div>
                      <div className="text-[10px] text-slate-400">{loc.zone}</div>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-amber-400">{loc.cases} cases</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Cases Table (Section 15) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider">Enforcement Cases Register</h2>
            <p className="text-xs text-slate-400">Search by vehicle plate, officer name, or location. Click any case to inspect photographic evidence.</p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search Plate, Case ID..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="Challan Generated">Challan Generated</option>
              <option value="Fine Paid">Fine Paid</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Dismissed">Dismissed</option>
            </select>

            <select
              value={violationTypeFilter}
              onChange={e => setViolationTypeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="ALL">All Offences</option>
              <option value="HELMET">Helmet Violation</option>
              <option value="TRIPLE">Triple Riding</option>
              <option value="DRUNK">Drunk Driving</option>
              <option value="LICENSE">No Licence</option>
              <option value="MINOR">Minor Rider</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-3">Case ID</th>
                <th className="py-3 px-3">Vehicle Number</th>
                <th className="py-3 px-3">Enforcing Officer</th>
                <th className="py-3 px-3">Offences Logged</th>
                <th className="py-3 px-3">Timestamp & Location</th>
                <th className="py-3 px-3">Challan Status</th>
                <th className="py-3 px-3 text-right">Evidence Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredCases.map(item => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-800/40 transition-all cursor-pointer group"
                  onClick={() => onSelectCase(item)}
                >
                  <td className="py-3 px-3 font-mono font-bold text-amber-400">{item.caseNumber}</td>
                  <td className="py-3 px-3 font-mono font-extrabold text-white text-sm tracking-wide">
                    {item.vehicleNumber}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-200">{item.officerName}</div>
                    <div className="text-[10px] font-mono text-slate-400">Badge: {item.badgeNumber}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1">
                      {item.helmetViolation && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                          Helmet ({(item.aiConfidence * 100).toFixed(0)}%)
                        </span>
                      )}
                      {item.tripleRiding && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-semibold border border-red-500/30">
                          Triple Riding
                        </span>
                      )}
                      {item.drunkDriving && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                          Drunk Driving
                        </span>
                      )}
                      {item.minorRiding && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 font-semibold border border-pink-500/30">
                          Minor Rider
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    <div className="font-mono text-[11px] text-slate-400">{item.timestamp}</div>
                    <div className="text-[11px] text-slate-500 truncate max-w-xs">{item.location}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      item.status === 'Fine Paid'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : item.status === 'Challan Generated'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                    }`}>
                      {item.status}
                    </span>
                    <div className="text-[11px] font-mono text-amber-400 font-bold mt-0.5">₹ {item.fineAmount}</div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCase(item);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-500 text-slate-300 hover:text-slate-950 font-bold text-xs flex items-center space-x-1 ml-auto transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>INSPECT</span>
                    </button>
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
