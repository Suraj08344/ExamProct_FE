import React, { useState } from 'react';
import {
  CogIcon,
  ShieldCheckIcon,
  BellIcon,
  VideoCameraIcon,
  ArrowPathIcon,
  PlusIcon,
  MinusIcon,
  CheckCircleIcon,
  ServerIcon
} from '@heroicons/react/24/outline';

interface SystemSettingsData {
  proctoring: ProctoringSettings;
  security: SecuritySettings;
  notifications: NotificationSettings;
  platform: PlatformSettings;
  integrations: IntegrationSettings;
}

interface ProctoringSettings {
  enableVideoProctoring: boolean;
  enableAudioProctoring: boolean;
  enableScreenRecording: boolean;
  enableFaceDetection: boolean;
  enableTabSwitchDetection: boolean;
  enableMultipleFaceDetection: boolean;
  enableAudioDisruptionDetection: boolean;
  maxTabSwitches: number;
  faceDetectionTimeout: number;
  audioDisruptionThreshold: number;
  recordingQuality: 'low' | 'medium' | 'high';
  storageRetentionDays: number;
}

interface SecuritySettings {
  requireTwoFactorAuth: boolean;
  enableSessionTimeout: boolean;
  sessionTimeoutMinutes: number;
  enableIPWhitelist: boolean;
  allowedIPs: string[];
  enablePasswordPolicy: boolean;
  minPasswordLength: number;
  requireSpecialCharacters: boolean;
  requireNumbers: boolean;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  enableAuditLogging: boolean;
  auditLogRetentionDays: number;
}

interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  proctorAlerts: boolean;
  examCompletions: boolean;
  systemMaintenance: boolean;
  securityAlerts: boolean;
  dailyReports: boolean;
  weeklyReports: boolean;
  monthlyReports: boolean;
}

interface PlatformSettings {
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  supportPhone: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  language: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maxFileUploadSize: number;
  allowedFileTypes: string[];
  enableAnalytics: boolean;
  enableErrorReporting: boolean;
}

interface IntegrationSettings {
  smtpServer: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  smtpEncryption: 'none' | 'tls' | 'ssl';
  enableSMS: boolean;
  smsProvider: string;
  smsApiKey: string;
  enablePushNotifications: boolean;
  pushProvider: string;
  pushApiKey: string;
}

const SystemSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('proctoring');
  const [settings, setSettings] = useState<SystemSettingsData>({
    proctoring: {
      enableVideoProctoring: true,
      enableAudioProctoring: true,
      enableScreenRecording: true,
      enableFaceDetection: true,
      enableTabSwitchDetection: true,
      enableMultipleFaceDetection: true,
      enableAudioDisruptionDetection: true,
      maxTabSwitches: 3,
      faceDetectionTimeout: 30,
      audioDisruptionThreshold: 5,
      recordingQuality: 'medium',
      storageRetentionDays: 90
    },
    security: {
      requireTwoFactorAuth: false,
      enableSessionTimeout: true,
      sessionTimeoutMinutes: 30,
      enableIPWhitelist: false,
      allowedIPs: [],
      enablePasswordPolicy: true,
      minPasswordLength: 8,
      requireSpecialCharacters: true,
      requireNumbers: true,
      maxLoginAttempts: 5,
      lockoutDurationMinutes: 15,
      enableAuditLogging: true,
      auditLogRetentionDays: 365
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      proctorAlerts: true,
      examCompletions: true,
      systemMaintenance: true,
      securityAlerts: true,
      dailyReports: false,
      weeklyReports: true,
      monthlyReports: true
    },
    platform: {
      siteName: 'Exam Proctor Platform',
      siteDescription: 'Professional online exam proctoring platform',
      contactEmail: 'support@examproctor.com',
      supportPhone: '+1 (555) 123-4567',
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      language: 'en',
      maintenanceMode: false,
      maintenanceMessage: 'System is under maintenance. Please try again later.',
      maxFileUploadSize: 10,
      allowedFileTypes: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
      enableAnalytics: true,
      enableErrorReporting: true
    },
    integrations: {
      smtpServer: 'smtp.gmail.com',
      smtpPort: 587,
      smtpUsername: '',
      smtpPassword: '',
      smtpEncryption: 'tls',
      enableSMS: false,
      smsProvider: 'twilio',
      smsApiKey: '',
      enablePushNotifications: false,
      pushProvider: 'firebase',
      pushApiKey: ''
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSettingChange = (section: keyof SystemSettingsData, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to default?')) {
      // Reset to default values
      console.log('Resetting settings...');
    }
  };

  const addAllowedIP = () => {
    const newIP = prompt('Enter IP address:');
    if (newIP) {
      handleSettingChange('security', 'allowedIPs', [...settings.security.allowedIPs, newIP]);
    }
  };

  const removeAllowedIP = (index: number) => {
    const newIPs = settings.security.allowedIPs.filter((_, i) => i !== index);
    handleSettingChange('security', 'allowedIPs', newIPs);
  };

  const tabs = [
    { id: 'proctoring', name: 'Proctoring', icon: VideoCameraIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'platform', name: 'Platform', icon: CogIcon },
    { id: 'integrations', name: 'Integrations', icon: ServerIcon }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900">System Settings</h1>
          <p className="text-secondary-600 mt-2">
            Configure platform settings, security, and integrations.
          </p>
        </div>
        <div className="flex space-x-2 mt-4 sm:mt-0">
          <button
            onClick={handleReset}
            className="btn-secondary inline-flex items-center"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Reset to Default
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary inline-flex items-center"
          >
            {isSaving ? (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-green-800">Settings saved successfully!</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-secondary-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm inline-flex items-center ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Settings Content */}
      <div className="space-y-6">
        {/* Proctoring Settings */}
        {activeTab === 'proctoring' && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">Video & Audio Proctoring</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-secondary-900">Enable Video Proctoring</label>
                      <p className="text-xs text-secondary-500">Record student video during exams</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.proctoring.enableVideoProctoring}
                      onChange={(e) => handleSettingChange('proctoring', 'enableVideoProctoring', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-secondary-900">Enable Audio Proctoring</label>
                      <p className="text-xs text-secondary-500">Record student audio during exams</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.proctoring.enableAudioProctoring}
                      onChange={(e) => handleSettingChange('proctoring', 'enableAudioProctoring', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-secondary-900">Enable Screen Recording</label>
                      <p className="text-xs text-secondary-500">Record student screen during exams</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.proctoring.enableScreenRecording}
                      onChange={(e) => handleSettingChange('proctoring', 'enableScreenRecording', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-secondary-900">Recording Quality</label>
                    <select
                      value={settings.proctoring.recordingQuality}
                      onChange={(e) => handleSettingChange('proctoring', 'recordingQuality', e.target.value)}
                      className="input-field mt-1"
                    >
                      <option value="low">Low (480p)</option>
                      <option value="medium">Medium (720p)</option>
                      <option value="high">High (1080p)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-secondary-900">Storage Retention (days)</label>
                    <input
                      type="number"
                      value={settings.proctoring.storageRetentionDays}
                      onChange={(e) => handleSettingChange('proctoring', 'storageRetentionDays', parseInt(e.target.value))}
                      className="input-field mt-1"
                      min="1"
                      max="365"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">Detection Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-secondary-900">Face Detection</label>
                      <p className="text-xs text-secondary-500">Detect if student face is visible</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.proctoring.enableFaceDetection}
                      onChange={(e) => handleSettingChange('proctoring', 'enableFaceDetection', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-secondary-900">Multiple Face Detection</label>
                      <p className="text-xs text-secondary-500">Detect multiple faces in camera</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.proctoring.enableMultipleFaceDetection}
                      onChange={(e) => handleSettingChange('proctoring', 'enableMultipleFaceDetection', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-secondary-900">Tab Switch Detection</label>
                      <p className="text-xs text-secondary-500">Detect when student switches tabs</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.proctoring.enableTabSwitchDetection}
                      onChange={(e) => handleSettingChange('proctoring', 'enableTabSwitchDetection', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-secondary-900">Max Tab Switches</label>
                    <input
                      type="number"
                      value={settings.proctoring.maxTabSwitches}
                      onChange={(e) => handleSettingChange('proctoring', 'maxTabSwitches', parseInt(e.target.value))}
                      className="input-field"
                      min="0"
                      max="10"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-secondary-900">Face Detection Timeout (seconds)</label>
                    <input
                      type="number"
                      value={settings.proctoring.faceDetectionTimeout}
                      onChange={(e) => handleSettingChange('proctoring', 'faceDetectionTimeout', parseInt(e.target.value))}
                      className="input-field"
                      min="5"
                      max="60"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">Authentication & Session</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-secondary-900">Require Two-Factor Auth</label>
                      <p className="text-xs text-secondary-500">Enforce 2FA for all users</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.security.requireTwoFactorAuth}
                      onChange={(e) => handleSettingChange('security', 'requireTwoFactorAuth', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-secondary-900">Enable Session Timeout</label>
                      <p className="text-xs text-secondary-500">Automatically log out inactive users</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.security.enableSessionTimeout}
                      onChange={(e) => handleSettingChange('security', 'enableSessionTimeout', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-secondary-900">Enable IP Whitelist</label>
                      <p className="text-xs text-secondary-500">Restrict access to specific IP addresses</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.security.enableIPWhitelist}
                      onChange={(e) => handleSettingChange('security', 'enableIPWhitelist', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-secondary-900">Session Timeout (minutes)</label>
                    <input
                      type="number"
                      value={settings.security.sessionTimeoutMinutes}
                      onChange={(e) => handleSettingChange('security', 'sessionTimeoutMinutes', parseInt(e.target.value))}
                      className="input-field"
                      min="5"
                      max="480"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-secondary-900">Max Login Attempts</label>
                    <input
                      type="number"
                      value={settings.security.maxLoginAttempts}
                      onChange={(e) => handleSettingChange('security', 'maxLoginAttempts', parseInt(e.target.value))}
                      className="input-field"
                      min="3"
                      max="10"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-secondary-900">Lockout Duration (minutes)</label>
                    <input
                      type="number"
                      value={settings.security.lockoutDurationMinutes}
                      onChange={(e) => handleSettingChange('security', 'lockoutDurationMinutes', parseInt(e.target.value))}
                      className="input-field"
                      min="5"
                      max="1440"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">Password Policy</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-secondary-900">Enable Password Policy</label>
                      <p className="text-xs text-secondary-500">Enforce password requirements</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.security.enablePasswordPolicy}
                      onChange={(e) => handleSettingChange('security', 'enablePasswordPolicy', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-secondary-900">Require Special Characters</label>
                      <p className="text-xs text-secondary-500">Passwords must contain special characters</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.security.requireSpecialCharacters}
                      onChange={(e) => handleSettingChange('security', 'requireSpecialCharacters', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-secondary-900">Require Numbers</label>
                      <p className="text-xs text-secondary-500">Passwords must contain numbers</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.security.requireNumbers}
                      onChange={(e) => handleSettingChange('security', 'requireNumbers', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-secondary-900">Minimum Password Length</label>
                    <input
                      type="number"
                      value={settings.security.minPasswordLength}
                      onChange={(e) => handleSettingChange('security', 'minPasswordLength', parseInt(e.target.value))}
                      className="input-field"
                      min="6"
                      max="20"
                    />
                  </div>
                </div>
              </div>
            </div>

            {settings.security.enableIPWhitelist && (
              <div className="card">
                <h3 className="text-lg font-semibold text-secondary-900 mb-4">Allowed IP Addresses</h3>
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <button
                      onClick={addAllowedIP}
                      className="btn-secondary inline-flex items-center"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add IP Address
                    </button>
                  </div>
                  <div className="space-y-2">
                    {settings.security.allowedIPs.map((ip, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                        <span className="text-sm font-mono">{ip}</span>
                        <button
                          onClick={() => removeAllowedIP(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <MinusIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {settings.security.allowedIPs.length === 0 && (
                      <p className="text-sm text-secondary-500">No IP addresses configured</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notifications Settings */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">Notification Channels</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-secondary-900">Email Notifications</label>
                      <p className="text-xs text-secondary-500">Send notifications via email</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications.emailNotifications}
                      onChange={(e) => handleSettingChange('notifications', 'emailNotifications', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-secondary-900">SMS Notifications</label>
                      <p className="text-xs text-secondary-500">Send notifications via SMS</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications.smsNotifications}
                      onChange={(e) => handleSettingChange('notifications', 'smsNotifications', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-secondary-900">Push Notifications</label>
                      <p className="text-xs text-secondary-500">Send push notifications</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications.pushNotifications}
                      onChange={(e) => handleSettingChange('notifications', 'pushNotifications', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">Notification Types</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-secondary-900">Proctor Alerts</label>
                      <p className="text-xs text-secondary-500">Real-time proctoring alerts</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications.proctorAlerts}
                      onChange={(e) => handleSettingChange('notifications', 'proctorAlerts', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-secondary-900">Exam Completions</label>
                      <p className="text-xs text-secondary-500">When students complete exams</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications.examCompletions}
                      onChange={(e) => handleSettingChange('notifications', 'examCompletions', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-secondary-900">System Maintenance</label>
                      <p className="text-xs text-secondary-500">Maintenance and update notifications</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications.systemMaintenance}
                      onChange={(e) => handleSettingChange('notifications', 'systemMaintenance', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-secondary-900">Security Alerts</label>
                      <p className="text-xs text-secondary-500">Security-related notifications</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications.securityAlerts}
                      onChange={(e) => handleSettingChange('notifications', 'securityAlerts', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-secondary-900">Daily Reports</label>
                      <p className="text-xs text-secondary-500">Daily summary reports</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications.dailyReports}
                      onChange={(e) => handleSettingChange('notifications', 'dailyReports', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-secondary-900">Weekly Reports</label>
                      <p className="text-xs text-secondary-500">Weekly summary reports</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications.weeklyReports}
                      onChange={(e) => handleSettingChange('notifications', 'weeklyReports', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Platform Settings */}
        {activeTab === 'platform' && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">General Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-secondary-900">Site Name</label>
                    <input
                      type="text"
                      value={settings.platform.siteName}
                      onChange={(e) => handleSettingChange('platform', 'siteName', e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-secondary-900">Contact Email</label>
                    <input
                      type="email"
                      value={settings.platform.contactEmail}
                      onChange={(e) => handleSettingChange('platform', 'contactEmail', e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-secondary-900">Support Phone</label>
                    <input
                      type="text"
                      value={settings.platform.supportPhone}
                      onChange={(e) => handleSettingChange('platform', 'supportPhone', e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-secondary-900">Timezone</label>
                    <select
                      value={settings.platform.timezone}
                      onChange={(e) => handleSettingChange('platform', 'timezone', e.target.value)}
                      className="input-field"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-secondary-900">Language</label>
                    <select
                      value={settings.platform.language}
                      onChange={(e) => handleSettingChange('platform', 'language', e.target.value)}
                      className="input-field"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-secondary-900">Max File Upload Size (MB)</label>
                    <input
                      type="number"
                      value={settings.platform.maxFileUploadSize}
                      onChange={(e) => handleSettingChange('platform', 'maxFileUploadSize', parseInt(e.target.value))}
                      className="input-field"
                      min="1"
                      max="100"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">Maintenance Mode</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-secondary-900">Enable Maintenance Mode</label>
                    <p className="text-xs text-secondary-500">Temporarily disable access to the platform</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.platform.maintenanceMode}
                    onChange={(e) => handleSettingChange('platform', 'maintenanceMode', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                  />
                </div>
                {settings.platform.maintenanceMode && (
                  <div>
                    <label className="text-sm font-medium text-secondary-900">Maintenance Message</label>
                    <textarea
                      value={settings.platform.maintenanceMessage}
                      onChange={(e) => handleSettingChange('platform', 'maintenanceMessage', e.target.value)}
                      className="input-field"
                      rows={3}
                      placeholder="Enter maintenance message..."
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Integrations Settings */}
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">Email Configuration (SMTP)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-secondary-900">SMTP Server</label>
                    <input
                      type="text"
                      value={settings.integrations.smtpServer}
                      onChange={(e) => handleSettingChange('integrations', 'smtpServer', e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-secondary-900">SMTP Port</label>
                    <input
                      type="number"
                      value={settings.integrations.smtpPort}
                      onChange={(e) => handleSettingChange('integrations', 'smtpPort', parseInt(e.target.value))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-secondary-900">SMTP Username</label>
                    <input
                      type="text"
                      value={settings.integrations.smtpUsername}
                      onChange={(e) => handleSettingChange('integrations', 'smtpUsername', e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-secondary-900">SMTP Password</label>
                    <input
                      type="password"
                      value={settings.integrations.smtpPassword}
                      onChange={(e) => handleSettingChange('integrations', 'smtpPassword', e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-secondary-900">Encryption</label>
                    <select
                      value={settings.integrations.smtpEncryption}
                      onChange={(e) => handleSettingChange('integrations', 'smtpEncryption', e.target.value)}
                      className="input-field"
                    >
                      <option value="none">None</option>
                      <option value="tls">TLS</option>
                      <option value="ssl">SSL</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">SMS Configuration</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-secondary-900">Enable SMS Notifications</label>
                    <p className="text-xs text-secondary-500">Send notifications via SMS</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.integrations.enableSMS}
                    onChange={(e) => handleSettingChange('integrations', 'enableSMS', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                  />
                </div>
                {settings.integrations.enableSMS && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium text-secondary-900">SMS Provider</label>
                      <select
                        value={settings.integrations.smsProvider}
                        onChange={(e) => handleSettingChange('integrations', 'smsProvider', e.target.value)}
                        className="input-field"
                      >
                        <option value="twilio">Twilio</option>
                        <option value="aws">AWS SNS</option>
                        <option value="nexmo">Nexmo</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-secondary-900">API Key</label>
                      <input
                        type="password"
                        value={settings.integrations.smsApiKey}
                        onChange={(e) => handleSettingChange('integrations', 'smsApiKey', e.target.value)}
                        className="input-field"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemSettings; 