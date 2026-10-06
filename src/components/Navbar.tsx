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
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Police Insignia */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab(user.role === 'admin' ? 'dashboard' : 'officer_workflow')}>
            <div className="w-10 h-10 rounded-lg bg-blue-600/10 border border-blue-600/30 flex items-center justify-center text-blue-700 shadow-inner">
              <Shield className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-wide text-slate-900 font-mono">TRAFFIC<span className="text-blue-700">WATCH</span></span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-blue-700 font-mono border border-blue-600/20">
                  {user.role === 'admin' ? 'HQ COMMAND' : 'FIELD PATROL'}
                </span>
              </div>
              <p className="text-xs text-slate-600 hidden sm:block">AI Traffic Violation & Enforcement System</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {user.role === 'admin' ? (
              <>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-3 py-2 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'dashboard' ? 'bg-blue-600/20 text-blue-700 border border-blue-600/40' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('map')}
                  className={`px-3 py-2 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'map' ? 'bg-blue-600/20 text-blue-700 border border-blue-600/40' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  GIS Radar Map
                </button>
                <button
                  onClick={() => setActiveTab('officers')}
                  className={`px-3 py-2 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'officers' ? 'bg-blue-600/20 text-blue-700 border border-blue-600/40' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Officers
                </button>
                <button
                  onClick={() => setActiveTab('vehicles')}
                  className={`px-3 py-2 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'vehicles' ? 'bg-blue-600/20 text-blue-700 border border-blue-600/40' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Vehicles
                </button>
              </>
            ) : (
              <button
                onClick={() => setActiveTab('officer_workflow')}
                className={`px-3 py-2 rounded-md text-xs font-medium transition-all ${
                  activeTab === 'officer_workflow' ? 'bg-blue-600/20 text-blue-700 border border-blue-600/40' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Officer Patrol Portal
              </button>
            )}

            {/* Common Tools */}
            <button
              onClick={() => setActiveTab('demo_lab')}
              className={`px-3 py-2 rounded-md text-xs font-medium flex items-center space-x-1.5 transition-all ${
                activeTab === 'demo_lab' ? 'bg-blue-600/20 text-blue-700 border border-blue-600/40' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Video className="w-3.5 h-3.5 text-blue-700" />
              <span>AI Video Lab</span>
            </button>

            <button
              onClick={() => setActiveTab('architecture')}
              className={`px-3 py-2 rounded-md text-xs font-medium flex items-center space-x-1.5 transition-all ${
                activeTab === 'architecture' ? 'bg-blue-600/20 text-blue-700 border border-blue-600/40' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span>Backend & Android</span>
            </button>
          </nav>

          {/* User Profile & Logout */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-800">{user.fullName}</span>
              <span className="text-[11px] text-blue-700/90 font-mono">
                {user.badgeNumber ? `Badge: ${user.badgeNumber}` : user.department || 'Enforcement'}
              </span>
            </div>

            <button
              onClick={onLogout}
              title="Logout"
              className="p-2 rounded-lg bg-slate-100 hover:bg-red-500/20 text-slate-600 hover:text-red-400 border border-slate-300 hover:border-red-500/30 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation tab strip */}
      <div className="md:hidden flex overflow-x-auto px-4 py-2 bg-slate-50 border-t border-slate-200 space-x-2 text-xs">
        {user.role === 'admin' ? (
          <>
            <button onClick={() => setActiveTab('dashboard')} className={`px-2.5 py-1.5 rounded whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-blue-600 text-white font-bold' : 'text-slate-700'}`}>Dashboard</button>
            <button onClick={() => setActiveTab('map')} className={`px-2.5 py-1.5 rounded whitespace-nowrap ${activeTab === 'map' ? 'bg-blue-600 text-white font-bold' : 'text-slate-700'}`}>Radar Map</button>
            <button onClick={() => setActiveTab('officers')} className={`px-2.5 py-1.5 rounded whitespace-nowrap ${activeTab === 'officers' ? 'bg-blue-600 text-white font-bold' : 'text-slate-700'}`}>Officers</button>
            <button onClick={() => setActiveTab('vehicles')} className={`px-2.5 py-1.5 rounded whitespace-nowrap ${activeTab === 'vehicles' ? 'bg-blue-600 text-white font-bold' : 'text-slate-700'}`}>Vehicles</button>
          </>
        ) : (
          <button onClick={() => setActiveTab('officer_workflow')} className={`px-2.5 py-1.5 rounded whitespace-nowrap ${activeTab === 'officer_workflow' ? 'bg-blue-600 text-white font-bold' : 'text-slate-700'}`}>Officer Portal</button>
        )}
        <button onClick={() => setActiveTab('demo_lab')} className={`px-2.5 py-1.5 rounded whitespace-nowrap ${activeTab === 'demo_lab' ? 'bg-blue-600 text-white font-bold' : 'text-slate-700'}`}>AI Video Lab</button>
        <button onClick={() => setActiveTab('architecture')} className={`px-2.5 py-1.5 rounded whitespace-nowrap ${activeTab === 'architecture' ? 'bg-blue-600 text-white font-bold' : 'text-slate-700'}`}>Architecture</button>
      </div>
    </header>
  );
};
