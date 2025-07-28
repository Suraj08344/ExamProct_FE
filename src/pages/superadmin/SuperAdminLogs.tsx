import React, { useEffect, useState } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightOnRectangleIcon,
  AcademicCapIcon,
  ClockIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  DocumentMagnifyingGlassIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const actionIcons: Record<string, any> = {
  login: ArrowRightOnRectangleIcon,
  approve: CheckCircleIcon,
  reject: XCircleIcon,
  activate: CheckCircleIcon,
  deactivate: XCircleIcon,
  'soft-delete': XCircleIcon,
  'mfa-setup': ShieldCheckIcon,
};

const actionLabels: Record<string, string> = {
  login: 'Login',
  approve: 'Approve',
  reject: 'Reject',
  activate: 'Activate',
  deactivate: 'Deactivate',
  'soft-delete': 'Soft Delete',
  'mfa-setup': 'MFA Setup',
};

const SuperAdminLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [actionType, setActionType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (actionType) params.append('actionType', actionType);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      const res = await fetch(`/api/superadmin/logs?${params.toString()}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch logs');
      setLogs(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line
  }, [search, actionType, dateFrom, dateTo]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-blue-200 py-10">
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
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-12 pr-4 py-3 w-full border border-indigo-300 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-indigo-50 text-gray-700 placeholder-gray-400 transition-all duration-300"
            />
          </div>
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-6 w-6 text-indigo-400" />
            <select
              value={actionType}
              onChange={e => setActionType(e.target.value)}
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
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="border border-indigo-300 rounded-full px-4 py-3 bg-indigo-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 transition-all duration-300"
            placeholder="From"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="border border-indigo-300 rounded-full px-4 py-3 bg-indigo-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 transition-all duration-300"
            placeholder="To"
          />
        </div>
        {/* Logs Table */}
        <div className="w-full bg-white/80 rounded-2xl shadow-lg border border-white/30 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <ArrowPathIcon className="h-8 w-8 text-indigo-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
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
                {logs.map(log => {
                  const Icon = actionIcons[log.action] || AcademicCapIcon;
                  return (
                    <tr key={log._id} className="hover:bg-indigo-50/60 transition rounded-xl">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 flex items-center gap-2">
                        <Icon className="h-6 w-6 text-indigo-600" />
                        {actionLabels[log.action] || log.action}
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
    </div>
  );
};

export default SuperAdminLogs; 