/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserProfile, ViolationRecord } from './types';
import { INITIAL_VIOLATIONS, REGISTERED_VEHICLES, POLICE_OFFICERS } from './services/api';
import { Navbar } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { OfficerDashboard } from './pages/OfficerDashboard';
import { LeafletMap } from './components/LeafletMap';
import { OfficersDirectory } from './components/OfficersDirectory';
import { VehiclesDirectory } from './components/VehiclesDirectory';
import { DemoVideoLab } from './components/DemoVideoLab';
import { ArchitectureViewer } from './components/ArchitectureViewer';
import { CaseDetailsModal } from './components/CaseDetailsModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [violations, setViolations] = useState<ViolationRecord[]>(INITIAL_VIOLATIONS);
  const [vehicles, setVehicles] = useState(REGISTERED_VEHICLES);
  const [selectedCase, setSelectedCase] = useState<ViolationRecord | null>(null);

  // AUTOMATIC ROLE ROUTING (Prompt Section 2 & 14):
  // "After login:
  //  IF role == 'admin': automatically redirect to /admin/dashboard
  //  IF role == 'officer': automatically redirect to the appropriate officer interface
  //  The UI must never ask the user to choose their role."
  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      setActiveTab('dashboard');
    } else {
      setActiveTab('officer_workflow');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
    setSelectedCase(null);
  };

  const handleAddViolation = (newViolation: ViolationRecord) => {
    setViolations(prev => [newViolation, ...prev]);
  };

  const handleAddVehicle = async (newVehicle: any) => {
    // Optional: Call the backend API we created earlier
    try {
      const res = await fetch('/api/admin/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.id}` // mockup token
        },
        body: JSON.stringify(newVehicle)
      });
      if (res.ok) {
        setVehicles(prev => [...prev, newVehicle]);
      } else {
        setVehicles(prev => [...prev, newVehicle]); // Fallback for demo
      }
    } catch (e) {
       setVehicles(prev => [...prev, newVehicle]); // Fallback for demo
    }
  };

  const handleUpdateStatus = (caseId: string, newStatus: ViolationRecord['status']) => {
    setViolations(prev =>
      prev.map(v => (v.id === caseId ? { ...v, status: newStatus } : v))
    );
    if (selectedCase && selectedCase.id === caseId) {
      setSelectedCase(prev => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  // If user is not authenticated, render the single login screen
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Official Government Navigation Header */}
      <Navbar
        user={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Admin Dashboard */}
        {activeTab === 'dashboard' && (
          <AdminDashboard
            user={currentUser}
            violations={violations}
            registeredVehicles={vehicles}
            officersList={POLICE_OFFICERS}
            onSelectCase={(v) => setSelectedCase(v)}
            onUpdateStatus={handleUpdateStatus}
          />
        )}

        {/* GIS Radar Map View */}
        {activeTab === 'map' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 p-6 rounded-2xl">
              <h1 className="text-xl font-bold text-slate-900">Geographic Traffic Radar & Enforcement Hotspots</h1>
              <p className="text-xs text-slate-600 mt-1">
                Visualizing violation coordinates across intersections and patrol corridors.
              </p>
            </div>
            <div className="h-[620px]">
              <LeafletMap violations={violations} onSelectCase={(v) => setSelectedCase(v)} />
            </div>
          </div>
        )}

        {/* Officers Directory */}
        {activeTab === 'officers' && (
          <OfficersDirectory officers={POLICE_OFFICERS} />
        )}

        {/* Vehicles Directory */}
        {activeTab === 'vehicles' && (
          <VehiclesDirectory 
            vehicles={vehicles} 
            user={currentUser} 
            onAddVehicle={handleAddVehicle} 
          />
        )}

        {/* Officer Patrol Workflow (Matching Android Application) */}
        {activeTab === 'officer_workflow' && (
          <OfficerDashboard
            user={currentUser}
            violations={violations}
            onAddViolation={handleAddViolation}
            onSelectCase={(v) => setSelectedCase(v)}
          />
        )}

        {/* AI Video Laboratory / College Project Demo Mode */}
        {activeTab === 'demo_lab' && (
          <DemoVideoLab />
        )}

        {/* Full-Stack Architecture, Code Viewer & LAN Setup */}
        {activeTab === 'architecture' && (
          <ArchitectureViewer />
        )}
      </main>

      {/* Case Details / Evidence Inspector Modal */}
      {selectedCase && (
        <CaseDetailsModal
          violation={selectedCase}
          onClose={() => setSelectedCase(null)}
          onUpdateStatus={handleUpdateStatus}
        />
      )}
    </div>
  );
}
