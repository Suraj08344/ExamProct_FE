import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BuildingLibraryIcon,
  Cog6ToothIcon,
  DocumentMagnifyingGlassIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';

const navItems = [
  { to: '/superadmin/dashboard', label: 'Universities', icon: BuildingLibraryIcon },
  { to: '/superadmin/logs', label: 'Logs', icon: DocumentMagnifyingGlassIcon },
  { to: '/superadmin/settings', label: 'Settings', icon: Cog6ToothIcon }
];

const SuperAdminSidebar: React.FC = () => {
  const location = useLocation();
  return (
    <nav className="h-full flex flex-col justify-between items-center py-6 bg-white/60 backdrop-blur-lg shadow-2xl rounded-r-3xl border-r border-white/20">
      <div className="flex flex-col gap-6 items-center w-full flex-1">
        {navItems.map(item => {
          const isActive = location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive: navActive }) =>
                `group relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 ${
                  navActive || isActive
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg text-white'
                    : 'hover:bg-indigo-100 text-indigo-400'
                }`
              }
              title={item.label}
            >
              <item.icon className="h-6 w-6" />
              {/* Active indicator bar */}
              {(isActive) && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-indigo-500 rounded-full" />
              )}
            </NavLink>
          );
        })}
      </div>
      {/* Profile/avatar at the bottom */}
      <div className="flex flex-col items-center gap-2 mt-8 mb-2">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg">
          <UserCircleIcon className="h-7 w-7 text-white" />
        </div>
        <span className="text-xs text-indigo-400 font-semibold mt-1">SuperAdmin</span>
      </div>
    </nav>
  );
};

export default SuperAdminSidebar; 