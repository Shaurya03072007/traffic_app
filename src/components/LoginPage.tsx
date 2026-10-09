import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Shield, Lock, Mail, ArrowRight, AlertCircle, Sparkles, Car, Smartphone, CheckCircle2, UserCheck, KeyRound } from 'lucide-react';
import { loginBackend, citizenLoginBackend, REGISTERED_VEHICLES } from '../services/api';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [loginMode, setLoginMode] = useState<'citizen' | 'police'>('citizen');

  // Citizen login state (Vehicle Number Plate = ID, Phone Number = Password)
  const [plateNumber, setPlateNumber] = useState('TN998281');
  const [phoneNumber, setPhoneNumber] = useState('9999922222');

  // Police login state
  const [email, setEmail] = useState('admin@trafficpolice.gov.in');
  const [password, setPassword] = useState('AdminPassword@123');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Authenticate citizen (Plate + Phone)
  const handleCitizenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const cleanPlate = plateNumber.replace(/[\s-]/g, '').toUpperCase();
    const cleanPhone = phoneNumber.replace(/\D/g, '');

    if (!cleanPlate) {
      setIsLoading(false);
      setErrorMessage('Please enter your vehicle registration number plate.');
      return;
    }
    if (cleanPhone.length < 10) {
      setIsLoading(false);
      setErrorMessage('Please enter your complete 10-digit registered mobile number.');
      return;
    }

    // 1. Try backend citizen login
    try {
      const res = await citizenLoginBackend(cleanPlate, cleanPhone);
      if (res) {
        setIsLoading(false);
        onLoginSuccess({
          ...res.user,
          token: res.token,
          vehicle: res.vehicle
        });
        return;
      }
    } catch (e) {
      console.warn("Backend citizen login failed, attempting local fallback:", e);
    }

    // 2. Fallback to local vehicle database
    setTimeout(() => {
      const matchedVehicle = REGISTERED_VEHICLES.find(
        v => v.vehicleNumber.replace(/[\s-]/g, '').toUpperCase() === cleanPlate
      );

      if (matchedVehicle) {
        const expectedDigits = matchedVehicle.ownerPhone.replace(/\D/g, '').slice(-10);
        const inputDigits = cleanPhone.slice(-10);

        if (inputDigits === expectedDigits) {
          const citizenProfile: UserProfile = {
            id: `citizen_${cleanPlate}`,
            email: `${cleanPlate.toLowerCase()}@citizen.trafficpolice.gov.in`,
            fullName: matchedVehicle.ownerName,
            role: 'citizen',
            phone: matchedVehicle.ownerPhone,
            vehicleNumber: cleanPlate,
            vehicle: matchedVehicle
          };
          setIsLoading(false);
          onLoginSuccess(citizenProfile);
          return;
        } else {
          setIsLoading(false);
          setErrorMessage(`The entered mobile number does not match records registered for vehicle ${cleanPlate}.`);
          return;
        }
      }

      // Check if TN998281 fallback
      if (cleanPlate === 'TN998281' && cleanPhone.slice(-10) === '9999922222') {
        const citizenProfile: UserProfile = {
          id: `citizen_TN998281`,
          email: `tn998281@citizen.trafficpolice.gov.in`,
          fullName: 'Abdul Test',
          role: 'citizen',
          phone: '+91 99999 22222',
          vehicleNumber: 'TN998281',
          vehicle: {
            vehicleNumber: 'TN998281',
            vehicleType: 'Motorcycle',
            ownerName: 'Abdul Test',
            ownerPhone: '+91 99999 22222',
            registrationStatus: 'Active',
            insuranceValidUntil: '2026-10-31'
          }
        };
        setIsLoading(false);
        onLoginSuccess(citizenProfile);
        return;
      }

      setIsLoading(false);
      setErrorMessage(`Vehicle registration number '${cleanPlate}' was not found in the regional motor vehicle database.`);
    }, 400);
  };

  // Authenticate police (Email + Password)
  const handlePoliceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    // 1. Try real backend authentication
    try {
      const res = await loginBackend(cleanEmail, password);
      if (res) {
        setIsLoading(false);
        onLoginSuccess({
          ...res.user,
          token: res.token
        });
        return;
      }
    } catch {
      // Fallback to local accounts
    }

    // 2. Fallback to local accounts
    setTimeout(() => {
      if (cleanEmail === 'admin@trafficpolice.gov.in' && password === 'AdminPassword@123') {
        const adminProfile: UserProfile = {
          id: 'a0000000-0000-0000-0000-000000000001',
          email: 'admin@trafficpolice.gov.in',
          fullName: 'ACP R. K. Deshmukh',
          role: 'admin',
          badgeNumber: 'ACP-7701',
          department: 'HQ Traffic Enforcement & Intelligence Command',
          phone: '+91 98490 11223'
        };
        setIsLoading(false);
        onLoginSuccess(adminProfile);
      } else if (cleanEmail === 'officer.sharma@trafficpolice.gov.in' && password === 'OfficerPassword@123') {
        const officerProfile: UserProfile = {
          id: 'b0000000-0000-0000-0000-000000000002',
          email: 'officer.sharma@trafficpolice.gov.in',
          fullName: 'Sub-Inspector Vikram Sharma',
          role: 'officer',
          badgeNumber: 'SI-4421',
          department: 'Cyberabad Traffic Patrol Division',
          phone: '+91 94401 55432'
        };
        setIsLoading(false);
        onLoginSuccess(officerProfile);
      } else if (cleanEmail === 'officer.verma@trafficpolice.gov.in' && password === 'OfficerPassword@123') {
        const officerProfile: UserProfile = {
          id: 'c0000000-0000-0000-0000-000000000003',
          email: 'officer.verma@trafficpolice.gov.in',
          fullName: 'Head Constable Priya Verma',
          role: 'officer',
          badgeNumber: 'HC-8819',
          department: 'Madhapur Zone Enforcement Outpost',
          phone: '+91 99882 33441'
        };
        setIsLoading(false);
        onLoginSuccess(officerProfile);
      } else {
        setIsLoading(false);
        setErrorMessage('Invalid police credentials. Please check your official email and password.');
      }
    }, 400);
  };

  const setCitizenQuick = (plate: string, phone: string) => {
    setPlateNumber(plate);
    setPhoneNumber(phone);
    setErrorMessage(null);
  };

  const setPoliceQuick = (policeEmail: string, policePass: string) => {
    setEmail(policeEmail);
    setPassword(policePass);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Background ambient lighting subtle glow */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Badge */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6 relative z-10">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-700/20 to-slate-800 border border-blue-600/40 flex items-center justify-center text-blue-700 shadow-xl shadow-blue-500/5 mb-3">
          <Shield className="w-8 h-8 text-blue-700" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-wide uppercase font-mono">
          Traffic<span className="text-blue-700">Watch</span>
        </h1>
        <p className="mt-1 text-sm text-slate-600 font-medium">
          Unified Enforcement & Citizen e-Challan Portal
        </p>
        <p className="text-xs text-slate-500">
          Integrated Motor Vehicle Violations & Digital Payment Network
        </p>
      </div>

      {/* CARD CONTAINER */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 sm:p-8 relative z-10">
        
        {/* TAB TOGGLE: Citizen Portal vs Police Login */}
        <div className="grid grid-cols-2 p-1.5 mb-6 bg-slate-100 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setLoginMode('citizen');
              setErrorMessage(null);
            }}
            className={`py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
              loginMode === 'citizen'
                ? 'bg-blue-700 text-white shadow-md shadow-blue-700/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>Citizen / Vehicle</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMode('police');
              setErrorMessage(null);
            }}
            className={`py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
              loginMode === 'police'
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Police Authority</span>
          </button>
        </div>

        {/* ================= MODE 1: CITIZEN / VEHICLE OWNER ================= */}
        {loginMode === 'citizen' && (
          <form onSubmit={handleCitizenSubmit} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200/70 p-3 rounded-xl mb-1 text-xs text-blue-900">
              <div className="font-semibold flex items-center gap-1.5 mb-0.5 text-blue-800">
                <Car className="w-3.5 h-3.5 text-blue-700" />
                <span>Vehicle Owner Verification:</span>
              </div>
              <p className="text-[11px] text-blue-700/90 leading-relaxed">
                Log in using your <strong>Vehicle Number Plate</strong> as your ID and your <strong>Registered Mobile Number</strong> as your security password.
              </p>
            </div>

            {/* Vehicle Number Plate Input (ID) */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Vehicle Number Plate (User ID)
                </label>
                <span className="text-[10px] text-blue-700 font-bold bg-blue-100/70 px-2 py-0.5 rounded">
                  REGISTRATION NO.
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-mono font-bold text-xs">
                  <div className="w-5 h-5 rounded-sm bg-blue-800 text-white text-[9px] flex items-center justify-center font-bold tracking-tighter">
                    IND
                  </div>
                </div>
                <input
                  type="text"
                  required
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. TN998281 or TS09EA4412"
                  className="w-full pl-12 pr-4 py-2.5 rounded-lg bg-slate-100/90 border border-slate-300 text-slate-900 font-mono font-bold tracking-wider placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all uppercase"
                />
              </div>
            </div>

            {/* Registered Mobile Number Input (Password) */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Registered Mobile Number (Password)
                </label>
                <span className="text-[10px] text-slate-500">10 Digits</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Smartphone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 9999922222"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-100/90 border border-slate-300 text-slate-900 font-mono placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Car className="w-4 h-4" />
                  <span>VIEW MY CHALLANS & VEHICLE</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>

            {/* Quick-Fill Demo Vehicle Owners */}
            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="flex items-center justify-between text-slate-600 mb-2">
                <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-700 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-700" />
                  Test Vehicle Owner Credentials:
                </span>
              </div>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setCitizenQuick('TN998281', '9999922222')}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white hover:bg-blue-50/80 text-blue-900 border border-blue-200 text-left transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-[12px] font-mono text-blue-700">TN998281</div>
                    <div className="text-[10px] text-slate-600">Abdul Test • ₹2,000 Pending Fine</div>
                  </div>
                  <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded group-hover:bg-blue-200">
                    99999 22222
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCitizenQuick('TS09EA4412', '9876543210')}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-left transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-[12px] font-mono text-slate-800">TS09EA4412</div>
                    <div className="text-[10px] text-slate-600">Rajesh Kumar Reddy • Active Two-Wheeler</div>
                  </div>
                  <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded group-hover:bg-slate-200">
                    98765 43210
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCitizenQuick('TS07JH8821', '9123456780')}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-left transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-[12px] font-mono text-slate-800">TS07JH8821</div>
                    <div className="text-[10px] text-slate-600">Sunita Sundaram • Triple Riding Case</div>
                  </div>
                  <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded group-hover:bg-slate-200">
                    91234 56780
                  </span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ================= MODE 2: POLICE ENFORCEMENT ================= */}
        {loginMode === 'police' && (
          <form onSubmit={handlePoliceSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Official Police Email / Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@trafficpolice.gov.in"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-100/80 border border-slate-300 text-slate-900 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-slate-700 focus:border-slate-700 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Police Department Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-100/80 border border-slate-300 text-slate-900 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-slate-700 focus:border-slate-700 transition-all font-mono"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white font-bold text-sm shadow-lg shadow-slate-900/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>AUTHENTICATE POLICE ACCESS</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>

            {/* Quick-Fill Police Accounts */}
            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="flex items-center justify-between text-slate-600 mb-2">
                <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-700 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-slate-700" />
                  Police Demo Accounts:
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPoliceQuick('admin@trafficpolice.gov.in', 'AdminPassword@123')}
                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-blue-700 border border-slate-300 text-left transition-all"
                >
                  <div className="font-bold text-[11px]">Admin (HQ)</div>
                  <div className="text-[10px] text-slate-600 truncate">ACP Deshmukh</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPoliceQuick('officer.sharma@trafficpolice.gov.in', 'OfficerPassword@123')}
                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-sky-700 border border-slate-300 text-left transition-all"
                >
                  <div className="font-bold text-[11px]">Field Officer</div>
                  <div className="text-[10px] text-slate-600 truncate">SI Vikram Sharma</div>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Security Notice */}
        <div className="mt-5 pt-4 border-t border-slate-200/80 text-center">
          <p className="text-[11px] text-slate-500 flex items-center justify-center space-x-1">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>State Police Motor Vehicle Security • TLS 256-bit Encrypted</span>
          </p>
        </div>
      </div>
    </div>
  );
};
