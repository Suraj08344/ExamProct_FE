import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ClockIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  UserIcon,
  LockClosedIcon,
  VideoCameraIcon,
  MicrophoneIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface University {
  name: string;
}

interface Instructor {
  name: string;
}

interface ExamInfo {
  _id: string;
  title: string;
  description: string;
  duration: number;
  totalQuestions: number;
  startTime: string;
  endTime: string;
  university: University;
  instructor: Instructor;
}

const ExamLanding: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { user, login, register } = useAuth();
  
  const [examInfo, setExamInfo] = useState<ExamInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Authentication states
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  
  // Proctoring permissions
  const [permissions, setPermissions] = useState({
    camera: false,
    microphone: false,
    screenShare: false,
  });
  const [showPermissions, setShowPermissions] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Load exam info
  useEffect(() => {
    const loadExamInfo = async () => {
      if (!examId) return;
      
      try {
        setIsLoading(true);
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://examproctor-backend-e6mh.onrender.com/api'}/exams/${examId}/public`);
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to load exam');
        }
        
        setExamInfo(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load exam');
      } finally {
        setIsLoading(false);
      }
    };

    loadExamInfo();
  }, [examId]);

  // Handle authentication
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError(null);

    try {
      if (authMode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name, 'student');
      }
      
      // Close auth modal and show permissions
      setShowAuthModal(false);
      setShowPermissions(true);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Request proctoring permissions
  const requestPermissions = async () => {
    setPermissionError(null);
    
    try {
      // Request camera permission
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setPermissions(prev => ({ ...prev, camera: true }));
      cameraStream.getTracks().forEach(track => track.stop());

      // Request microphone permission
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissions(prev => ({ ...prev, microphone: true }));
      micStream.getTracks().forEach(track => track.stop());

      // Request screen share permission (this will be requested when actually sharing)
      setPermissions(prev => ({ ...prev, screenShare: true }));

      // All permissions granted, start exam
      navigate(`/exam/${examId}/sequential`);
    } catch (err) {
      setPermissionError('Camera and microphone permissions are required for proctoring. Please allow access and try again.');
    }
  };

  // Skip permissions (for testing)
  const skipPermissions = () => {
    navigate(`/exam/${examId}/sequential`);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins} minutes`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading exam information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg">
          <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Exam Not Available</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!examInfo) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="w-full p-4 sm:p-6 lg:p-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AcademicCapIcon className="h-8 w-8 text-indigo-600" />
              <h1 className="text-xl font-bold text-gray-900">Online Exam Proctor</h1>
            </div>
            {user && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <UserIcon className="h-4 w-4" />
                <span>{user.name}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full p-4 sm:p-6 lg:p-8 py-8">
        {/* Exam Info Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
            <h1 className="text-2xl font-bold text-white">{examInfo.title}</h1>
            <p className="text-indigo-100 mt-1">{examInfo.description}</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Exam Details */}
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-gray-900">Exam Details</h3>
                
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-0.5">
                    <ClockIcon className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Duration</p>
                    <p className="text-sm text-gray-600">{formatDuration(examInfo.duration)}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-0.5">
                    <DocumentTextIcon className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Questions</p>
                    <p className="text-sm text-gray-600">{examInfo.totalQuestions} questions</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-0.5">
                    <AcademicCapIcon className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Institution</p>
                    <p className="text-sm text-gray-600">{examInfo.university?.name || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-0.5">
                    <UserIcon className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Instructor</p>
                    <p className="text-sm text-gray-600">{examInfo.instructor?.name || 'N/A'}</p>
                  </div>
                </div>
              </div>
              
              {/* Time Window */}
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-gray-900">Exam Window</h3>
                
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Starts</p>
                      <p className="text-sm text-gray-600">{formatDateTime(examInfo.startTime)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="h-5 w-5 rounded-full bg-red-100 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-red-500"></div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Ends</p>
                      <p className="text-sm text-gray-600">{formatDateTime(examInfo.endTime)}</p>
                    </div>
                  </div>
                </div>
                
                {/* Proctoring Notice */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Proctored Exam</p>
                      <p className="text-sm text-amber-700 mt-1">
                        This exam requires camera and microphone access for proctoring. Please ensure your device supports these features.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              {!user ? (
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => {
                      setAuthMode('login');
                      setShowAuthModal(true);
                    }}
                    className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-2 shadow-sm"
                  >
                    <LockClosedIcon className="h-5 w-5" />
                    <span>Login to Start Exam</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setAuthMode('register');
                      setShowAuthModal(true);
                    }}
                    className="flex-1 bg-white text-indigo-600 border border-indigo-600 px-6 py-3 rounded-lg font-medium hover:bg-indigo-50 transition-colors flex items-center justify-center space-x-2 shadow-sm"
                  >
                    <UserIcon className="h-5 w-5" />
                    <span>Create Account</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowPermissions(true)}
                  className="w-full bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center space-x-2 shadow-sm"
                >
                  <ArrowRightIcon className="h-5 w-5" />
                  <span>Start Exam Now</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Authentication Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {authMode === 'login' ? 'Sign In' : 'Create Account'}
                </h2>
                <p className="text-gray-600 mt-1">
                  {authMode === 'login' 
                    ? 'Enter your credentials to start the exam'
                    : 'Create an account to take this exam'
                  }
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  setAuthError(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="Enter your full name"
                  />
                </div>
              )}
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="Enter your email"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-10 transition-colors"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              
              {authError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600 flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                    {authError}
                  </p>
                </div>
              )}
              
              <div className="flex flex-col space-y-3">
                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {isAuthLoading ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    authMode === 'login' ? 'Sign In' : 'Create Account'
                  )}
                </button>
              </div>
            </form>
            
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
                  setAuthError(null);
                }}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                {authMode === 'login' 
                  ? "Don't have an account? Create one"
                  : 'Already have an account? Sign in'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermissions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Proctoring Requirements</h2>
                <p className="text-gray-600 mt-1">
                  This exam requires access to your camera and microphone for proctoring purposes.
                </p>
              </div>
              <button
                onClick={() => setShowPermissions(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <VideoCameraIcon className="h-6 w-6 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Camera Access</p>
                  <p className="text-sm text-gray-600">Required for face monitoring</p>
                </div>
                {permissions.camera ? (
                  <CheckCircleIcon className="h-6 w-6 text-emerald-500" />
                ) : (
                  <XCircleIcon className="h-6 w-6 text-gray-400" />
                )}
              </div>
              
              <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <MicrophoneIcon className="h-6 w-6 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Microphone Access</p>
                  <p className="text-sm text-gray-600">Required for audio monitoring</p>
                </div>
                {permissions.microphone ? (
                  <CheckCircleIcon className="h-6 w-6 text-emerald-500" />
                ) : (
                  <XCircleIcon className="h-6 w-6 text-gray-400" />
                )}
              </div>
              
              <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <ComputerDesktopIcon className="h-6 w-6 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Screen Share</p>
                  <p className="text-sm text-gray-600">May be requested during exam</p>
                </div>
                {permissions.screenShare ? (
                  <CheckCircleIcon className="h-6 w-6 text-emerald-500" />
                ) : (
                  <XCircleIcon className="h-6 w-6 text-gray-400" />
                )}
              </div>
            </div>
            
            {permissionError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-600 flex items-center">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                  {permissionError}
                </p>
              </div>
            )}
            
            <div className="flex flex-col space-y-3">
              <button
                onClick={requestPermissions}
                className="w-full bg-emerald-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center space-x-2"
              >
                <ArrowRightIcon className="h-5 w-5" />
                <span>Grant Permissions & Start Exam</span>
              </button>
              
              <button
                onClick={skipPermissions}
                className="w-full bg-gray-100 text-gray-700 py-2.5 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Skip Permissions (Not Recommended)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamLanding;