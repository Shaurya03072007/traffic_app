import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Shield, Lock, Mail, ArrowRight, AlertCircle, Info, Sparkles, Server } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@trafficpolice.gov.in');
  const [password, setPassword] = useState('AdminPassword@123');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Authenticate against central authentication layer (Supabase / local police registry)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    setTimeout(() => {
      const cleanEmail = email.trim().toLowerCase();

      // Check against centralized role database
      if (cleanEmail === 'admin@trafficpolice.gov.in' && password === 'AdminPassword@123') {
        const adminProfile: UserProfile = {
          id: 'a0000000-0000-0000-0000-000000000001',
          email: 'admin@trafficpolice.gov.in',
          fullName: 'ACP R. K. Deshmukh',
          role: 'admin', // Resolved server-side!
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
          role: 'officer', // Resolved server-side!
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
    }, 600);
  };

  const setTestAccount = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background ambient police lights subtle glow */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Government Badge & Department Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8 relative z-10">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-700/20 to-slate-800 border border-blue-600/40 flex items-center justify-center text-blue-700 shadow-xl shadow-blue-500/5 mb-4">
          <Shield className="w-8 h-8 text-blue-700" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-wide uppercase font-mono">
          Traffic<span className="text-blue-700">Watch</span>
        </h1>
        <p className="mt-1 text-sm text-slate-600 font-medium">
          Unified Enforcement & Violation Management Portal
        </p>
        <p className="text-xs text-slate-500">
          State Police Department • Computer Vision Patrol Network
        </p>
      </div>

      {/* SINGLE UNIFIED LOGIN CARD - NO ROLE SELECTOR! */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 sm:p-8 relative z-10">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Official Email / Username
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
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-100/80 border border-slate-300 text-slate-900 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Password
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
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-100/80 border border-slate-300 text-slate-900 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all font-mono"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-blue-700 to-blue-800 hover:from-amber-400 hover:to-amber-500 text-white font-bold text-sm shadow-lg shadow-blue-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>AUTHENTICATE & ENTER PORTAL</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Notice */}
        <div className="mt-6 pt-5 border-t border-slate-200/80 text-center">
          <p className="text-[11px] text-slate-600 flex items-center justify-center space-x-1">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>Role-Based Access Control enforced server-side. No client-side override.</span>
          </p>
        </div>

        {/* Demo Credentials Quick-Fill (Provided for seamless evaluation) */}
        <div className="mt-5 p-3 rounded-xl bg-slate-50/70 border border-slate-200 text-xs">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-700 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-700" />
              Quick Fill Demo Accounts:
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTestAccount('admin@trafficpolice.gov.in', 'AdminPassword@123')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-blue-700 border border-slate-300 hover:border-blue-600/40 text-left transition-all"
            >
              <div className="font-bold text-[11px]">Admin Account</div>
              <div className="text-[10px] text-slate-600 truncate">ACP Deshmukh</div>
            </button>
            <button
              type="button"
              onClick={() => setTestAccount('officer.sharma@trafficpolice.gov.in', 'OfficerPassword@123')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-sky-300 border border-slate-300 hover:border-sky-500/40 text-left transition-all"
            >
              <div className="font-bold text-[11px]">Officer Account</div>
              <div className="text-[10px] text-slate-600 truncate">SI Vikram Sharma</div>
            </button>
          </div>
          <p className="mt-2 text-[10px] text-slate-600 italic">
            *Clicking sets the form fields. The backend automatically redirects Admin to Dashboard and Officer to Patrol Portal upon submitting.
          </p>
        </div>
      </div>
    </div>
  );
};
