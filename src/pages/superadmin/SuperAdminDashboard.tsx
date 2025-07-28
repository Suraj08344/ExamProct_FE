import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../logo.svg';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  BuildingLibraryIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  AcademicCapIcon,
  ArrowRightOnRectangleIcon,
  UsersIcon,
  ClockIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
  DocumentMagnifyingGlassIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { QRCodeSVG } from 'qrcode.react';

interface University {
  _id: string;
  universityName: string;
  adminName: string;
  adminEmail: string;
  status: string;
  isVerified: boolean;
  createdAt: string;
  isDeleted?: boolean; // Added for soft delete status
}

const SuperAdminDashboard: React.FC = () => {
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'universities' | 'logs' | 'settings'>('universities');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [logActionType, setLogActionType] = useState('');
  const [logDateFrom, setLogDateFrom] = useState('');
  const [logDateTo, setLogDateTo] = useState('');
  const navigate = useNavigate();

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState('');
  const [mfaSuccess, setMfaSuccess] = useState('');
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [qr, setQr] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [totp, setTotp] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [qrError, setQrError] = useState(false);
  const [showUniversityModal, setShowUniversityModal] = useState(false);
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
  const [universityStats, setUniversityStats] = useState<{ teachers: number; students: number } | null>(null);
  const [universityDetails, setUniversityDetails] = useState<any>(null);

  // Fetch MFA status on tab open
  useEffect(() => {
    if (activeTab === 'settings') {
      const fetchProfile = async () => {
        try {
          const token = localStorage.getItem('superadmin_token');
          const res = await fetch('/api/superadmin/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success) setMfaEnabled(data.data.mfaEnabled);
        } catch {}
      };
      fetchProfile();
    }
  }, [activeTab]);

  const fetchUniversities = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('superadmin_token');
      const res = await fetch('/api/superadmin/universities', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch universities');
      setUniversities(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUniversities();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      const fetchLogs = async () => {
        setLogsLoading(true);
        setLogsError('');
        try {
          const params = new URLSearchParams();
          if (logSearch) params.append('search', logSearch);
          if (logActionType) params.append('actionType', logActionType);
          if (logDateFrom) params.append('dateFrom', logDateFrom);
          if (logDateTo) params.append('dateTo', logDateTo);
          const res = await fetch(`/api/superadmin/logs?${params.toString()}`);
          const data = await res.json();
          if (!data.success) throw new Error(data.error || 'Failed to fetch logs');
          setLogs(data.data);
        } catch (err: any) {
          setLogsError(err.message);
        } finally {
          setLogsLoading(false);
        }
      };
      fetchLogs();
    }
  }, [activeTab, logSearch, logActionType, logDateFrom, logDateTo]);

  const handleAction = async (id: string, action: string) => {
    setActionLoading(id + action);
    setError('');
    try {
      const token = localStorage.getItem('superadmin_token');
      const res = await fetch(`/api/superadmin/universities/${id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Action failed');
      await fetchUniversities();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('superadmin_token');
    localStorage.removeItem('superadmin_login_session');
    navigate('/login');
  };

  const handleViewUniversity = async (university: University) => {
    setSelectedUniversity(university);
    setShowUniversityModal(true);
    setUniversityStats(null);
    setUniversityDetails(null);
    try {
      const token = localStorage.getItem('superadmin_token');
      const res = await fetch(`/api/university/${university._id}/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUniversityStats({ teachers: data.teachers, students: data.students });
        setUniversityDetails(data.university);
      } else {
        setUniversityStats({ teachers: 0, students: 0 });
        setUniversityDetails(null);
      }
    } catch {
      setUniversityStats({ teachers: 0, students: 0 });
      setUniversityDetails(null);
    }
  };

  // Stats
  const total = universities.length;
  const pending = universities.filter(u => u.status === 'pending').length;
  const active = universities.filter(u => u.status === 'active').length;
  const inactive = universities.filter(u => u.status === 'inactive').length;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-100 via-indigo-100 to-blue-200">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <div className="relative flex flex-col items-center justify-center bg-gradient-to-r from-blue-400/80 via-indigo-400/80 to-blue-600/80 shadow-lg rounded-b-3xl mb-8">
          <div className="flex items-center gap-4 py-8">
            <img src={logo} alt="App Logo" className="h-14 w-14 drop-shadow-xl rounded-full border-4 border-white/60" />
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-1">SuperAdmin Dashboard</h1>
              <div className="flex items-center gap-2 text-indigo-100 text-sm">
                <UserCircleIcon className="h-5 w-5" /> SuperAdmin
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="absolute right-4 top-4 flex items-center gap-1 px-4 py-2 rounded bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow hover:from-blue-600 hover:to-indigo-700 transition-all duration-200">
            <ArrowRightOnRectangleIcon className="h-5 w-5" /> Logout
          </button>
        </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 px-4">
          <div className="rounded-2xl bg-white/70 backdrop-blur-lg shadow-lg p-6 flex items-center gap-4 border border-white/30 hover:scale-105 transition-transform">
            <UsersIcon className="h-10 w-10 text-blue-500" />
            <div>
              <div className="text-2xl font-bold text-gray-900 animate-pulse">{total}</div>
              <div className="text-sm text-gray-500">Total Universities</div>
            </div>
          </div>
          <div className="rounded-2xl bg-white/70 backdrop-blur-lg shadow-lg p-6 flex items-center gap-4 border border-white/30 hover:scale-105 transition-transform">
            <ClockIcon className="h-10 w-10 text-yellow-500" />
            <div>
              <div className="text-2xl font-bold text-yellow-700 animate-pulse">{pending}</div>
              <div className="text-sm text-gray-500">Pending Approvals</div>
            </div>
          </div>
          <div className="rounded-2xl bg-white/70 backdrop-blur-lg shadow-lg p-6 flex items-center gap-4 border border-white/30 hover:scale-105 transition-transform">
            <CheckCircleIcon className="h-10 w-10 text-green-500" />
            <div>
              <div className="text-2xl font-bold text-green-700 animate-pulse">{active}</div>
              <div className="text-sm text-gray-500">Active Universities</div>
            </div>
          </div>
          <div className="rounded-2xl bg-white/70 backdrop-blur-lg shadow-lg p-6 flex items-center gap-4 border border-white/30 hover:scale-105 transition-transform">
            <XCircleIcon className="h-10 w-10 text-red-400" />
            <div>
              <div className="text-2xl font-bold text-red-500 animate-pulse">{inactive}</div>
              <div className="text-sm text-gray-500">Inactive Universities</div>
            </div>
          </div>
        </div>
        {/* Tabbed Navigation */}
        <div className="flex gap-4 px-4 mb-8">
          <button
            className={`px-4 py-2 rounded-full font-semibold text-sm shadow transition-all ${activeTab === 'universities' ? 'bg-indigo-600 text-white' : 'bg-white/70 text-indigo-700 hover:bg-indigo-100'}`}
            onClick={() => setActiveTab('universities')}
          >
            <BuildingLibraryIcon className="h-5 w-5 inline mr-1" /> Universities
          </button>
          <button
            className={`px-4 py-2 rounded-full font-semibold text-sm shadow transition-all ${activeTab === 'logs' ? 'bg-indigo-600 text-white' : 'bg-white/70 text-indigo-700 hover:bg-indigo-100'}`}
            onClick={() => setActiveTab('logs')}
          >
            <DocumentMagnifyingGlassIcon className="h-5 w-5 inline mr-1" /> Logs
          </button>
          <button
            className={`px-4 py-2 rounded-full font-semibold text-sm shadow transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'bg-white/70 text-indigo-700 hover:bg-indigo-100'}`}
            onClick={() => setActiveTab('settings')}
          >
            <Cog6ToothIcon className="h-5 w-5 inline mr-1" /> Settings
          </button>
        </div>
        {/* Tab Content */}
        <div className="px-4 pb-10">
        {activeTab === 'universities' && (
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 flex items-center gap-3">
              <AcademicCapIcon className="h-7 w-7 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">University Management</h1>
            </div>
            {/* Search and Filter */}
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 mb-8">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-indigo-400" />
                  <input
                    type="text"
                    placeholder="Search universities..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-12 pr-4 py-3 w-full border border-indigo-300 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-indigo-50 text-gray-700 placeholder-gray-400 transition-all duration-300"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <FunnelIcon className="h-6 w-6 text-indigo-400" />
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                      className="appearance-none border border-indigo-300 rounded-full px-4 py-3 pr-8 min-w-[140px] bg-indigo-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 transition-all duration-300"
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="pending">Pending</option>
                      <option value="deleted">Deleted</option>
                    </select>
                    <svg className="w-4 h-4 text-indigo-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>
            </div>
            {/* Filtered Table */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}
            <div className="bg-white/80 rounded-3xl shadow-2xl overflow-hidden border border-white/30 p-2 sm:p-6">
              {loading ? (
                <div className="flex justify-center items-center h-40">
                  <ArrowPathIcon className="h-8 w-8 text-indigo-600 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider rounded-tl-2xl">University Name</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Admin Email</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Verified</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider rounded-tr-2xl">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {universities
                        .filter(u => {
                          const term = searchTerm.toLowerCase();
                          const matchesSearch =
                            u.universityName.toLowerCase().includes(term) ||
                            u.adminEmail.toLowerCase().includes(term);
                          const matchesStatus =
                            statusFilter === 'all' ? true :
                            statusFilter === 'deleted' ? u.isDeleted :
                            u.status === statusFilter;
                          return matchesSearch && matchesStatus;
                        })
                        .map(u => (
                          <tr key={u._id} className="hover:bg-indigo-50/50 transition">
                            <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                              <span className="inline-flex items-center gap-2">
                                <BuildingLibraryIcon className="h-6 w-6 text-indigo-600" />
                                {u.universityName}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                              <span className="inline-flex items-center gap-2">
                                <UserGroupIcon className="h-6 w-6 text-indigo-600" />
                                {u.adminEmail}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm ${
                                  u.status === 'active'
                                    ? 'bg-green-100 text-green-800'
                                    : u.status === 'inactive'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {u.status === 'active' && <CheckCircleIcon className="h-4 w-4 text-green-600" />}
                                {u.status === 'inactive' && <XCircleIcon className="h-4 w-4 text-yellow-600" />}
                                {u.status === 'pending' && <ClockIcon className="h-4 w-4 text-gray-600" />}
                                {u.status.charAt(0).toUpperCase() + u.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm ${
                                  u.isVerified ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {u.isVerified ? (
                                  <CheckCircleIcon className="h-4 w-4 text-blue-600" />
                                ) : (
                                  <XCircleIcon className="h-4 w-4 text-red-600" />
                                )}
                                {u.isVerified ? 'Verified' : 'Not Verified'}
                              </span>
                            </td>
                            <td className="px-6 py-4 space-x-3 flex flex-wrap items-center gap-2">
                              {u.status === 'pending' && !u.isVerified && (
                                <button
                                  onClick={() => handleAction(u._id, 'approve')}
                                  disabled={actionLoading === u._id + 'approve'}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition disabled:opacity-50 shadow-sm"
                                  title="Approve University"
                                >
                                  <CheckCircleIcon className="h-4 w-4" />
                                  {actionLoading === u._id + 'approve' ? '...' : 'Approve'}
                                </button>
                              )}
                              {u.status === 'pending' && (
                                <button
                                  onClick={() => handleAction(u._id, 'reject')}
                                  disabled={actionLoading === u._id + 'reject'}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition disabled:opacity-50 shadow-sm"
                                  title="Reject University"
                                >
                                  <XCircleIcon className="h-4 w-4" />
                                  {actionLoading === u._id + 'reject' ? '...' : 'Reject'}
                                </button>
                              )}
                              {u.status === 'active' && (
                                <button
                                  onClick={() => handleAction(u._id, 'deactivate')}
                                  disabled={actionLoading === u._id + 'deactivate'}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-yellow-600 text-white text-sm font-medium hover:bg-yellow-700 transition disabled:opacity-50 shadow-sm"
                                  title="Deactivate University"
                                >
                                  <XCircleIcon className="h-4 w-4" />
                                  {actionLoading === u._id + 'deactivate' ? '...' : 'Deactivate'}
                                </button>
                              )}
                              {u.status === 'inactive' && (
                                <button
                                  onClick={() => handleAction(u._id, 'activate')}
                                  disabled={actionLoading === u._id + 'activate'}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 shadow-sm"
                                  title="Activate University"
                                >
                                  <CheckCircleIcon className="h-4 w-4" />
                                  {actionLoading === u._id + 'activate' ? '...' : 'Activate'}
                                </button>
                              )}
                              <button
                                onClick={() => handleAction(u._id, 'soft-delete')}
                                disabled={actionLoading === u._id + 'soft-delete'}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-600 text-white text-sm font-medium hover:bg-gray-700 transition disabled:opacity-50 shadow-sm"
                                title="Soft Delete University"
                              >
                                <XCircleIcon className="h-4 w-4" />
                                {actionLoading === u._id + 'soft-delete' ? '...' : 'Soft Delete'}
                              </button>
                              <button onClick={() => handleViewUniversity(u)} title="View Details" className="p-1 rounded hover:bg-indigo-100">
                                <EyeIcon className="h-5 w-5 text-indigo-600" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
          {activeTab === 'logs' && (
            <div className="w-full max-w-5xl mx-auto rounded-3xl shadow-2xl bg-white/60 backdrop-blur-lg border border-white/30 p-8 sm:p-10 flex flex-col items-center">
              <div className="flex items-center gap-3 mb-6">
                <DocumentMagnifyingGlassIcon className="h-8 w-8 text-indigo-500" />
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Audit Logs</h2>
              </div>
              {/* Search and Filters */}
              <div className="w-full mb-6 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-indigo-400" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={logSearch}
                    onChange={e => setLogSearch(e.target.value)}
                    className="pl-12 pr-4 py-3 w-full border border-indigo-300 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-indigo-50 text-gray-700 placeholder-gray-400 transition-all duration-300"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <FunnelIcon className="h-6 w-6 text-indigo-400" />
                  <select
                    value={logActionType}
                    onChange={e => setLogActionType(e.target.value)}
                    className="appearance-none border border-indigo-300 rounded-full px-4 py-3 pr-8 min-w-[140px] bg-indigo-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 transition-all duration-300"
                  >
                    <option value="">All Actions</option>
                    <option value="login">Login</option>
                    <option value="approve">Approve</option>
                    <option value="reject">Reject</option>
                    <option value="activate">Activate</option>
                    <option value="deactivate">Deactivate</option>
                    <option value="soft-delete">Soft Delete</option>
                    <option value="mfa-setup">MFA Setup</option>
                  </select>
                </div>
                <input
                  type="date"
                  value={logDateFrom}
                  onChange={e => setLogDateFrom(e.target.value)}
                  className="border border-indigo-300 rounded-full px-4 py-3 bg-indigo-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 transition-all duration-300"
                  placeholder="From"
                />
                <input
                  type="date"
                  value={logDateTo}
                  onChange={e => setLogDateTo(e.target.value)}
                  className="border border-indigo-300 rounded-full px-4 py-3 bg-indigo-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 transition-all duration-300"
                  placeholder="To"
                />
              </div>
              {/* Logs Table */}
              <div className="w-full bg-white/80 rounded-2xl shadow-lg border border-white/30 overflow-x-auto">
                {logsLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <ArrowPathIcon className="h-8 w-8 text-indigo-600 animate-spin" />
                  </div>
                ) : logsError ? (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{logsError}</div>
                ) : logs.length === 0 ? (
                  <div className="text-center text-gray-500 py-10">No logs found.</div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider rounded-tl-2xl">Action</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Details</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {logs.map((log: any) => {
                        const actionIcons = {
                          login: ArrowRightOnRectangleIcon,
                          approve: CheckCircleIcon,
                          reject: XCircleIcon,
                          activate: CheckCircleIcon,
                          deactivate: XCircleIcon,
                          'soft-delete': XCircleIcon,
                          'mfa-setup': ShieldCheckIcon,
                        };
                        const actionLabels = {
                          login: 'Login',
                          approve: 'Approve',
                          reject: 'Reject',
                          activate: 'Activate',
                          deactivate: 'Deactivate',
                          'soft-delete': 'Soft Delete',
                          'mfa-setup': 'MFA Setup',
                        };
                        const Icon = actionIcons[log.action as keyof typeof actionIcons] || AcademicCapIcon;
                        return (
                          <tr key={log._id} className="hover:bg-indigo-50/60 transition rounded-xl">
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 flex items-center gap-2">
                              <Icon className="h-6 w-6 text-indigo-600" />
                              {actionLabels[log.action as keyof typeof actionLabels] || log.action}
                            </td>
                            <td className="px-6 py-4 text-gray-700">{log.details}</td>
                            <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto bg-white/80 rounded-2xl shadow-lg p-8 border border-white/30">
              <Cog6ToothIcon className="h-8 w-8 text-indigo-500 mb-2" />
              <h2 className="text-xl font-bold text-gray-900 mb-4">SuperAdmin Settings</h2>
              {/* Change Password */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Change Password</h3>
                <form
                  className="space-y-4"
                  onSubmit={async e => {
                    e.preventDefault();
                    setPasswordError('');
                    setPasswordSuccess('');
                    if (!currentPassword || !newPassword || !confirmPassword) {
                      setPasswordError('All fields are required');
                      return;
                    }
                    if (newPassword !== confirmPassword) {
                      setPasswordError('New passwords do not match');
                      return;
                    }
                    setPasswordLoading(true);
                    try {
                      const token = localStorage.getItem('superadmin_token');
                      const res = await fetch('/api/superadmin/change-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ currentPassword, newPassword })
                      });
                      const data = await res.json();
                      if (!data.success) throw new Error(data.error || 'Failed to change password');
                      setPasswordSuccess('Password changed successfully!');
                      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
                    } catch (err: any) {
                      setPasswordError(err.message);
                    } finally {
                      setPasswordLoading(false);
                    }
                  }}
                >
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrent ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        className="input-field pr-10"
                        required
                      />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowCurrent(v => !v)}>
                        {showCurrent ? <EyeSlashIcon className="h-5 w-5 text-indigo-400" /> : <EyeIcon className="h-5 w-5 text-indigo-400" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">New Password</label>
                    <div className="relative">
                      <input
                        type={showNew ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="input-field pr-10"
                        required
                      />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowNew(v => !v)}>
                        {showNew ? <EyeSlashIcon className="h-5 w-5 text-indigo-400" /> : <EyeIcon className="h-5 w-5 text-indigo-400" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="input-field pr-10"
                        required
                      />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowConfirm(v => !v)}>
                        {showConfirm ? <EyeSlashIcon className="h-5 w-5 text-indigo-400" /> : <EyeIcon className="h-5 w-5 text-indigo-400" />}
                      </button>
                    </div>
                  </div>
                  {passwordError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg">{passwordError}</div>}
                  {passwordSuccess && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg">{passwordSuccess}</div>}
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 flex justify-center items-center gap-2 text-lg mt-2"
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white border-t-2"></span> : 'Change Password'}
                  </button>
                </form>
              </div>
              {/* MFA Toggle */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Multi-Factor Authentication (MFA)</h3>
                <div className="flex items-center gap-3 mb-4">
                  <ShieldCheckIcon className="h-6 w-6 text-indigo-500" />
                  <span className={`font-bold ${mfaEnabled ? 'text-green-600' : 'text-red-500'}`}>{mfaEnabled ? 'Enabled' : 'Disabled'}</span>
                </div>
                {mfaEnabled ? (
                  <form
                    className="space-y-4"
                    onSubmit={async e => {
                      e.preventDefault();
                      setMfaError(''); setMfaSuccess('');
                      setMfaLoading(true);
                      try {
                        const token = localStorage.getItem('superadmin_token');
                        const res = await fetch('/api/superadmin/mfa/disable', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ totp })
                        });
                        const data = await res.json();
                        if (!data.success) throw new Error(data.error || 'Failed to disable MFA');
                        setMfaSuccess('MFA disabled!');
                        setMfaEnabled(false);
                        setTotp('');
                      } catch (err: any) {
                        setMfaError(err.message);
                      } finally {
                        setMfaLoading(false);
                      }
                    }}
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-1">Enter TOTP code to disable MFA</label>
                    <input
                      type="text"
                      value={totp}
                      onChange={e => setTotp(e.target.value)}
                      className="input-field mt-1 text-lg tracking-widest text-center"
                      maxLength={6}
                      required
                      placeholder="123456"
                    />
                    {mfaError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg">{mfaError}</div>}
                    {mfaSuccess && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg">{mfaSuccess}</div>}
                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 flex justify-center items-center gap-2 text-lg mt-2"
                      disabled={mfaLoading}
                    >
                      {mfaLoading ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white border-t-2"></span> : 'Disable MFA'}
                    </button>
                  </form>
                ) : (
                  <div>
                    {!showMfaSetup ? (
                      <button
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 flex justify-center items-center gap-2 text-lg mt-2"
                        onClick={async () => {
                          setShowMfaSetup(true);
                          setMfaError(''); setMfaSuccess('');
                          setQr(''); setMfaSecret('');
                          try {
                            const token = localStorage.getItem('superadmin_token');
                            const res = await fetch('/api/superadmin/mfa/setup', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
                            });
                            const data = await res.json();
                            if (!data.success) throw new Error(data.error || 'Failed to get QR');
                            setQr(data.qr);
                            setMfaSecret(data.secret);
                            setOtpauthUrl(data.otpauth_url || '');
                          } catch (err: any) {
                            setMfaError(err.message);
                          }
                        }}
                      >
                        Enable MFA
                      </button>
                    ) : (
                      <form
                        className="space-y-4 mt-4"
                        onSubmit={async e => {
                          e.preventDefault();
                          setMfaError(''); setMfaSuccess('');
                          setMfaLoading(true);
                          try {
                            const token = localStorage.getItem('superadmin_token');
                            const res = await fetch('/api/superadmin/mfa/enable', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ totp })
                            });
                            const data = await res.json();
                            if (!data.success) throw new Error(data.error || 'Failed to enable MFA');
                            setMfaSuccess('MFA enabled!');
                            setMfaEnabled(true);
                            setShowMfaSetup(false);
                            setTotp('');
                          } catch (err: any) {
                            setMfaError(err.message);
                          } finally {
                            setMfaLoading(false);
                          }
                        }}
                      >
                        <div className="flex flex-col items-center gap-2">
                          {qr && !qrError ? (
                            <img src={qr} alt="Scan QR" className="mb-2" onError={() => setQrError(true)} />
                          ) : qrError ? (
                            <div className="text-red-600 text-xs mb-2">QR code could not be displayed. Please use manual entry below.</div>
                          ) : null}
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
                          <div className="text-xs text-gray-500 mb-2">Scan this QR code in your authenticator app or enter the secret manually.</div>
                          {mfaSecret && <div className="font-mono text-sm bg-gray-100 rounded px-2 py-1 mb-2">{mfaSecret}</div>}
                        </div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Enter 6-digit code from your authenticator app</label>
                        <input
                          type="text"
                          value={totp}
                          onChange={e => setTotp(e.target.value)}
                          className="input-field mt-1 text-lg tracking-widest text-center"
                          maxLength={6}
                          required
                          placeholder="123456"
                        />
                        {mfaError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg">{mfaError}</div>}
                        {mfaSuccess && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg">{mfaSuccess}</div>}
                        <button
                          type="submit"
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 flex justify-center items-center gap-2 text-lg mt-2"
                          disabled={mfaLoading}
                        >
                          {mfaLoading ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white border-t-2"></span> : 'Enable MFA'}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {showUniversityModal && selectedUniversity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
          <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 max-w-lg w-full relative border border-white/30">
            <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700" onClick={() => setShowUniversityModal(false)}>
              <XMarkIcon className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <AcademicCapIcon className="h-10 w-10 text-indigo-500 drop-shadow" />
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900 mb-0.5">{universityDetails?.universityName || 'University Details'}</h2>
                <div className="flex gap-2 items-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${universityDetails?.status === 'active' ? 'bg-green-100 text-green-700' : universityDetails?.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{universityDetails?.status}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${universityDetails?.isVerified ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{universityDetails?.isVerified ? 'Verified' : 'Not Verified'}</span>
                </div>
              </div>
            </div>
            {universityDetails ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mb-4">
                <div><span className="font-semibold text-gray-700">Admin Name:</span><br /><span className="text-gray-900">{universityDetails.adminName}</span></div>
                <div><span className="font-semibold text-gray-700">Admin Email:</span><br /><span className="text-gray-900">{universityDetails.adminEmail}</span></div>
                <div><span className="font-semibold text-gray-700">Phone:</span><br /><span className="text-gray-900">{universityDetails.phone}</span></div>
                <div><span className="font-semibold text-gray-700">Website:</span><br /><a href={universityDetails.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">{universityDetails.website}</a></div>
                <div className="sm:col-span-2"><span className="font-semibold text-gray-700">Address:</span><br /><span className="text-gray-900">{universityDetails.address}, {universityDetails.city}, {universityDetails.state} {universityDetails.postalCode}, {universityDetails.country}</span></div>
                <div><span className="font-semibold text-gray-700">Created At:</span><br /><span className="text-gray-900">{new Date(universityDetails.createdAt).toLocaleString()}</span></div>
              </div>
            ) : (
              <div>Loading details...</div>
            )}
            <div className="flex gap-6 justify-center mt-6">
              <div className="flex flex-col items-center">
                <UserGroupIcon className="h-7 w-7 text-indigo-400 mb-1" />
                <span className="text-xs text-gray-500">Teachers</span>
                <span className="text-lg font-bold text-indigo-700">{universityStats ? universityStats.teachers : 0}</span>
              </div>
              <div className="flex flex-col items-center">
                <AcademicCapIcon className="h-7 w-7 text-green-400 mb-1" />
                <span className="text-xs text-gray-500">Students</span>
                <span className="text-lg font-bold text-green-700">{universityStats ? universityStats.students : 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;