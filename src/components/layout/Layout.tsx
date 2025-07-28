import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout: React.FC = () => {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const handleMobileMenuToggle = () => {
    setShowMobileSidebar(!showMobileSidebar);
  };

  const handleMobileMenuClose = () => {
    setShowMobileSidebar(false);
  };

  return (
    <div className="flex h-screen bg-secondary-50">
      {/* Collapsible Sidebar (all screens) */}
      <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-xl h-full transform transition-transform duration-300 ease-in-out ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar />
      </div>

      {/* Overlay when sidebar is open */}
      {showMobileSidebar && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50" onClick={handleMobileMenuClose} />
      )}

      <div className="flex-1 flex flex-col overflow-hidden bg-secondary-50">
        <Header onMobileMenuToggle={handleMobileMenuToggle} />
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen p-6 sm:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout; 