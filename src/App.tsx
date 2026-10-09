/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, ViolationRecord } from './types';
import { INITIAL_VIOLATIONS, REGISTERED_VEHICLES, POLICE_OFFICERS, fetchLiveViolations, updateViolationStatusBackend } from './services/api';
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
import { CitizenPortal } from './pages/CitizenPortal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [violations, setViolations] = useState<ViolationRecord[]>(INITIAL_VIOLATIONS);
  const [vehicles, setVehicles] = useState(REGISTERED_VEHICLES);
  const [selectedCase, setSelectedCase] = useState<ViolationRecord | null>(null);

  // Sync violations from backend server
  const refreshViolations = useCallback(async () => {
    try {
      const live = await fetchLiveViolations(
        currentUser?.token,
        currentUser?.role === 'citizen' ? currentUser?.vehicleNumber : undefined
      );
      if (live && live.length > 0) {
        setViolations(prev => {
          const map = new Map<string, ViolationRecord>();
          // 1. Initial demo cases
          INITIAL_VIOLATIONS.forEach(v => map.set(v.caseNumber, v));
          // 2. Previously in-memory cases
          prev.forEach(v => map.set(v.caseNumber, v));
          // 3. Live backend cases (take precedence)
          live.forEach(v => map.set(v.caseNumber, v));
          return Array.from(map.values()).sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        });
      }
    } catch (e) {
      console.warn("Could not sync live violations from backend:", e);
    }
  }, [currentUser?.token, currentUser?.role, currentUser?.vehicleNumber]);

  // Fetch immediately on mount and periodically every 4 seconds
  useEffect(() => {
    refreshViolations();
    const interval = setInterval(refreshViolations, 4000);
    return () => clearInterval(interval);
  }, [refreshViolations]);

  // AUTOMATIC ROLE ROUTING:
  // IF role == 'admin': automatically redirect to /admin/dashboard
  // IF role == 'citizen': automatically redirect to citizen_portal
  // IF role == 'officer': automatically redirect to officer_workflow
  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      setActiveTab('dashboard');
    } else if (user.role === 'citizen') {
      setActiveTab('citizen_portal');
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
          'Authorization': `Bearer ${currentUser?.token || currentUser?.id}`
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

  const handleUpdateStatus = async (caseId: string, newStatus: ViolationRecord['status']) => {
    setViolations(prev =>
      prev.map(v => (v.id === caseId ? { ...v, status: newStatus } : v))
    );
    if (selectedCase && selectedCase.id === caseId) {
      setSelectedCase(prev => (prev ? { ...prev, status: newStatus } : null));
    }
    // Update on backend server
    await updateViolationStatusBackend(caseId, newStatus, undefined, currentUser?.token);
    refreshViolations();
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
        {/* Citizen Portal */}
        {activeTab === 'citizen_portal' && currentUser.role === 'citizen' && (
          <CitizenPortal
            user={currentUser}
            violations={violations}
            onRefreshViolations={refreshViolations}
            onSelectCase={(v) => setSelectedCase(v)}
            onUpdateStatus={handleUpdateStatus}
          />
        )}

        {/* Admin Dashboard */}
        {activeTab === 'dashboard' && (
          <AdminDashboard
            user={currentUser}
            violations={violations}
            registeredVehicles={vehicles}
            officersList={POLICE_OFFICERS}
            onSelectCase={(v) => setSelectedCase(v)}
            onUpdateStatus={handleUpdateStatus}
            onRefresh={refreshViolations}
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
