import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  BellIcon,
  UserCircleIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline';
import { useSocket } from '../../contexts/SocketContext';

const Header: React.FC<{ onMobileMenuToggle?: () => void }> = ({ onMobileMenuToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { notifications, setNotifications } = useSocket();
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', credentials: 'include' });
    } catch {}
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700/90 backdrop-blur-xl shadow-xl border-b border-white/10">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20 relative">
          {/* Left: Logo & Hamburger */}
          <div className="flex items-center gap-4">
            {onMobileMenuToggle && (
              <button
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white focus:outline-none"
                onClick={onMobileMenuToggle}
                aria-label="Open sidebar menu"
              >
                <Bars3Icon className="h-7 w-7" />
              </button>
            )}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/') }>
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg tracking-widest">EP</span>
              </div>
              <span className="ml-1 text-2xl font-extrabold text-white drop-shadow-lg tracking-tight">ExamProctor</span>
            </div>
          </div>

          {/* Center: (Optional) Navigation or Search */}
          {/* <div className="hidden md:flex items-center gap-6">
            <a href="/dashboard" className="text-white/80 hover:text-white font-semibold transition">Dashboard</a>
            <a href="/dashboard/classrooms" className="text-white/80 hover:text-white font-semibold transition">Classrooms</a>
          </div> */}

          {/* Right: Notification & User */}
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <div className="relative">
              <button
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 relative"
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Show notifications"
              >
                <BellIcon className="h-7 w-7" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>
              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto">
                  <div className="p-4 border-b font-bold text-gray-700 flex justify-between items-center">
                    <span>Notifications</span>
                    <button
                      className="text-xs text-blue-600 hover:underline"
                      onClick={() => { setShowNotifications(false); navigate('/notifications'); }}
                    >
                      View all
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-4 text-gray-500">No notifications</div>
                  ) : (
                    notifications.slice(0, 20).map(n => (
                      <div
                        key={n._id}
                        className={`px-4 py-3 border-b last:border-b-0 cursor-pointer hover:bg-blue-50 ${n.read ? 'bg-white' : 'bg-blue-50'}`}
                        onClick={() => handleNotificationClick(n._id || '')}
                      >
                        <div className="font-semibold text-gray-800">{n.type.charAt(0).toUpperCase() + n.type.slice(1)}</div>
                        <div className="text-gray-700 text-sm">{n.message}</div>
                        <div className="text-xs text-gray-400 mt-1">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                className="flex items-center gap-2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white focus:outline-none"
                onClick={() => setShowUserMenu(!showUserMenu)}
                aria-label="User menu"
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover border-2 border-white/30" />
                ) : (
                  <UserCircleIcon className="h-9 w-9 text-white/80" />
                )}
                <span className="hidden md:inline font-semibold text-white/90">{user?.name || 'User'}</span>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50">
                  <div className="p-4 border-b font-bold text-gray-700">Account</div>
                  <button
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 text-gray-700 font-semibold"
                    onClick={() => { setShowUserMenu(false); navigate('/dashboard/profile'); }}
                  >
                    <CogIcon className="h-5 w-5 mr-2 inline-block text-blue-500" /> Profile & Settings
                  </button>
                  <button
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 text-gray-700 font-semibold"
                    onClick={() => { setShowUserMenu(false); logout(); }}
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2 inline-block text-red-500" /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 