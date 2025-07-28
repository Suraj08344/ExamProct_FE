import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [superAdminEmail, setSuperAdminEmail] = useState('');

  React.useEffect(() => {
          fetch('https://examproctor-backend-e6mh.onrender.com/api/superadmin/email')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.email) setSuperAdminEmail(data.email.toLowerCase());
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (email.trim().toLowerCase() === superAdminEmail) {
        console.log('Attempting SuperAdmin login');
        // SuperAdmin login flow
        const res = await fetch('https://examproctor-backend-e6mh.onrender.com/api/superadmin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Invalid credentials');
        if (data.mfaRequired) {
          localStorage.setItem('superadmin_login_session', data.loginSessionToken);
          navigate('/superadmin/mfa-verify');
        } else {
          // No MFA required, store token and go to dashboard
          localStorage.setItem('superadmin_token', data.token);
          navigate('/superadmin/dashboard');
        }
        return;
      } else {
        console.log('Attempting normal user login');
        await login(email, password);
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (err.message === 'Account pending approval. Please wait for SuperAdmin approval before logging in.') {
        setError('Your university account is pending approval. Please wait for SuperAdmin approval before logging in.');
      } else if (err.message === 'Account Inactive') {
        setError('Your university account is inactive. Please contact your administrator.');
      } else if (err.message === 'Account Deleted') {
        setError('Your university account has been deleted. Please contact support.');
      } else {
        setError('Invalid email or password');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-secondary-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-secondary-600">
            Or{' '}
            <Link
              to="/register"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              create a new account
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-secondary-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field mt-1"
                placeholder="Enter your email"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-secondary-700">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-secondary-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-secondary-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex justify-center py-3"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
        </form>
        <div className="text-center mt-4">
          <Link to="/auth/forgot-password" className="text-blue-600 hover:underline text-sm">Forgot Password?</Link>
        </div>
      </div>
    </div>
  );
};

export default Login; 