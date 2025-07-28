import React, { useEffect, useState } from 'react';
import { Cog6ToothIcon, EnvelopeIcon, KeyIcon, ShieldCheckIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const SuperAdminSettings: React.FC = () => {
  const [email, setEmail] = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch current superadmin profile
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('superadmin_token');
        const res = await fetch('/api/superadmin/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setEmail(data.data.email);
          setMfaEnabled(data.data.mfaEnabled);
        } else {
          setError('Failed to load profile');
        }
      } catch {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Stub handlers for save
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('Settings saved!');
    setTimeout(() => setSuccess(''), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-blue-200">
      <div className="w-full max-w-lg mx-auto rounded-3xl shadow-2xl bg-white/60 backdrop-blur-lg border border-white/30 p-8 sm:p-10 flex flex-col items-center">
        <div className="flex items-center gap-3 mb-6">
          <Cog6ToothIcon className="h-8 w-8 text-indigo-500" />
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">SuperAdmin Settings</h2>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2"><CheckCircleIcon className="h-5 w-5 text-green-500" />{success}</div>}
        <form className="w-full space-y-6" onSubmit={handleSave}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <EnvelopeIcon className="h-5 w-5 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field pl-10 mt-1"
                disabled
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <KeyIcon className="h-5 w-5 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={''}
                placeholder="********"
                className="input-field pl-10 mt-1"
                disabled
              />
            </div>
            <div className="text-xs text-gray-400 mt-1">Password change coming soon</div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <ShieldCheckIcon className="h-5 w-5 text-indigo-400" />
            <span className="text-sm text-gray-700">MFA Enabled:</span>
            <span className={`font-bold ${mfaEnabled ? 'text-green-600' : 'text-red-500'}`}>{mfaEnabled ? 'Yes' : 'No'}</span>
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 flex justify-center items-center gap-2 text-lg mt-4"
            disabled
          >
            Save (Coming Soon)
          </button>
        </form>
      </div>
    </div>
  );
};

export default SuperAdminSettings; 