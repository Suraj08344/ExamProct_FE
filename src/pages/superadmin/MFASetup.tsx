import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';

const MFASetup: React.FC = () => {
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [totp, setTotp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const qrImgRef = useRef<HTMLImageElement>(null);
  let qrError = false;

  useEffect(() => {
    const fetchQr = async () => {
      setError('');
      setSuccess('');
      setLoading(true);
      try {
        const token = localStorage.getItem('superadmin_token');
        const res = await fetch('/api/superadmin/mfa/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to get QR');
        setQr(data.qr);
        setSecret(data.secret);
        setOtpauthUrl(data.otpauth_url || '');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchQr();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const token = localStorage.getItem('superadmin_token');
      const res = await fetch('/api/superadmin/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ token: totp })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to verify');
      setSuccess('MFA enabled!');
      setTimeout(() => navigate('/superadmin/dashboard'), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Set up Multi-Factor Authentication
          </h2>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{success}</div>}
        {qr && !qrError ? (
          <div className="flex flex-col items-center">
            <img ref={qrImgRef} src={qr} alt="Scan QR" className="mb-4" onError={() => {qrError = true;}} />
            <div className="text-xs text-gray-500 mb-2">Or enter this secret in your app:</div>
            <div className="font-mono text-sm bg-gray-100 rounded px-2 py-1 mb-2">{secret}</div>
            {otpauthUrl && (
              <div className="mb-2 text-xs text-gray-600 break-all">
                <span className="font-semibold">otpauth URL:</span>
                <input
                  type="text"
                  value={otpauthUrl}
                  readOnly
                  className="w-full bg-gray-100 rounded px-2 py-1 font-mono text-xs mt-1 mb-1"
                  onFocus={e => e.target.select()}
                />
                <button
                  type="button"
                  className="text-blue-600 underline text-xs ml-1"
                  onClick={() => {navigator.clipboard.writeText(otpauthUrl)}}
                >Copy</button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-red-600 text-xs mb-2">
            QR code could not be generated (data too long). Please use manual entry below.<br />
            {otpauthUrl && (
              <>
                <span className="font-semibold">otpauth URL:</span>
                <input
                  type="text"
                  value={otpauthUrl}
                  readOnly
                  className="w-full bg-gray-100 rounded px-2 py-1 font-mono text-xs mt-1 mb-1"
                  onFocus={e => e.target.select()}
                />
                <button
                  type="button"
                  className="text-blue-600 underline text-xs ml-1"
                  onClick={() => {navigator.clipboard.writeText(otpauthUrl)}}
                >Copy</button>
              </>
            )}
            <div className="font-mono text-sm bg-gray-100 rounded px-2 py-1 mb-2">{secret}</div>
          </div>
        )}
        <form className="space-y-6" onSubmit={handleVerify}>
          <div>
            <label htmlFor="totp" className="block text-sm font-medium text-gray-700">Enter 6-digit code from your authenticator app</label>
            <input id="totp" name="totp" type="text" required value={totp} onChange={e => setTotp(e.target.value)} className="input-field mt-1" maxLength={6} />
          </div>
          <div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex justify-center py-3">
              {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : 'Verify & Enable MFA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MFASetup; 