import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  UsersIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CogIcon,
  BellIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  // Mock admin data
  const stats = {
    totalUsers: 1247,
    activeUsers: 892,
    totalExams: 156,
    activeExams: 23,
    totalSessions: 2847,
    activeSessions: 45,
    systemHealth: 98.5,
    uptime: '99.9%',
    storageUsed: '2.4 GB',
    storageTotal: '10 GB'
  };

  const recentActivity = [
    {
      id: '1',
      type: 'exam_created',
      user: 'Dr. Sarah Johnson',
      action: 'created a new exam',
      target: 'Advanced Mathematics',
      time: '2 minutes ago',
      status: 'success'
    },
    {
      id: '2',
      type: 'user_registered',
      user: 'John Smith',
      action: 'registered as a student',
      target: 'john.smith@email.com',
      time: '5 minutes ago',
      status: 'info'
    },
    {
      id: '3',
      type: 'proctor_alert',
      user: 'Student ID: 12345',
      action: 'triggered proctor alert',
      target: 'Tab switching detected',
      time: '8 minutes ago',
      status: 'warning'
    },
    {
      id: '4',
      type: 'exam_completed',
      user: 'Maria Garcia',
      action: 'completed exam',
      target: 'JavaScript Fundamentals',
      time: '12 minutes ago',
      status: 'success'
    }
  ];

  const systemMetrics = {
    cpu: 45,
    memory: 62,
    network: 78,
    disk: 24
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
      case 'warning': return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />;
      case 'error': return <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />;
      default: return <EyeIcon className="h-4 w-4 text-blue-600" />;
    }
  };

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ComponentType<any>;
    color: string;
    subtitle?: string;
  }> = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-secondary-600">{title}</p>
          <p className="text-2xl font-semibold text-secondary-900">{value}</p>
          {subtitle && <p className="text-xs text-secondary-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  const ProgressBar: React.FC<{
    label: string;
    value: number;
    max: number;
    color: string;
  }> = ({ label, value, max, color }) => (
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-secondary-600">{label}</span>
        <span className="text-secondary-900">{value}%</span>
      </div>
      <div className="w-full bg-secondary-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900">Admin Dashboard</h1>
          <p className="text-secondary-600 mt-2">
            Welcome back, {user?.name}. Here's what's happening with your system.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button className="btn-secondary inline-flex items-center">
            <BellIcon className="h-4 w-4 mr-2" />
            Notifications
          </button>
          <button className="btn-primary inline-flex items-center">
            <CogIcon className="h-4 w-4 mr-2" />
            Settings
          </button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Users"
          value={stats.totalUsers}
          icon={UsersIcon}
          color="bg-blue-500"
          subtitle={`${stats.activeUsers} active`}
        />
        <MetricCard
          title="Total Exams"
          value={stats.totalExams}
          icon={DocumentTextIcon}
          color="bg-green-500"
          subtitle={`${stats.activeExams} active`}
        />
        <MetricCard
          title="Active Sessions"
          value={stats.activeSessions}
          icon={ChartBarIcon}
          color="bg-purple-500"
          subtitle={`${stats.totalSessions} total`}
        />
        <MetricCard
          title="System Health"
          value={`${stats.systemHealth}%`}
          icon={ShieldCheckIcon}
          color="bg-green-500"
          subtitle={`Uptime: ${stats.uptime}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Metrics */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-xl font-semibold text-secondary-900 mb-4">System Performance</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-secondary-700 mb-3">Resource Usage</h3>
                <ProgressBar label="CPU" value={systemMetrics.cpu} max={100} color="bg-blue-500" />
                <ProgressBar label="Memory" value={systemMetrics.memory} max={100} color="bg-green-500" />
                <ProgressBar label="Network" value={systemMetrics.network} max={100} color="bg-purple-500" />
                <ProgressBar label="Disk" value={systemMetrics.disk} max={100} color="bg-yellow-500" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-secondary-700 mb-3">Storage</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-secondary-600">Used</span>
                    <span className="text-sm font-medium">{stats.storageUsed}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-secondary-600">Total</span>
                    <span className="text-sm font-medium">{stats.storageTotal}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-secondary-600">Available</span>
                    <span className="text-sm font-medium">7.6 GB</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h2 className="text-xl font-semibold text-secondary-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                {getStatusIcon(activity.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-secondary-900">
                    {activity.user}
                  </p>
                  <p className="text-sm text-secondary-600">
                    {activity.action} <span className="font-medium">{activity.target}</span>
                  </p>
                  <p className="text-xs text-secondary-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 text-sm text-primary-600 hover:text-primary-700">
            View all activity
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-xl font-semibold text-secondary-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 border border-secondary-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors">
            <UsersIcon className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-secondary-900">Manage Users</span>
          </button>
          <button className="p-4 border border-secondary-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors">
            <DocumentTextIcon className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-secondary-900">Create Exam</span>
          </button>
          <button className="p-4 border border-secondary-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors">
            <ChartBarIcon className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-secondary-900">View Analytics</span>
          </button>
          <button className="p-4 border border-secondary-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors">
            <CogIcon className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-secondary-900">System Settings</span>
          </button>
        </div>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold text-secondary-900 mb-4">System Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-secondary-700">Web Server</span>
              </div>
              <span className="text-sm text-green-600">Online</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-secondary-700">Database</span>
              </div>
              <span className="text-sm text-green-600">Online</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-secondary-700">Proctoring Service</span>
              </div>
              <span className="text-sm text-green-600">Online</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-secondary-700">File Storage</span>
              </div>
              <span className="text-sm text-yellow-600">Warning</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-secondary-900 mb-4">Security Overview</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary-700">Active Sessions</span>
              <span className="text-sm font-medium text-secondary-900">{stats.activeSessions}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary-700">Failed Login Attempts</span>
              <span className="text-sm font-medium text-red-600">3 (last 24h)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary-700">Proctor Alerts</span>
              <span className="text-sm font-medium text-yellow-600">12 (today)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary-700">System Updates</span>
              <span className="text-sm font-medium text-green-600">Up to date</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 