import React from 'react';
import {
  AcademicCapIcon,
  UserGroupIcon,
  ChartBarIcon,
  BellIcon,
  PlusCircleIcon,
  MegaphoneIcon,
  ArrowDownTrayIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import * as XLSX from 'xlsx';

// MetricCard component (copied from InstructorDashboard)
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  gradient: string;
  subtitle?: string;
  link?: string;
  trend?: { value: number; isPositive: boolean };
}> = ({ title, value, icon: Icon, gradient, subtitle, link, trend }) => {
  const content = (
    <div className={`relative overflow-hidden rounded-2xl p-6 transition-transform transition-shadow duration-200 ease-out hover:scale-105 hover:shadow-2xl will-change-transform ${gradient} group cursor-pointer`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-32 h-32 transform rotate-12 translate-x-8 -translate-y-8">
          <Icon className="w-full h-full" />
        </div>
      </div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <Icon className="h-6 w-6 text-white" />
          </div>
          {trend && (
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
              trend.isPositive ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'
            }`}>
              {trend.isPositive ? (
                <ArrowTrendingUpIcon className="h-3 w-3" />
              ) : (
                <ArrowTrendingDownIcon className="h-3 w-3" />
              )}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <div className="mb-2">
          <p className="text-4xl font-bold text-white mb-1">{value}</p>
          <p className="text-white/80 text-sm font-medium">{title}</p>
        </div>
        {subtitle && (
          <p className="text-white/60 text-xs">{subtitle}</p>
        )}
      </div>
      {/* Hover Effect */}
      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
  if (link) {
    return <a href={link}>{content}</a>;
  }
  return content;
};

const UniversityDashboard: React.FC = () => {
  const [userTab, setUserTab] = useState<'teachers' | 'students'>('teachers');
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [bulkRole, setBulkRole] = useState<'teacher' | 'student'>('teacher');
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkColumns, setBulkColumns] = useState<string[]>([]);
  const [bulkRows, setBulkRows] = useState<any[]>([]);
  const [bulkNameCol, setBulkNameCol] = useState('');
  const [bulkEmailCol, setBulkEmailCol] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userPasswords, setUserPasswords] = useState<{[key: string]: string}>({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<any>(null);
  const navigate = useNavigate();
  const { socket } = useSocket();
  const userList = userTab === 'teachers' ? teachers : students;

  useEffect(() => {
    const token = localStorage.getItem('token');
    // Fetch stats
    fetch('/api/university/stats', {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setStats(data.data);
      });
    // Fetch users
    fetch('/api/university/users', {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
      if (data.success) {
          setTeachers(data.data.filter((u: any) => u.role === 'teacher'));
          setStudents(data.data.filter((u: any) => u.role === 'student'));
          // Recent activity: last 5 users created
          setRecentActivity(data.data.slice(0, 5).map((u: any) => ({
            id: u._id,
            type: u.role,
            name: u.name,
            action: u.role === 'teacher' ? 'Teacher added' : 'Student registered',
            date: new Date(u.createdAt).toLocaleDateString()
          })));
        }
      });
    // Fetch all admin announcements for dashboard
    fetch('/api/notifications/my-announcements', {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setAnnouncements(data.data);
      });
    if (socket) {
      const handler = (announcement: any) => {
        setAnnouncements(prev => [announcement, ...prev]);
      };
      socket.on('announcement', handler);
      return () => { socket.off('announcement', handler); };
    }
  }, [socket]);

  // Add user handler
  const handleAddUser = async () => {
    setAddLoading(true);
    setAddError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/university/add-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({ 
          ...addForm,
          role: userTab === 'teachers' ? 'teacher' : 'student',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setAddForm({ name: '', email: '' });
        // Refresh users and stats
        fetch('/api/university/users', {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setTeachers(data.data.filter((u: any) => u.role === 'teacher'));
              setStudents(data.data.filter((u: any) => u.role === 'student'));
            }
          });
        fetch('/api/university/stats', {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) setStats(data.data);
          });
      } else {
        setAddError(data.error || 'Failed to add user');
      }
    } catch (err: any) {
      setAddError(err.message || 'Failed to add user');
    } finally {
      setAddLoading(false);
  }
  };

  // New: Toggle user status
  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const token = localStorage.getItem('token');
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await fetch('/api/university/toggle-user-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      credentials: 'include',
      body: JSON.stringify({ userId, status: newStatus })
    });
    // Refresh users and stats
    fetch('/api/university/users', {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
      if (data.success) {
          setTeachers(data.data.filter((u: any) => u.role === 'teacher'));
          setStudents(data.data.filter((u: any) => u.role === 'student'));
        }
      });
    fetch('/api/university/stats', {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setStats(data.data);
      });
  };
  // New: Delete user
  const handleDeleteUser = async (userId: string) => {
    const token = localStorage.getItem('token');
    await fetch('/api/university/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      credentials: 'include',
      body: JSON.stringify({ userId })
    });
    // Refresh users and stats
    fetch('/api/university/users', {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTeachers(data.data.filter((u: any) => u.role === 'teacher'));
          setStudents(data.data.filter((u: any) => u.role === 'student'));
        }
      });
    fetch('/api/university/stats', {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setStats(data.data);
      });
  };

  // Bulk upload handlers
  const handleBulkFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setBulkFile(file || null);
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        if (rows.length > 0) {
          setBulkColumns(rows[0] as string[]);
          setBulkRows(rows.slice(1).map((r: any[]) => {
            const obj: any = {};
            (rows[0] as string[]).forEach((col, idx) => { obj[col] = r[idx]; });
            return obj;
          }));
        }
      };
      reader.readAsArrayBuffer(file);
      } else {
      setBulkColumns([]);
      setBulkRows([]);
    }
  };
  const handleBulkUpload = async () => {
    if (!bulkNameCol || !bulkEmailCol || bulkRows.length === 0) return;
    setBulkLoading(true);
    setBulkErrors([]);
    const token = localStorage.getItem('token');
    const mappedRows = bulkRows.map(row => ({
      name: row[bulkNameCol],
      email: row[bulkEmailCol],
      role: bulkRole
    }));
    const res = await fetch('/api/university/bulk-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      credentials: 'include',
      body: JSON.stringify({ mappedRows, columns: [bulkNameCol, bulkEmailCol] })
    });
    const data = await res.json();
    setShowBulkUpload(false);
    setBulkFile(null);
    setBulkColumns([]);
    setBulkRows([]);
    setBulkNameCol('');
    setBulkEmailCol('');
    setBulkLoading(false);
    // Show errors if any
    if (data.errors && data.errors.length > 0) {
      setBulkErrors(data.errors);
    }
    // Refresh users and stats
    fetch('/api/university/users', {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
      if (data.success) {
          setTeachers(data.data.filter((u: any) => u.role === 'teacher'));
          setStudents(data.data.filter((u: any) => u.role === 'student'));
        }
      });
    fetch('/api/university/stats', {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setStats(data.data);
      });
  };

  // Bulk delete selected users
  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) return;
    const token = localStorage.getItem('token');
    await fetch('/api/university/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      credentials: 'include',
      body: JSON.stringify({ userIds: selectedUsers })
    });
    setSelectedUsers([]);
    // Refresh users and stats
    fetch('/api/university/users', {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
      if (data.success) {
          setTeachers(data.data.filter((u: any) => u.role === 'teacher'));
          setStudents(data.data.filter((u: any) => u.role === 'student'));
        }
      });
    fetch('/api/university/stats', {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setStats(data.data);
      });
  };

  // Bulk activate/deactivate selected users
  const handleBulkStatus = async (status: 'active' | 'inactive') => {
    if (selectedUsers.length === 0) return;
    const token = localStorage.getItem('token');
    await fetch('/api/university/bulk-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      credentials: 'include',
      body: JSON.stringify({ userIds: selectedUsers, status })
    });
    setSelectedUsers([]);
    // Refresh users and stats
    fetch('/api/university/users', {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
      if (data.success) {
          setTeachers(data.data.filter((u: any) => u.role === 'teacher'));
          setStudents(data.data.filter((u: any) => u.role === 'student'));
        }
      });
    fetch('/api/university/stats', {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setStats(data.data);
      });
  };

  // Checkbox handlers
  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };
  const handleSelectAll = () => {
    if (selectedUsers.length === userList.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(userList.map(u => u._id));
    }
  };

  // Download default passwords handler
  const handleDownloadPasswords = (role: 'teacher' | 'student') => {
    const token = localStorage.getItem('token');
    fetch(`/api/university/download-accounts?role=${role}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    })
      .then(async res => {
        if (!res.ok) throw new Error('Failed to download file');
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${role}-accounts.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => {
        alert('Failed to download file.');
      });
  };

  // Download sample file handler
  const handleDownloadSampleFile = () => {
    // Create sample data for teachers
    const teacherSampleData = [
      { name: 'John Smith', email: 'john.smith@university.edu' },
      { name: 'Sarah Johnson', email: 'sarah.johnson@university.edu' },
      { name: 'Michael Brown', email: 'michael.brown@university.edu' },
      { name: 'Emily Davis', email: 'emily.davis@university.edu' },
      { name: 'David Wilson', email: 'david.wilson@university.edu' }
    ];

    // Create sample data for students
    const studentSampleData = [
      { name: 'Alice Johnson', email: 'alice.johnson@student.university.edu' },
      { name: 'Bob Williams', email: 'bob.williams@student.university.edu' },
      { name: 'Carol Garcia', email: 'carol.garcia@student.university.edu' },
      { name: 'Daniel Martinez', email: 'daniel.martinez@student.university.edu' },
      { name: 'Eva Rodriguez', email: 'eva.rodriguez@student.university.edu' }
    ];

    // Create workbook with both sheets
    const workbook = XLSX.utils.book_new();
    
    // Add teacher sample sheet
    const teacherWorksheet = XLSX.utils.json_to_sheet(teacherSampleData);
    XLSX.utils.book_append_sheet(workbook, teacherWorksheet, 'Teachers Sample');
    
    // Add student sample sheet
    const studentWorksheet = XLSX.utils.json_to_sheet(studentSampleData);
    XLSX.utils.book_append_sheet(workbook, studentWorksheet, 'Students Sample');

    // Add instructions sheet
    const instructionsData = [
      { instruction: 'File Format Instructions' },
      { instruction: '' },
      { instruction: '1. The file must be in Excel format (.xlsx)' },
      { instruction: '2. Required columns: "name" and "email"' },
      { instruction: '3. Column names are case-sensitive' },
      { instruction: '4. Email addresses must be valid format' },
      { instruction: '5. Names should be full names (first and last name)' },
      { instruction: '' },
      { instruction: 'Example format:' },
      { instruction: 'name | email' },
      { instruction: 'John Smith | john.smith@university.edu' },
      { instruction: 'Sarah Johnson | sarah.johnson@university.edu' },
      { instruction: '' },
      { instruction: 'Notes:' },
      { instruction: '- All users will be created with default password: "password123"' },
      { instruction: '- Users can change their password after first login' },
      { instruction: '- Duplicate email addresses will be skipped' },
      { instruction: '- Invalid email formats will be rejected' }
    ];
    
    const instructionsWorksheet = XLSX.utils.json_to_sheet(instructionsData);
    XLSX.utils.book_append_sheet(workbook, instructionsWorksheet, 'Instructions');

    // Generate and download the file
    const fileName = 'bulk_upload_sample.xlsx';
    XLSX.writeFile(workbook, fileName);
  };

  // Delete announcement handler
  const handleDeleteAnnouncement = async (id: string) => {
    const token = localStorage.getItem('token');
    await fetch(`/api/notifications/announcements/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });
    setAnnouncements(prev => prev.filter(a => a._id !== id));
  };

  const handleViewPassword = async (user: any) => {
    setSelectedUserForPassword(user);
    setShowPasswordModal(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/university/user-password/${user._id}`, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserPasswords(prev => ({
          ...prev,
          [user._id]: data.password || 'N/A'
        }));
      } else {
        setUserPasswords(prev => ({
          ...prev,
          [user._id]: 'N/A'
        }));
      }
    } catch (error) {
      console.error('Error fetching password:', error);
      setUserPasswords(prev => ({
        ...prev,
        [user._id]: 'N/A'
      }));
    }
  };

    return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-100 to-purple-100 p-4 sm:p-8 pb-16 mb-16">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-10 mb-12 shadow-xl text-white">
        <div className="absolute inset-0 bg-black opacity-10 rounded-2xl"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center mb-2">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl mr-4 shadow-lg inline-block">
              <AcademicCapIcon className="h-10 w-10 text-white" />
      </div>
            <div>
              <h1 className="text-4xl font-bold text-white drop-shadow-lg">University Admin Dashboard</h1>
              <p className="text-blue-100 text-lg">{`Welcome${stats.universityName ? ', ' + stats.universityName : ''}! Manage your institution, classrooms, and announcements with ease.`}</p>
              <div className="flex items-center mt-4 space-x-4 text-sm">
                <span className="flex items-center">
                  <BellIcon className="h-4 w-4 mr-1" />
                  {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
                <span className="flex items-center">
                  <ChartBarIcon className="h-4 w-4 mr-1" />
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
        </div>
              </div>
          </div>
          <div className="mt-6 lg:mt-0 flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate('/dashboard/university/create-announcement')}
              className="inline-flex items-center px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg transition-all duration-200 flex items-center transform hover:scale-105 focus:scale-105"
            >
              <PlusCircleIcon className="h-5 w-5 mr-2" />
              Create Announcement
            </button>
            <button
              className="inline-flex items-center px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg transition-all duration-200 flex items-center transform hover:scale-105 focus:scale-105"
              onClick={() => navigate('/dashboard/university/notifications')}
            >
              <BellIcon className="h-5 w-5 mr-2" />
              Notifications
            </button>
              </div>
            </div>
          </div>
          
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <MetricCard
          title="Total Students"
          value={stats.totalStudents ?? '--'}
          icon={UsersIcon}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
          subtitle="Registered in your university"
        />
        <MetricCard
          title="Total Teachers"
          value={stats.totalTeachers ?? '--'}
          icon={AcademicCapIcon}
          gradient="bg-gradient-to-br from-purple-500 to-purple-600"
          subtitle="Faculty members"
        />
        <MetricCard
          title="Active Users"
          value={stats.activeUsers ?? '--'}
          icon={ChartBarIcon}
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
          subtitle="Currently active"
        />
        <MetricCard
          title="Announcements"
          value={announcements.length}
          icon={MegaphoneIcon}
          gradient="bg-gradient-to-br from-amber-500 to-amber-600"
          subtitle="Total announcements"
        />
          </div>
          
      {/* Announcements & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
        {/* Announcements */}
        <div className="bg-white/80 rounded-2xl shadow-2xl border border-white/30 p-8 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Announcements</h2>
            <button className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 text-base" onClick={() => navigate('/dashboard/university/create-announcement')}>
              + New
            </button>
              </div>
          <div style={{ maxHeight: 350, overflowY: 'auto' }} className="space-y-6">
            {announcements.length === 0 ? (
              <div className="py-6 text-gray-500">No announcements yet.</div>
            ) : (
              announcements.map((a: any) => (
                <div key={a._id} className="relative bg-white rounded-xl shadow border border-gray-100 p-6 flex flex-col gap-2 hover:shadow-lg transition-all">
                  <div className="flex items-center gap-3 mb-1">
                    <MegaphoneIcon className="h-6 w-6 text-pink-500" />
                    <span className="font-semibold text-gray-800 text-lg">{a.title}</span>
                    <span className="ml-auto text-xs text-gray-400">{new Date(a.createdAt).toLocaleDateString()}</span>
              </div>
                  <div className="text-gray-700 text-base mb-1">{a.content}</div>
                  <div className="text-xs text-gray-400 mb-2">By Admin</div>
                  <div className="flex gap-2 mt-2">
                    <button className="px-4 py-1 bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200 text-sm" onClick={() => navigate(`/dashboard/university/edit-announcement/${a._id}`)}>Edit</button>
                    <button className="px-4 py-1 bg-rose-100 text-rose-700 rounded-lg font-semibold hover:bg-rose-200 text-sm" onClick={() => handleDeleteAnnouncement(a._id)}>Delete</button>
            </div>
          </div>
              ))
            )}
              </div>
              </div>
        {/* Recent Activity */}
        <div className="bg-white/80 rounded-2xl shadow-2xl border border-white/30 p-8 backdrop-blur-xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>
          <ul className="divide-y divide-gray-200" style={{ maxHeight: 350, overflowY: 'auto' }}>
            {recentActivity.length === 0 ? (
              <li className="py-6 text-gray-500">No recent activity.</li>
            ) : (
              recentActivity.map(a => (
                <li key={a.id} className="py-6 flex items-center gap-4">
                  {a.type === 'student' && <UserGroupIcon className="h-6 w-6 text-blue-500" />}
                  {a.type === 'teacher' && <AcademicCapIcon className="h-6 w-6 text-purple-500" />}
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800 text-lg">{a.name}</div>
                    <div className="text-base text-gray-600">{a.action}</div>
            </div>
                  <div className="text-xs text-gray-400">{a.date}</div>
                </li>
              ))
            )}
          </ul>
          </div>
        </div>

      {/* Teacher & Student Management */}
      <div className="mt-12 bg-white/80 rounded-3xl shadow-2xl border border-white/30 p-10 backdrop-blur-xl flex flex-col" style={{ height: 1000, overflow: 'hidden' }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8">
          <div className="flex gap-3">
            <button
              className={`px-6 py-2 rounded-xl font-bold transition-all text-lg ${userTab === 'teachers' ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border border-blue-200'}`}
              onClick={() => setUserTab('teachers')}
            >
              Teachers
            </button>
            <button
              className={`px-6 py-2 rounded-xl font-bold transition-all text-lg ${userTab === 'students' ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border border-blue-200'}`}
              onClick={() => setUserTab('students')}
            >
              Students
            </button>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold hover:from-blue-600 hover:to-purple-700 text-lg" onClick={() => setShowAddModal(true)}>
              + Add {userTab === 'teachers' ? 'Teacher' : 'Student'}
                </button>
            <button className="px-6 py-2 bg-blue-100 text-blue-700 rounded-xl font-bold hover:bg-blue-200 flex items-center gap-2 text-lg" onClick={() => setShowBulkUpload(true)}>
              <PlusCircleIcon className="h-6 w-6" /> Bulk Upload
                        </button>
            <button className="px-6 py-2 bg-purple-100 text-purple-700 rounded-xl font-bold hover:bg-purple-200 flex items-center gap-2 text-lg" onClick={() => setShowDownloadModal(true)}>
              <ArrowDownTrayIcon className="h-6 w-6" /> Download Default Passwords
                        </button>
            </div>
          </div>
        {/* Add Teacher/Student Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white/95 rounded-3xl shadow-2xl p-10 w-full max-w-lg border border-white/30 backdrop-blur-2xl">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Add {userTab === 'teachers' ? 'Teacher' : 'Student'}</h2>
              <div className="mb-6">
                    <input
                  className="w-full px-5 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4 text-lg"
                  placeholder="Name"
                  value={addForm.name}
                  onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                  disabled={addLoading}
                />
                      <input
                  className="w-full px-5 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg"
                  placeholder="Email"
                  value={addForm.email}
                  onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                  disabled={addLoading}
                />
                {addError && <div className="text-red-500 text-base mt-3">{addError}</div>}
                      </div>
              <div className="flex gap-3 justify-end">
                <button className="px-6 py-2 bg-gray-200 rounded-xl font-bold hover:bg-gray-300 text-lg" onClick={() => setShowAddModal(false)} disabled={addLoading}>Cancel</button>
                <button className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 text-lg" onClick={handleAddUser} disabled={addLoading || !addForm.name || !addForm.email}>{addLoading ? 'Adding...' : 'Add'}</button>
          </div>
        </div>
                </div>
              )}
        {/* Bulk Upload Modal */}
        {showBulkUpload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white/95 rounded-3xl shadow-2xl w-full max-w-lg border border-white/30 backdrop-blur-2xl relative z-60 flex flex-col items-center justify-center p-0">
              <div className="flex flex-col w-full max-h-[80vh] overflow-y-auto p-10 gap-4">
                <h2 className="text-3xl font-extrabold mb-2 text-gray-900 text-center">Bulk Upload</h2>
                <p className="mb-2 text-gray-600 text-lg text-center">Upload an Excel file to add multiple users at once.</p>
                
                {/* Sample File Download Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-blue-900 mb-1">Need a sample file?</h3>
                      <p className="text-blue-700 text-sm">Download a sample Excel file to see the correct format</p>
                    </div>
                    <button 
                      onClick={() => handleDownloadSampleFile()}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      Download Sample
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block mb-2 font-semibold">Role for all users:</label>
                  <select className="w-full px-4 py-2 rounded-xl border border-gray-300 mb-4 focus:ring-2 focus:ring-blue-400" value={bulkRole} onChange={e => setBulkRole(e.target.value as 'teacher' | 'student')}>
                    <option value="teacher">Teacher</option>
                    <option value="student">Student</option>
                  </select>
                  <input type="file" accept=".xlsx,.xls,.csv" className="mb-4 w-full" onChange={handleBulkFile} />
                  {bulkColumns.length > 0 && (
                    <div className="mb-4">
                      <label className="block mb-1 font-semibold">Map Name column:</label>
                      <select className="w-full px-4 py-2 rounded-xl border border-gray-300 mb-2 focus:ring-2 focus:ring-blue-400" value={bulkNameCol} onChange={e => setBulkNameCol(e.target.value)}>
                        <option value="">Select column</option>
                        {bulkColumns.map(col => <option key={col} value={col}>{col}</option>)}
                      </select>
                      <label className="block mb-1 font-semibold">Map Email column:</label>
                      <select className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-400" value={bulkEmailCol} onChange={e => setBulkEmailCol(e.target.value)}>
                        <option value="">Select column</option>
                        {bulkColumns.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>
                  )}
                </div>
                </div>
              <div className="flex gap-3 justify-end w-full px-10 pb-8 pt-2 bg-white/95 rounded-b-3xl border-t border-gray-100">
                <button className="px-6 py-2 bg-gray-200 rounded-xl font-bold hover:bg-gray-300 text-lg" onClick={() => setShowBulkUpload(false)} disabled={bulkLoading}>Cancel</button>
                <button className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 text-lg" onClick={handleBulkUpload} disabled={bulkLoading || !bulkNameCol || !bulkEmailCol || bulkRows.length === 0}>{bulkLoading ? 'Uploading...' : 'Upload'}</button>
                </div>
                </div>
                  </div>
                )}
        {/* Download Default Passwords Modal */}
        {showDownloadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white/95 rounded-3xl shadow-2xl w-full max-w-md border border-white/30 backdrop-blur-2xl p-0 flex flex-col items-center justify-center">
              <div className="flex flex-col w-full p-10 gap-4 items-center justify-center">
                <h2 className="text-2xl font-bold mb-2 text-gray-900 text-center">Download Default Passwords</h2>
                <p className="mb-4 text-gray-600 text-lg text-center">Export a list of users with their default passwords.</p>
                <div className="flex gap-4 mb-6 w-full justify-center">
                  <button className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 text-lg w-1/2" onClick={() => handleDownloadPasswords('teacher')}>Teachers</button>
                  <button className="px-6 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 text-lg w-1/2" onClick={() => handleDownloadPasswords('student')}>Students</button>
                </div>
                <div className="flex gap-3 justify-end w-full">
                  <button className="px-6 py-2 bg-gray-200 rounded-xl font-bold hover:bg-gray-300 text-lg w-full" onClick={() => setShowDownloadModal(false)}>Close</button>
            </div>
          </div>
                </div>
                </div>
              )}
        {/* Bulk Upload Errors Modal */}
        {bulkErrors.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white/95 rounded-3xl shadow-2xl p-8 w-full max-w-lg border border-white/30 backdrop-blur-2xl">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">Bulk Upload Completed</h2>
              <p className="mb-4 text-gray-700">Some users could not be added or updated:</p>
              <ul className="mb-6 max-h-60 overflow-y-auto text-red-600 text-base list-disc pl-6">
                {bulkErrors.map((err, idx) => <li key={idx}>{err}</li>)}
              </ul>
              <div className="flex gap-3 justify-end">
                <button className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 text-lg" onClick={() => setBulkErrors([])}>Close</button>
                </div>
                    </div>
                    </div>
        )}
        
        {/* Password View Modal */}
        {showPasswordModal && selectedUserForPassword && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white/95 rounded-3xl shadow-2xl w-full max-w-md border border-white/30 backdrop-blur-2xl p-0 flex flex-col items-center justify-center">
              <div className="flex flex-col w-full p-10 gap-4 items-center justify-center">
                <h2 className="text-2xl font-bold mb-2 text-gray-900 text-center">User Password</h2>
                <div className="w-full bg-gray-50 rounded-xl p-6 text-center">
                  <p className="text-gray-600 text-sm mb-2">Password for:</p>
                  <p className="text-lg font-semibold text-gray-900 mb-4">{selectedUserForPassword.name}</p>
                  <p className="text-gray-600 text-sm mb-2">Email:</p>
                  <p className="text-sm text-gray-700 mb-4">{selectedUserForPassword.email}</p>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-600 text-sm mb-1">Password:</p>
                    <p className={`text-lg font-mono font-bold ${
                      userPasswords[selectedUserForPassword._id] === 'N/A' 
                        ? 'text-gray-500' 
                        : 'text-green-600'
                    }`}>
                      {userPasswords[selectedUserForPassword._id] || 'Loading...'}
                    </p>
                    {userPasswords[selectedUserForPassword._id] === 'N/A' && (
                      <p className="text-xs text-gray-500 mt-1">Password has been changed by user</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 justify-end w-full">
                  <button 
                    className="px-6 py-2 bg-gray-200 rounded-xl font-bold hover:bg-gray-300 text-lg w-full" 
                    onClick={() => {
                      setShowPasswordModal(false);
                      setSelectedUserForPassword(null);
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Bulk Action Bar */}
        {selectedUsers.length > 0 && (
          <div className="fixed left-0 right-0 bottom-0 z-40 flex items-center justify-center bg-gradient-to-r from-blue-100 to-purple-100 border-t border-blue-200 py-4 shadow-xl animate-fade-in">
            <div className="flex gap-4">
              <button className="px-6 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 text-lg" onClick={handleBulkDelete}>
                Delete Selected ({selectedUsers.length})
              </button>
              <button className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 text-lg" onClick={() => handleBulkStatus('active')}>
                Activate Selected
              </button>
              <button className="px-6 py-2 bg-yellow-500 text-white rounded-xl font-bold hover:bg-yellow-600 text-lg" onClick={() => handleBulkStatus('inactive')}>
                Deactivate Selected
              </button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto flex-1 mb-8" style={{ minHeight: 0 }}>
          <table className="w-full divide-y divide-gray-200 rounded-2xl overflow-hidden">
            <thead className="bg-gradient-to-r from-blue-100 to-purple-100">
              <tr>
                <th className="px-2 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <input type="checkbox" checked={selectedUsers.length === userList.length && userList.length > 0} onChange={handleSelectAll} />
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Name</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Email</th>
                <th className="px-2 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-2 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Password</th>
                <th className="px-2 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
            <tbody className="bg-white/70 divide-y divide-gray-100">
              {userList.map(u => (
                <tr key={u._id} className="hover:bg-blue-50 transition-all text-xs">
                  <td className="px-2 py-3 whitespace-nowrap">
                    <input type="checkbox" checked={selectedUsers.includes(u._id)} onChange={() => handleSelectUser(u._id)} />
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap font-semibold text-gray-900 max-w-28 truncate" title={u.name}>{u.name}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-gray-700 max-w-36 truncate" title={u.email}>{u.email}</td>
                  <td className="px-2 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{u.status}</span>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap">
                    <button
                      onClick={() => handleViewPassword(u)}
                      className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs font-semibold transition-colors"
                    >
                      View
                    </button>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap flex gap-1">
                  <button
                      className={`px-1.5 py-0.5 rounded text-xs font-semibold ${u.status === 'active' ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                      onClick={() => handleToggleStatus(u._id, u.status)}
                  >
                      {u.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                      className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-xs font-semibold"
                      onClick={() => handleDeleteUser(u._id)}
                  >
                      Delete
                  </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
                </div>
      </div>
    </div>
  );
};

export default UniversityDashboard; 