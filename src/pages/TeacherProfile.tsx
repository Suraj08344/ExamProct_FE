import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import {
  UserIcon, EnvelopeIcon, AcademicCapIcon, CalendarIcon, PencilIcon, CameraIcon, CheckIcon, XMarkIcon, BookOpenIcon, TrophyIcon, ClockIcon
} from '@heroicons/react/24/outline';

const TeacherProfile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    avatar: '',
    department: ''
  });

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await apiService.users.getProfile();
      if (response.success) {
        setProfile(response.data);
        setEditForm({
          name: response.data.name,
          email: response.data.email,
          avatar: response.data.avatar || '',
          department: response.data.department || ''
        });
      }
    } catch (error) { console.error('Error fetching profile:', error); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await apiService.users.updateProfile(editForm);
      if (response.success) {
        setProfile(response.data);
        setIsEditing(false);
        updateUser(response.data);
        alert('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Please try again.');
    } finally { setSaving(false); }
  };

  const handleCancel = () => {
    setEditForm({
      name: profile?.name || '',
      email: profile?.email || '',
      avatar: profile?.avatar || '',
      department: profile?.department || ''
    });
    setIsEditing(false);
  };

  if (loading) return (<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>);
  if (!profile) return (<div className="text-center py-12"><p className="text-gray-500">Unable to load profile</p></div>);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Teacher Profile</h1>
            <p className="text-gray-600">Manage your teacher account information</p>
          </div>
          {!isEditing && (
            <button onClick={() => setIsEditing(true)} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700">
              <PencilIcon className="h-4 w-4 mr-2" /> Edit Profile
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="relative inline-block">
                <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  {profile.avatar ? (<img src={profile.avatar} alt={profile.name} className="w-24 h-24 rounded-full object-cover" />) : (<UserIcon className="w-12 h-12 text-primary-600" />)}
                </div>
                {isEditing && (<button className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full hover:bg-primary-700"><CameraIcon className="w-4 h-4" /></button>)}
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {isEditing ? (<input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="text-center border border-gray-300 rounded-md px-2 py-1 focus:ring-primary-500 focus:border-primary-500" />) : (profile.name)}
              </h2>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"><AcademicCapIcon className="w-4 h-4 mr-1" />Teacher</span>
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-1">Email</p>
                {isEditing ? (<input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500" />) : (<p className="text-sm text-gray-900 flex items-center justify-center"><EnvelopeIcon className="w-4 h-4 mr-1" />{profile.email}</p>)}
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-1">Department</p>
                {isEditing ? (<input type="text" value={editForm.department} onChange={e => setEditForm({ ...editForm, department: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500" placeholder="e.g., Computer Science" />) : (<p className="text-sm text-gray-900 flex items-center justify-center font-mono">{profile.department || 'N/A'}</p>)}
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-1">Account Status</p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${profile.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{profile.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-1">Member Since</p>
                <p className="text-sm text-gray-900 flex items-center justify-center"><CalendarIcon className="w-4 h-4 mr-1" />{new Date(profile.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-1">Last Login</p>
                <p className="text-sm text-gray-900 flex items-center justify-center"><ClockIcon className="w-4 h-4 mr-1" />{new Date(profile.lastLogin).toLocaleDateString()}</p>
              </div>
              {isEditing && (<div className="mt-6 flex space-x-2"><button onClick={handleSave} disabled={saving} className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50">{saving ? (<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>) : (<><CheckIcon className="w-4 h-4 mr-1" />Save</>)}</button><button onClick={handleCancel} className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"><XMarkIcon className="w-4 h-4 mr-1" />Cancel</button></div>)}
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-4"><div className="flex items-center"><div className="p-2 bg-blue-100 rounded-lg"><BookOpenIcon className="w-6 h-6 text-green-600" /></div><div className="ml-4"><p className="text-sm font-medium text-gray-500">Classrooms</p><p className="text-2xl font-semibold text-gray-900">{profile.totalClassrooms || 0}</p></div></div></div>
            <div className="bg-white rounded-lg shadow p-4"><div className="flex items-center"><div className="p-2 bg-green-100 rounded-lg"><TrophyIcon className="w-6 h-6 text-purple-600" /></div><div className="ml-4"><p className="text-sm font-medium text-gray-500">Total Exams</p><p className="text-2xl font-semibold text-gray-900">{profile.totalExams || 0}</p></div></div></div>
            <div className="bg-white rounded-lg shadow p-4"><div className="flex items-center"><div className="p-2 bg-purple-100 rounded-lg"><AcademicCapIcon className="w-6 h-6 text-blue-600" /></div><div className="ml-4"><p className="text-sm font-medium text-gray-500">Total Students</p><p className="text-2xl font-semibold text-gray-900">{profile.totalStudents || 0}</p></div></div></div>
          </div>
          <div className="bg-white rounded-lg shadow p-6"><h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><p className="text-sm font-medium text-gray-500">User ID</p><p className="text-sm text-gray-900 font-mono">{profile._id}</p></div><div><p className="text-sm font-medium text-gray-500">Role</p><p className="text-sm text-gray-900">Teacher</p></div><div><p className="text-sm font-medium text-gray-500">Account Created</p><p className="text-sm text-gray-900">{new Date(profile.createdAt).toLocaleString()}</p></div><div><p className="text-sm font-medium text-gray-500">Last Activity</p><p className="text-sm text-gray-900">{new Date(profile.lastLogin).toLocaleString()}</p></div></div></div>
        </div>
      </div>
    </div>
  );
};

export default TeacherProfile; 