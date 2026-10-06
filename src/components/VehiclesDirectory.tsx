import React, { useState } from 'react';
import { RegisteredVehicle, UserProfile } from '../types';
import { Car, ShieldCheck, AlertCircle, Phone, Calendar, Plus, X } from 'lucide-react';

interface VehiclesDirectoryProps {
  vehicles: RegisteredVehicle[];
  user?: UserProfile;
  onAddVehicle?: (vehicle: RegisteredVehicle) => void;
}

export const VehiclesDirectory: React.FC<VehiclesDirectoryProps> = ({ vehicles, user, onAddVehicle }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    vehicleNumber: '',
    vehicleType: 'Motorcycle',
    ownerName: '',
    ownerPhone: '',
    registrationStatus: 'Active',
    insuranceValidUntil: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAddVehicle) {
      onAddVehicle(formData as RegisteredVehicle);
    }
    setShowModal(false);
    setFormData({
      vehicleNumber: '',
      vehicleType: 'Motorcycle',
      ownerName: '',
      ownerPhone: '',
      registrationStatus: 'Active',
      insuranceValidUntil: ''
    });
  };
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 p-6 rounded-2xl flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Car className="w-5 h-5 text-sky-400" />
            Vehicle Registration & Vahan Registry Lookup
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Connected state motor vehicle registry for automated license plate cross-referencing.
          </p>
        </div>
        
        {user?.role === 'admin' && (
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Register Vehicle
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
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
                <tr key={v.vehicleNumber} className="hover:bg-slate-100/40 transition-all">
                  <td className="py-3 px-4 font-mono font-extrabold text-blue-700 text-sm tracking-wide">
                    {v.vehicleNumber}
                  </td>
                  <td className="py-3 px-4 text-slate-700">{v.vehicleType}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{v.ownerName}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{v.ownerPhone}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{v.insuranceValidUntil}</td>
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Register New Vehicle
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Number Plate</label>
                <input required type="text" value={formData.vehicleNumber} onChange={e => setFormData({...formData, vehicleNumber: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. TS09EA4412" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Owner Name</label>
                <input required type="text" value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Owner Name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Owner Phone (For SMS)</label>
                <input required type="text" value={formData.ownerPhone} onChange={e => setFormData({...formData, ownerPhone: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="+91 98765 43210" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Vehicle Type</label>
                  <select value={formData.vehicleType} onChange={e => setFormData({...formData, vehicleType: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option>Motorcycle</option>
                    <option>Scooter</option>
                    <option>Car</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Insurance Until</label>
                  <input required type="date" value={formData.insuranceValidUntil} onChange={e => setFormData({...formData, insuranceValidUntil: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-200 mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-md shadow-blue-500/20">Register</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
