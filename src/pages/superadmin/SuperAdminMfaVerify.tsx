import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import logo from '../../logo.svg';

const SuperAdminMfaVerify: React.FC = () => {
  const [totp, setTotp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const loginSessionToken = localStorage.getItem('superadmin_login_session');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/mfa/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginSessionToken, token: totp })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'MFA failed');
      localStorage.setItem('superadmin_token', data.token);
      localStorage.removeItem('superadmin_login_session');
      navigate('/superadmin/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-blue-200">
      <div className="w-full max-w-md mx-auto rounded-3xl shadow-2xl bg-white/60 backdrop-blur-lg border border-white/30 p-8 sm:p-10 flex flex-col items-center">
        <img src={logo} alt="App Logo" className="h-14 w-14 mb-4 drop-shadow-lg" />
        <h2 className="text-3xl font-extrabold text-gray-900 mb-1 tracking-tight">Multi-Factor Authentication</h2>
        <p className="text-sm text-gray-500 mb-6">Enter the 6-digit code from your authenticator app</p>
        <form className="w-full space-y-6" onSubmit={handleVerify}>
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
              <span>{error}</span>
            </div>
          )}
          <div className="relative">
            <ShieldCheckIcon className="h-5 w-5 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="totp"
              name="totp"
              type="text"
              required
              value={totp}
              onChange={e => setTotp(e.target.value)}
              className="input-field pl-10 mt-1 text-lg tracking-widest text-center"
              maxLength={6}
              placeholder="123456"
              autoFocus
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 flex justify-center items-center gap-2 text-lg"
            >
              {loading ? (
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white border-t-2"></span>
              ) : (
                'Verify & Sign in'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SuperAdminMfaVerify; 