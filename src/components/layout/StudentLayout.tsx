import React from 'react';

interface StudentLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const StudentLayout: React.FC<StudentLayoutProps> = ({ title, subtitle, children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100">
      {/* Hero/Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-b-3xl shadow-xl mb-10">
        <div className="absolute inset-0 bg-black opacity-10" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 drop-shadow-lg">{title}</h1>
            {subtitle && <p className="text-blue-100 text-lg font-medium drop-shadow">{subtitle}</p>}
          </div>
          {/* You can add a slot for actions or avatar here if needed */}
        </div>
      </div>
      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        {children}
      </div>
    </div>
  );
};

export default StudentLayout; 