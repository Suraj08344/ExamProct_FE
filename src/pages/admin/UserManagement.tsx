import React, { useState } from 'react';
import {
  UserGroupIcon,
  UserPlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ShieldCheckIcon,
  AcademicCapIcon,
  UserIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  DocumentArrowDownIcon,
  KeyIcon
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: 'admin' | 'teacher' | 'student';
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  lastLogin?: string;
  examsTaken: number;
  examsCreated: number;
  totalScore: number;
  averageScore: number;
  permissions: string[];
  profileImage?: string;
  department?: string;
  studentId?: string;
  teacherId?: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);



  React.useEffect(() => {
    const mockUsers: User[] = [
      {
        id: '1',
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@university.edu',
        phone: '+1 (555) 123-4567',
        role: 'teacher',
        status: 'active',
        createdAt: '2023-09-15T10:00:00',
        lastLogin: '2024-01-15T08:30:00',
        examsTaken: 0,
        examsCreated: 12,
        totalScore: 0,
        averageScore: 0,
        permissions: ['create_exam', 'view_results', 'manage_students'],
        department: 'Computer Science'
      },
      {
        id: '2',
        firstName: 'Maria',
        lastName: 'Garcia',
        email: 'maria.garcia@student.edu',
        phone: '+1 (555) 234-5678',
        role: 'student',
        status: 'active',
        createdAt: '2023-10-20T14:30:00',
        lastLogin: '2024-01-15T09:15:00',
        examsTaken: 8,
        examsCreated: 0,
        totalScore: 720,
        averageScore: 90.0,
        permissions: ['take_exam', 'view_own_results'],
        studentId: 'STU001'
      },
      {
        id: '3',
        firstName: 'David',
        lastName: 'Johnson',
        email: 'david.johnson@university.edu',
        phone: '+1 (555) 345-6789',
        role: 'admin',
        status: 'active',
        createdAt: '2023-08-10T09:00:00',
        lastLogin: '2024-01-15T07:45:00',
        examsTaken: 0,
        examsCreated: 0,
        totalScore: 0,
        averageScore: 0,
        permissions: ['all'],
        department: 'IT Administration'
      },
      {
        id: '4',
        firstName: 'Sarah',
        lastName: 'Wilson',
        email: 'sarah.wilson@student.edu',
        phone: '+1 (555) 456-7890',
        role: 'student',
        status: 'active',
        createdAt: '2023-11-05T16:20:00',
        lastLogin: '2024-01-14T15:30:00',
        examsTaken: 6,
        examsCreated: 0,
        totalScore: 540,
        averageScore: 90.0,
        permissions: ['take_exam', 'view_own_results'],
        studentId: 'STU002'
      },
      {
        id: '5',
        firstName: 'Michael',
        lastName: 'Brown',
        email: 'michael.brown@university.edu',
        phone: '+1 (555) 567-8901',
        role: 'teacher',
        status: 'inactive',
        createdAt: '2023-09-25T11:15:00',
        lastLogin: '2024-01-10T10:20:00',
        examsTaken: 0,
        examsCreated: 8,
        totalScore: 0,
        averageScore: 0,
        permissions: ['create_exam', 'view_results'],
        department: 'Mathematics'
      }
    ];
    setUsers(mockUsers);
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.studentId && user.studentId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.teacherId && user.teacherId.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <ShieldCheckIcon className="h-4 w-4" />;
      case 'teacher': return <AcademicCapIcon className="h-4 w-4" />;
      case 'student': return <UserIcon className="h-4 w-4" />;
      default: return <UserGroupIcon className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'teacher': return 'bg-blue-100 text-blue-800';
      case 'student': return 'bg-green-100 text-green-800';
      default: return 'bg-secondary-100 text-secondary-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-yellow-100 text-yellow-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-secondary-100 text-secondary-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircleIcon className="h-4 w-4" />;
      case 'inactive': return <ExclamationTriangleIcon className="h-4 w-4" />;
      case 'suspended': return <XCircleIcon className="h-4 w-4" />;
      default: return <ExclamationTriangleIcon className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
    }
  };

  const deleteUser = (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      setUsers(prev => prev.filter(user => user.id !== userId));
    }
  };



  const exportUsers = () => {
    const data = selectedUsers.length > 0 
      ? users.filter(u => selectedUsers.includes(u.id))
      : users;
    console.log('Exporting users:', data);
    alert('User data exported successfully!');
  };

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'active').length,
    teachers: users.filter(u => u.role === 'teacher').length,
    students: users.filter(u => u.role === 'student').length,
    admins: users.filter(u => u.role === 'admin').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900">User Management</h1>
          <p className="text-secondary-600 mt-2">
            Manage users, roles, and permissions across the platform.
          </p>
        </div>
        <div className="flex space-x-2 mt-4 sm:mt-0">
          <button
            className="btn-primary inline-flex items-center"
          >
            <UserPlusIcon className="h-4 w-4 mr-2" />
            Add User
          </button>
          <button
            onClick={exportUsers}
            className="btn-secondary inline-flex items-center"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-600">Total Users</p>
              <p className="text-2xl font-semibold text-secondary-900">{stats.totalUsers}</p>
            </div>
            <div className="p-3 bg-blue-500 rounded-lg">
              <UserGroupIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-600">Active Users</p>
              <p className="text-2xl font-semibold text-secondary-900">{stats.activeUsers}</p>
            </div>
            <div className="p-3 bg-green-500 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-600">Teachers</p>
              <p className="text-2xl font-semibold text-secondary-900">{stats.teachers}</p>
            </div>
            <div className="p-3 bg-blue-500 rounded-lg">
              <AcademicCapIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-600">Students</p>
              <p className="text-2xl font-semibold text-secondary-900">{stats.students}</p>
            </div>
                         <div className="p-3 bg-green-500 rounded-lg">
               <UserIcon className="h-6 w-6 text-white" />
             </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-600">Admins</p>
              <p className="text-2xl font-semibold text-secondary-900">{stats.admins}</p>
            </div>
            <div className="p-3 bg-red-500 rounded-lg">
              <ShieldCheckIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" />
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-secondary-400" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="input-field"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-secondary-200">
            <thead className="bg-secondary-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-secondary-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-secondary-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-secondary-200 flex items-center justify-center">
                        <span className="text-sm font-medium text-secondary-600">
                          {user.firstName[0]}{user.lastName[0]}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-secondary-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-secondary-500">{user.email}</div>
                        {user.studentId && (
                          <div className="text-xs text-secondary-400">ID: {user.studentId}</div>
                        )}
                        {user.teacherId && (
                          <div className="text-xs text-secondary-400">ID: {user.teacherId}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                        {getRoleIcon(user.role)}
                        <span className="ml-1 capitalize">{user.role}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                      {getStatusIcon(user.status)}
                      <span className="ml-1 capitalize">{user.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                    <div>
                      {user.role === 'student' && (
                        <div>Exams: {user.examsTaken} • Avg: {user.averageScore}%</div>
                      )}
                      {user.role === 'teacher' && (
                        <div>Created: {user.examsCreated} exams</div>
                      )}
                      {user.lastLogin && (
                        <div className="text-xs">Last: {formatDate(user.lastLogin)}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        className="text-secondary-600 hover:text-secondary-900"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <UserGroupIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-900 mb-2">No users found</h3>
            <p className="text-secondary-600">
              {searchTerm || filterRole !== 'all' || filterStatus !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'No users are registered yet.'
              }
            </p>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-secondary-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-secondary-900">
                  User Details - {selectedUser.firstName} {selectedUser.lastName}
                </h2>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-secondary-400 hover:text-secondary-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-medium text-secondary-900 mb-3">Basic Information</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Name:</span> {selectedUser.firstName} {selectedUser.lastName}</p>
                    <p><span className="font-medium">Email:</span> {selectedUser.email}</p>
                    {selectedUser.phone && (
                      <p><span className="font-medium">Phone:</span> {selectedUser.phone}</p>
                    )}
                    <p><span className="font-medium">Role:</span> 
                      <span className={`ml-2 inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(selectedUser.role)}`}>
                        {getRoleIcon(selectedUser.role)}
                        <span className="ml-1 capitalize">{selectedUser.role}</span>
                      </span>
                    </p>
                    <p><span className="font-medium">Status:</span> 
                      <span className={`ml-2 inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedUser.status)}`}>
                        {getStatusIcon(selectedUser.status)}
                        <span className="ml-1 capitalize">{selectedUser.status}</span>
                      </span>
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-secondary-900 mb-3">Account Information</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Created:</span> {formatDate(selectedUser.createdAt)}</p>
                    {selectedUser.lastLogin && (
                      <p><span className="font-medium">Last Login:</span> {formatDate(selectedUser.lastLogin)}</p>
                    )}
                    {selectedUser.department && (
                      <p><span className="font-medium">Department:</span> {selectedUser.department}</p>
                    )}
                    {selectedUser.studentId && (
                      <p><span className="font-medium">Student ID:</span> {selectedUser.studentId}</p>
                    )}
                    {selectedUser.teacherId && (
                      <p><span className="font-medium">Teacher ID:</span> {selectedUser.teacherId}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Activity Stats */}
              <div className="bg-secondary-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-secondary-900 mb-3">Activity Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-secondary-900">{selectedUser.examsTaken}</div>
                    <div className="text-sm text-secondary-600">Exams Taken</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-secondary-900">{selectedUser.examsCreated}</div>
                    <div className="text-sm text-secondary-600">Exams Created</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-secondary-900">{selectedUser.totalScore}</div>
                    <div className="text-sm text-secondary-600">Total Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-secondary-900">{selectedUser.averageScore}%</div>
                    <div className="text-sm text-secondary-600">Average Score</div>
                  </div>
                </div>
              </div>

              {/* Permissions */}
              <div>
                <h3 className="text-lg font-medium text-secondary-900 mb-3">Permissions</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedUser.permissions.map((permission, index) => (
                    <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800">
                      <KeyIcon className="h-3 w-3 mr-1" />
                      {permission.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-secondary-200">
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="btn-secondary"
                >
                  Close
                </button>
                <button
                  className="btn-primary"
                >
                  Edit User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement; 