import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  HomeIcon,
  DocumentTextIcon,
  PlusCircleIcon,
  VideoCameraIcon,
  ChartBarIcon,
  UserGroupIcon,
  CogIcon,
  UsersIcon,
  ShieldCheckIcon,
  ChartBarIcon as AnalyticsIcon,
  DocumentDuplicateIcon,
  AcademicCapIcon,
  TrophyIcon,
  UserIcon
} from '@heroicons/react/24/outline';

interface SidebarProps {
  onNavigate?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
  const { user } = useAuth();

  // Student navigation
  const studentNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Classrooms', href: '/dashboard/classrooms', icon: AcademicCapIcon },
    { name: 'My Exams', href: '/dashboard/exams', icon: DocumentTextIcon },
    { name: 'My Results', href: '/dashboard/results', icon: ChartBarIcon },
  ];

  // Instructor navigation
  const instructorNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Classrooms', href: '/dashboard/classrooms', icon: AcademicCapIcon },
    { name: 'Exams', href: '/dashboard/exams', icon: DocumentTextIcon },
    { name: 'Create Exam', href: '/dashboard/exams/create', icon: PlusCircleIcon },
    { name: 'Proctor', href: '/dashboard/proctor', icon: VideoCameraIcon },
    { name: 'Results', href: '/dashboard/instructor-results', icon: TrophyIcon },
  ];

  // Admin navigation
  const adminNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Classrooms', href: '/dashboard/classrooms', icon: AcademicCapIcon },
    { name: 'Exams', href: '/dashboard/exams', icon: DocumentTextIcon },
    { name: 'Create Exam', href: '/dashboard/exams/create', icon: PlusCircleIcon },
    { name: 'Proctor', href: '/dashboard/proctor', icon: VideoCameraIcon },
    { name: 'Results', href: '/dashboard/results', icon: ChartBarIcon },
    { name: 'Admin Dashboard', href: '/dashboard/admin', icon: ShieldCheckIcon },
    { name: 'User Management', href: '/dashboard/admin/users', icon: UsersIcon },
    { name: 'Quiz Management', href: '/dashboard/admin/quizzes', icon: DocumentDuplicateIcon },
    { name: 'Analytics', href: '/dashboard/admin/analytics', icon: AnalyticsIcon },
    { name: 'System Settings', href: '/dashboard/admin/settings', icon: CogIcon },
  ];

  // Select navigation based on user role
  let navigation = studentNavigation; // default
  if (user?.role === 'instructor' || user?.role === 'teacher' || user?.role === 'university') {
    navigation = instructorNavigation;
  } else if (user?.role === 'admin') {
    navigation = adminNavigation;
  }

  const handleNavClick = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <div className="w-full h-full bg-white shadow-lg flex flex-col">
      {/* User Info */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="h-10 w-10 rounded-full"
              />
            ) : (
              <AcademicCapIcon className="h-6 w-6 text-primary-600" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <nav className="mt-5 flex-1 px-2 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-primary-100 text-primary-900'
                    : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
                }`
              }
            >
              <item.icon
                className="mr-3 h-5 w-5 flex-shrink-0"
                aria-hidden="true"
              />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Exam Proctor v1.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 