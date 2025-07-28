import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import UniversityDashboard from './university/UniversityDashboard';
import StudentDashboard from './StudentDashboard';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    // Role-based routing
    if (user.role === 'university') {
      // University admins stay on this page (UniversityDashboard will be rendered)
      return;
    } else if (user.role === 'student') {
      // Students get redirected to student dashboard
      navigate('/dashboard/student', { replace: true });
      return;
    } else if (user.role === 'teacher') {
      // Teachers get redirected to teacher dashboard
      navigate('/dashboard/teacher', { replace: true });
      return;
    } else if (user.role === 'instructor') {
      // Instructors get redirected to instructor dashboard
      navigate('/dashboard/instructor', { replace: true });
      return;
    } else if (user.role === 'admin') {
      // Admins get redirected to admin dashboard
      navigate('/dashboard/admin', { replace: true });
      return;
    }
  }, [user, navigate]);

  // Show loading while determining role
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Render appropriate dashboard based on role
  if (user.role === 'university') {
    return <UniversityDashboard />;
  }

  // For other roles, show a loading state (they should be redirected)
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );
};

export default Dashboard; 