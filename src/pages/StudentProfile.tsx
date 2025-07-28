import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import {
  UserIcon,
  EnvelopeIcon,
  AcademicCapIcon,
  CalendarIcon,
  PencilIcon,
  CameraIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const StudentProfile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    avatar: '',
    studentId: '',
    year: ''
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.users.getProfile();
      if (response.success) {
        setProfile(response.data);
        setEditForm({
          name: response.data.name,
          email: response.data.email,
          avatar: response.data.avatar || '',
          studentId: response.data.studentId || '',
          year: response.data.year || ''
        });
      } else {
        setError('Failed to load profile.');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Error fetching profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editForm.name.trim() || !editForm.email.trim()) {
      setError('Name and email are required fields.');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const response = await apiService.users.updateProfile(editForm);
      if (response.success) {
        setProfile(response.data);
        setIsEditing(false);
        updateUser(response.data);
        alert('Profile updated successfully.');
      } else {
        setError('Failed to update profile: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Error updating profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditForm({
      name: profile?.name || '',
      email: profile?.email || '',
      avatar: profile?.avatar || '',
      studentId: profile?.studentId || '',
      year: profile?.year || ''
    });
    setIsEditing(false);
    setError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 text-base font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 flex items-center justify-center">
        <div className="text-center bg-white/80 backdrop-blur-xl rounded-xl border border-slate-200 p-6 animate-fadeIn">
          <p className="text-slate-600 text-base font-medium">Unable to load profile.</p>
          <button
            onClick={fetchProfile}
            className="mt-4 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 hover:shadow-md hover:scale-102 transition-all duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 py-8">
      <div className="w-full p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-8 mb-8 shadow-xl text-white">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center mb-2">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl mr-4 shadow-lg inline-block">
                <AcademicCapIcon className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">Your Profile</h1>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <p className="text-white text-lg font-medium drop-shadow mt-2 sm:mt-0">Manage your account details</p>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg hover:from-blue-600 hover:to-indigo-700 hover:shadow-2xl hover:scale-105 transition-all duration-200"
                >
                  <PencilIcon className="h-4 w-4 mr-1 text-white" />
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-600 animate-fadeIn">
            {error}
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-slate-200 p-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex-shrink-0 text-center sm:text-left">
              <div className="relative inline-block mb-4 sm:mb-0">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto sm:mx-0">
                  {isEditing ? (
                    <input
                      type="url"
                      value={editForm.avatar}
                      onChange={(e) => setEditForm({ ...editForm, avatar: e.target.value })}
                      className="w-full text-center border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50"
                      placeholder="Avatar URL"
                    />
                  ) : profile.avatar ? (
                    <img
                      src={profile.avatar}
                      alt={profile.name}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-10 h-10 text-blue-600" />
                  )}
                </div>
                {isEditing && (
                  <button
                    className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full hover:bg-blue-700 transition-all duration-200"
                    title="Change avatar"
                  >
                    <CameraIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1">
              <div className="text-center sm:text-left mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50"
                      placeholder="Your name"
                    />
                  ) : (
                    profile.name
                  )}
                </h2>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-blue-800 mt-2">
                  <AcademicCapIcon className="h-4 w-4 mr-1" />
                  Student
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Email</p>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50"
                      placeholder="your.email@example.com"
                    />
                  ) : (
                    <p className="text-sm text-slate-800 flex items-center">
                      <EnvelopeIcon className="h-4 w-4 mr-1 text-blue-600" />
                      {profile.email}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Student ID</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.studentId}
                      onChange={(e) => setEditForm({ ...editForm, studentId: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 font-mono"
                      placeholder="e.g., 2024001"
                    />
                  ) : (
                    <p className="text-sm text-slate-800 flex items-center font-mono">
                      {profile.studentId || 'N/A'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Year of Study</p>
                  {isEditing ? (
                    <select
                      value={editForm.year}
                      onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50"
                    >
                      <option value="">Select Year</option>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                      <option value="5">5th Year</option>
                    </select>
                  ) : (
                    <p className="text-sm text-slate-800 flex items-center">
                      {profile.year || 'N/A'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Account Status</p>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      profile.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {profile.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Member Since</p>
                  <p className="text-sm text-slate-800 flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1 text-blue-600" />
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Last Login</p>
                  <p className="text-sm text-slate-800 flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1 text-blue-600" />
                    {new Date(profile.lastLogin).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {isEditing && (
                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end">
                  <button
                    onClick={handleCancel}
                    className="px-6 py-2 text-sm font-medium text-slate-600 bg-white/80 border border-slate-200 rounded-lg hover:bg-white hover:shadow-md transition-all duration-200"
                  >
                    <XMarkIcon className="h-4 w-4 mr-1 inline" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 hover:shadow-md hover:scale-102 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {saving ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </div>
                    ) : (
                      <>
                        <CheckIcon className="h-4 w-4 mr-1 inline" />
                        Save
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;