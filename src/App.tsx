import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ProctorProvider } from './contexts/ProctorContext';
import PrivateRoute from './components/auth/PrivateRoute';
import LandingPage from './pages/LandingPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';
import ExamList from './pages/exam/ExamList';
import CreateExam from './pages/exam/CreateExam';
import TakeExam from './pages/exam/TakeExam';
import FullScreenExam from './pages/exam/FullScreenExam';
import SequentialExam from './pages/exam/SequentialExam';
import PublicExam from './pages/exam/PublicExam';
import ProctorExam from './pages/proctor/ProctorExam';
import Results from './pages/Results';
import InstructorResults from './pages/InstructorResults';
import AdminDashboard from './pages/admin/AdminDashboard';
import InstructorDashboard from './pages/InstructorDashboard';
import UserManagement from './pages/admin/UserManagement';
import SystemSettings from './pages/admin/SystemSettings';
import Classroom from './pages/Classroom';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Layout from './components/layout/Layout';
import './App.css';
import ForgotPassword from './pages/auth/ForgotPassword';
import VerifyOTP from './pages/auth/VerifyOTP';
import ResetPassword from './pages/auth/ResetPassword';
import QuizEditor from './pages/admin/QuizEditor';
import UniversityRegistration from './pages/UniversityRegistration';
import UniversityDashboard from './pages/university/UniversityDashboard';
import UniversityProfile from './pages/university/UniversityProfile';
import StudentDashboard from './pages/StudentDashboard';
import FirstTimeProfile from './pages/FirstTimeProfile';
import ExamLanding from './pages/exam/ExamLanding';
import apiService from './services/api';
import NotificationCenter from './pages/NotificationCenter';
import CreateAnnouncement from './pages/university/CreateAnnouncement';
import EditAnnouncement from './pages/university/EditAnnouncement';
import { useAuth } from './contexts/AuthContext';
import UniversityClassrooms from './pages/university/UniversityClassrooms';
import UniversityClassroomChat from './pages/university/UniversityClassroomChat';
import SuperAdminMfaVerify from './pages/superadmin/SuperAdminMfaVerify';
import SuperAdminSettings from './pages/superadmin/SuperAdminSettings';
import SuperAdminLogs from './pages/superadmin/SuperAdminLogs';
import MFASetup from './pages/superadmin/MFASetup';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';

// Removed ThemeContext, useTheme, getSystemTheme, and ThemeProvider

const isSuperAdminAuthenticated = () => {
  return !!localStorage.getItem('superadmin_token');
};

const SuperAdminProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  return isSuperAdminAuthenticated() ? children : <Navigate to="/superadmin/login" />;
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ProctorProvider>
          {/* Removed ThemeProvider */}
          <Router>
            <div className="min-h-screen bg-secondary-50">
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/university-registration" element={<UniversityRegistration />} />
                <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                <Route path="/auth/verify-otp" element={<VerifyOTP />} />
                <Route path="/auth/reset-password" element={<ResetPassword />} />
                <Route path="/exam/:examId" element={<ExamLanding />} />
                <Route path="/exam/:examId/sequential" element={<SequentialExam />} />
                <Route path="/notifications" element={<NotificationCenter />} />
                
                {/* Protected routes */}
                <Route path="/dashboard" element={<PrivateRoute><Layout /></PrivateRoute>}>
                  <Route index element={<Dashboard />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="student" element={<StudentDashboard />} />
                  <Route path="teacher" element={<InstructorDashboard />} />
                  <Route path="instructor" element={<InstructorDashboard />} />
                  <Route path="admin" element={<AdminDashboard />} />
                  <Route path="exams" element={<ExamList />} />
                  <Route path="exams/create" element={<CreateExam />} />
                  <Route path="exams/create/:examId" element={<CreateExam />} />
                  <Route path="exams/:examId/take" element={<TakeExam />} />
                  <Route path="exams/:examId/fullscreen" element={<FullScreenExam />} />
                  <Route path="exams/:examId/proctor" element={<ProctorExam />} />
                  <Route path="exams/:examId/edit" element={<QuizEditor />} />
                  <Route path="proctor" element={<ProctorExam />} />
                  <Route path="results" element={<Results />} />
                  <Route path="instructor-results" element={<InstructorResults />} />
                  <Route path="classrooms" element={<Classroom />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="settings" element={<Settings />} />
                  
                  {/* Admin routes */}
                  <Route path="admin/users" element={<UserManagement />} />
                  <Route path="admin/settings" element={<SystemSettings />} />
                  
                  {/* University routes */}
                  <Route path="university" element={<UniversityDashboard />} />
                  <Route path="university/classrooms" element={<UniversityClassrooms />} />
                  <Route path="university/classrooms/:id" element={<UniversityClassroomChat />} />
                  <Route path="university/profile" element={<UniversityProfile />} />
                  <Route path="/dashboard/university/create-announcement" element={<CreateAnnouncement />} />
                  <Route path="university/edit-announcement/:id" element={<EditAnnouncement />} />
                  <Route path="university/notifications" element={<NotificationCenter />} />
                </Route>
                
                {/* First-time profile route */}
                <Route path="/first-time-profile" element={<PrivateRoute><FirstTimeProfile /></PrivateRoute>} />

                {/* SuperAdmin routes */}
                <Route path="/superadmin/mfa-setup" element={<SuperAdminProtectedRoute><MFASetup /></SuperAdminProtectedRoute>} />
                <Route path="/superadmin/dashboard" element={<SuperAdminProtectedRoute><SuperAdminDashboard /></SuperAdminProtectedRoute>} />
                <Route path="/superadmin/mfa-verify" element={<SuperAdminMfaVerify />} />
                <Route path="/superadmin/settings" element={<SuperAdminProtectedRoute><SuperAdminSettings /></SuperAdminProtectedRoute>} />
                <Route path="/superadmin/logs" element={<SuperAdminProtectedRoute><SuperAdminLogs /></SuperAdminProtectedRoute>} />
              </Routes>
            </div>
          </Router>
        </ProctorProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
