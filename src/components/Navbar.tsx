import React from 'react';
import { UserProfile } from '../types';
import { Shield, Radio, Video, Layers, LogOut, UserCheck, HardHat, AlertTriangle, FileText, Cpu, Wifi } from 'lucide-react';

interface NavbarProps {
  user: UserProfile;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, activeTab, setActiveTab, onLogout }) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Police Insignia */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab(user.role === 'admin' ? 'dashboard' : 'officer_workflow')}>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Shield className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-wide text-white font-mono">TRAFFIC<span className="text-amber-400">WATCH</span></span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 font-mono border border-amber-500/20">
                  {user.role === 'admin' ? 'HQ COMMAND' : 'FIELD PATROL'}
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">AI Traffic Violation & Enforcement System</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {user.role === 'admin' ? (
              <>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-3 py-2 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'dashboard' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('map')}
                  className={`px-3 py-2 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'map' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  GIS Radar Map
                </button>
                <button
                  onClick={() => setActiveTab('officers')}
                  className={`px-3 py-2 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'officers' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Officers
                </button>
                <button
                  onClick={() => setActiveTab('vehicles')}
                  className={`px-3 py-2 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'vehicles' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Vehicles
                </button>
              </>
            ) : (
              <button
                onClick={() => setActiveTab('officer_workflow')}
                className={`px-3 py-2 rounded-md text-xs font-medium transition-all ${
                  activeTab === 'officer_workflow' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                Officer Patrol Portal
              </button>
            )}

            {/* Common Tools */}
            <button
              onClick={() => setActiveTab('demo_lab')}
              className={`px-3 py-2 rounded-md text-xs font-medium flex items-center space-x-1.5 transition-all ${
                activeTab === 'demo_lab' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Video className="w-3.5 h-3.5 text-amber-400" />
              <span>AI Video Lab</span>
            </button>

            <button
              onClick={() => setActiveTab('architecture')}
              className={`px-3 py-2 rounded-md text-xs font-medium flex items-center space-x-1.5 transition-all ${
                activeTab === 'architecture' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span>Backend & Android</span>
            </button>
          </nav>

          {/* User Profile & Logout */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-200">{user.fullName}</span>
              <span className="text-[11px] text-amber-400/90 font-mono">
                {user.badgeNumber ? `Badge: ${user.badgeNumber}` : user.department || 'Enforcement'}
              </span>
            </div>

            <button
              onClick={onLogout}
              title="Logout"
              className="p-2 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/30 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation tab strip */}
      <div className="md:hidden flex overflow-x-auto px-4 py-2 bg-slate-950 border-t border-slate-800 space-x-2 text-xs">
        {user.role === 'admin' ? (
          <>
            <button onClick={() => setActiveTab('dashboard')} className={`px-2.5 py-1.5 rounded whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300'}`}>Dashboard</button>
            <button onClick={() => setActiveTab('map')} className={`px-2.5 py-1.5 rounded whitespace-nowrap ${activeTab === 'map' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300'}`}>Radar Map</button>
            <button onClick={() => setActiveTab('officers')} className={`px-2.5 py-1.5 rounded whitespace-nowrap ${activeTab === 'officers' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300'}`}>Officers</button>
            <button onClick={() => setActiveTab('vehicles')} className={`px-2.5 py-1.5 rounded whitespace-nowrap ${activeTab === 'vehicles' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300'}`}>Vehicles</button>
          </>
        ) : (
          <button onClick={() => setActiveTab('officer_workflow')} className={`px-2.5 py-1.5 rounded whitespace-nowrap ${activeTab === 'officer_workflow' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300'}`}>Officer Portal</button>
        )}
        <button onClick={() => setActiveTab('demo_lab')} className={`px-2.5 py-1.5 rounded whitespace-nowrap ${activeTab === 'demo_lab' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300'}`}>AI Video Lab</button>
        <button onClick={() => setActiveTab('architecture')} className={`px-2.5 py-1.5 rounded whitespace-nowrap ${activeTab === 'architecture' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300'}`}>Architecture</button>
      </div>
    </header>
  );
};
