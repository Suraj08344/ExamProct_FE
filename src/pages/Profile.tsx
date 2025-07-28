import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import StudentProfile from './StudentProfile';
import TeacherProfile from './TeacherProfile';
import { useNavigate } from 'react-router-dom';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  React.useEffect(() => {
    if (user?.role === 'university') {
      navigate('/dashboard/university/profile', { replace: true });
    }
  }, [user, navigate]);
  if (!user) return null;
  if (user.role === 'student') return <StudentProfile />;
  if (user.role === 'teacher' || user.role === 'instructor') return <TeacherProfile />;
  // For university, redirect will happen above
  return <div className="text-center py-12 text-gray-500">No profile available for this role.</div>;
};

export default Profile; 