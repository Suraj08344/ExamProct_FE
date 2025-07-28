import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import { 
  CalendarIcon, 
  ClockIcon, 
  AcademicCapIcon, 
  TrophyIcon,
  ChartBarIcon,
  UserGroupIcon,
  VideoCameraIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  PlayIcon,
  BellIcon,
  MegaphoneIcon
} from '@heroicons/react/24/outline';

interface Test {
  _id: string;
  title: string;
  description: string;
  examId: {
    _id: string;
    title: string;
    description: string;
    duration: number;
  };
  classroomId: {
    _id: string;
    name: string;
    subject: string;
  };
  scheduledDate: string;
  duration: number;
  isActive: boolean;
}

interface Result {
  _id: string;
  examId: {
    title: string;
  };
  score: number;
  totalQuestions: number;
  submittedAt: string;
}

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [upcomingTests, setUpcomingTests] = useState<Test[]>([]);
  const [recentResults, setRecentResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProctorModal, setShowProctorModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [proctorSetup, setProctorSetup] = useState({
    webcamPermission: false,
    microphonePermission: false,
    screenSharePermission: false,
    tabSwitchWarning: false,
    fullscreenMode: false,
    externalMonitorDetected: false,
    externalMonitorRemoved: false
  });
  const [setupStep, setSetupStep] = useState(1);
  const [setupLoading, setSetupLoading] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const { socket } = useSocket();

  // Helper function to check device compatibility
  const checkDeviceCompatibility = () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isChrome = /Chrome/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isFirefox = /Firefox/.test(navigator.userAgent);
    
    const compatibility = {
      isMobile,
      isIOS,
      isAndroid,
      isChrome,
      isSafari,
      isFirefox,
      hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      hasGetDisplayMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
      isHTTPS: window.location.protocol === 'https:',
      isLocalhost: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    };

    console.log('Device compatibility check:', compatibility);
    return compatibility;
  };

  // Helper function to get browser-specific guidance
  const getBrowserGuidance = () => {
    const compat = checkDeviceCompatibility();
    
    if (!compat.hasGetUserMedia) {
      return 'Your browser does not support camera/microphone access. Please use a modern browser like Chrome, Firefox, or Safari.';
    }
    
    if (compat.isMobile && !compat.isHTTPS && !compat.isLocalhost) {
      return 'Mobile browsers require HTTPS for camera access. Please access this site via HTTPS or use a desktop browser.';
    }
    
    if (compat.isIOS) {
      return 'On iOS devices, make sure to:\n1. Use Safari browser\n2. Allow camera and microphone permissions\n3. Access via HTTPS';
    }
    
    if (compat.isAndroid) {
      return 'On Android devices, make sure to:\n1. Use Chrome browser\n2. Allow camera and microphone permissions\n3. Access via HTTPS';
    }
    
    return 'Please ensure your browser has permission to access camera and microphone.';
  };

  // Helper to get all results (only first attempts are stored now)
  const getAllResults = (results: any[]) => {
    return results.filter(result => {
      const examId = result.examId?._id || result.examId;
      return examId; // Only filter out results with missing examId
    });
  };

  useEffect(() => {
    fetchData();
    // Fetch only university announcements for the Announcements section
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch('https://examproctor-backend-e6mh.onrender.com/api/notifications/my-announcements', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        });
        const data = await res.json();
        if (data.success) setAnnouncements(data.data);
      } catch (err) {
        setAnnouncements([]);
      }
    };
    fetchAnnouncements();
    if (socket) {
      const handler = (announcement: any) => {
        setAnnouncements(prev => [announcement, ...prev]);
      };
      socket.on('announcement', handler);
      return () => { socket.off('announcement', handler); };
    }
  }, [socket]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch student's classrooms
      const classroomsRes = await apiService.classroom.getStudentClassrooms();
      setClassrooms(classroomsRes.data || []);
      
      // Fetch upcoming tests
      const testsRes = await apiService.tests.getUpcomingTests();
      setUpcomingTests(testsRes.data || []);
      
      // Fetch recent results
      const resultsRes = await apiService.results.getUserResults();
      const resultsData = resultsRes.data || [];
      
      // Filter out results for deleted exams (examId missing/null)
      const filteredResults = resultsData.filter((result: any) => result.examId && result.examId._id);
      
      // Transform the data to include calculated fields
      const transformedResults = filteredResults.map((result: any) => {
        let maxScore = result.examId?.maxScore;
        if (!maxScore && Array.isArray(result.answers) && result.answers.length > 0) {
          maxScore = result.answers.reduce((sum: number, a: any) => sum + (a.points || 1), 0);
        }
        if (!maxScore) {
          maxScore = result.totalQuestions || 1;
        }
        if (!maxScore || isNaN(maxScore) || maxScore <= 0) maxScore = 1;
        const correctAnswers = Array.isArray(result.answers)
          ? result.answers.filter((a: any) => a.isCorrect).length
          : undefined;
        const score = result.totalScore || result.score || 0;
        const percentage = maxScore > 0 ? Math.min((score / maxScore) * 100, 100) : 0;
        return {
          ...result,
          totalQuestions: result.examId?.totalQuestions || (result.answers ? result.answers.length : 0),
          score,
          maxScore,
          correctAnswers,
          percentage,
        };
      });
      
      // Get all results (only first attempts are stored now)
      const allResults = getAllResults(transformedResults);
      
      // After transforming results, filter to only completed results
      const completedResults = allResults.filter((result: any) => result.status === 'completed');
      setRecentResults(completedResults);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAttemptTest = (test: Test) => {
    // Check if student has already submitted this exam
    const hasSubmitted = recentResults.some((result: any) => 
      (result.examId && result.examId._id) === (test.examId?._id) || 
      (result.examId && result.examId._id) === (test.examId?._id)
    );
    
    if (hasSubmitted) {
      alert('You have already completed this exam. You cannot attempt it again.');
      return;
    }
    
    setSelectedTest(test);
    setShowProctorModal(true);
    setSetupStep(1);
    setProctorSetup({
      webcamPermission: false,
      microphonePermission: false,
      screenSharePermission: false,
      tabSwitchWarning: false,
      fullscreenMode: false,
      externalMonitorDetected: false,
      externalMonitorRemoved: false
    });
  };

  const requestWebcamPermission = async () => {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }

      // Check if we're on HTTPS (required for mobile browsers)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        throw new Error('HTTPS is required for camera access on mobile devices');
      }

      // Check available devices first
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        throw new Error('No camera devices found');
      }

      console.log('Available video devices:', videoDevices);

      // Try to get user media with different constraints for better mobile compatibility
      let stream;
      try {
        // First try with basic constraints
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            facingMode: 'user' // Prefer front camera on mobile
          } 
        });
      } catch (basicError) {
        console.log('Basic constraints failed, trying minimal constraints:', basicError);
        // Fallback to minimal constraints
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: true 
        });
      }

      // Verify we actually got a video track
      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack) {
        throw new Error('No video track available');
      }

      console.log('Video track obtained:', {
        label: videoTrack.label,
        settings: videoTrack.getSettings(),
        capabilities: videoTrack.getCapabilities()
      });

      // Stop the stream immediately after verification
      stream.getTracks().forEach(track => track.stop());
      
      setProctorSetup(prev => ({ ...prev, webcamPermission: true }));
      setSetupStep(2);
    } catch (error: any) {
      console.error('Webcam permission error:', error);
      
      let errorMessage = 'Webcam access is required for this exam. ';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += 'Please allow camera access in your browser settings and try again.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage += 'No camera found. Please ensure your device has a camera and try again.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage += 'Camera is in use by another application. Please close other apps using the camera and try again.';
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        errorMessage += 'Camera does not meet requirements. Please try again or use a different device.';
      } else if (error.message.includes('HTTPS')) {
        errorMessage = 'HTTPS is required for camera access on mobile devices. Please access this site via HTTPS.';
      } else if (error.message.includes('getUserMedia is not supported')) {
        errorMessage = 'Camera access is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.';
      } else {
        errorMessage += 'Please check your camera permissions and try again.';
      }

      // Show a more detailed error for debugging
      const detailedError = `
Error Details:
- Name: ${error.name}
- Message: ${error.message}
- Browser: ${navigator.userAgent}
- Protocol: ${window.location.protocol}
- Hostname: ${window.location.hostname}
      `;
      console.log(detailedError);

      alert(errorMessage);
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }

      // Check if we're on HTTPS (required for mobile browsers)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        throw new Error('HTTPS is required for microphone access on mobile devices');
      }

      // Check available devices first
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      
      if (audioDevices.length === 0) {
        throw new Error('No microphone devices found');
      }

      console.log('Available audio devices:', audioDevices);

      // Try to get user media with different constraints for better mobile compatibility
      let stream;
      try {
        // First try with basic constraints
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
      } catch (basicError) {
        console.log('Basic audio constraints failed, trying minimal constraints:', basicError);
        // Fallback to minimal constraints
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true 
        });
      }

      // Verify we actually got an audio track
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) {
        throw new Error('No audio track available');
      }

      console.log('Audio track obtained:', {
        label: audioTrack.label,
        settings: audioTrack.getSettings(),
        capabilities: audioTrack.getCapabilities()
      });

      // Stop the stream immediately after verification
      stream.getTracks().forEach(track => track.stop());
      
      setProctorSetup(prev => ({ ...prev, microphonePermission: true }));
      setSetupStep(3);
    } catch (error: any) {
      console.error('Microphone permission error:', error);
      
      let errorMessage = 'Microphone access is required for this exam. ';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += 'Please allow microphone access in your browser settings and try again.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage += 'No microphone found. Please ensure your device has a microphone and try again.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage += 'Microphone is in use by another application. Please close other apps using the microphone and try again.';
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        errorMessage += 'Microphone does not meet requirements. Please try again or use a different device.';
      } else if (error.message.includes('HTTPS')) {
        errorMessage = 'HTTPS is required for microphone access on mobile devices. Please access this site via HTTPS.';
      } else if (error.message.includes('getUserMedia is not supported')) {
        errorMessage = 'Microphone access is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.';
      } else {
        errorMessage += 'Please check your microphone permissions and try again.';
      }

      // Show a more detailed error for debugging
      const detailedError = `
Error Details:
- Name: ${error.name}
- Message: ${error.message}
- Browser: ${navigator.userAgent}
- Protocol: ${window.location.protocol}
- Hostname: ${window.location.hostname}
      `;
      console.log(detailedError);

      alert(errorMessage);
    }
  };

  const validateScreenSharing = (stream: MediaStream) => {
    const videoTrack = stream.getVideoTracks()[0];
    const settings = videoTrack.getSettings();
    const capabilities = videoTrack.getCapabilities();
    
    console.log('Screen share validation:', {
      settings,
      capabilities,
      label: videoTrack.label
    });
    
    // Check if it's entire screen based on resolution and label
    const isEntireScreen = 
      (settings.width && settings.width >= 1024) && 
      (settings.height && settings.height >= 768) &&
      videoTrack.label.toLowerCase().includes('screen') &&
      !videoTrack.label.toLowerCase().includes('tab') &&
      !videoTrack.label.toLowerCase().includes('window');
    
    return isEntireScreen;
  };

  const requestScreenSharePermission = async () => {
    try {
      // Request screen sharing with specific constraints for entire screen only
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true,
        audio: false // No audio from screen share
      });
      
      // Validate that it's entire screen sharing
      const isValidScreenShare = validateScreenSharing(stream);
      
      if (!isValidScreenShare) {
        stream.getTracks().forEach(track => track.stop());
        alert('⚠️ Security Alert: Please select "Entire Screen" when prompted for screen sharing.\n\nApplication or tab sharing is not allowed for security reasons.\n\nYou must share your entire screen to continue with the exam.');
        return;
      }
      
      // Stop the stream immediately after verification
      stream.getTracks().forEach(track => track.stop());
      
      setProctorSetup(prev => ({ ...prev, screenSharePermission: true }));
      
      // Now check for external monitor
      await handleExternalMonitorCheck();
      
    } catch (error) {
      console.error('Screen share permission denied:', error);
      alert('Screen sharing access is required for this exam. Please allow screen sharing and select "Entire Screen" when prompted.');
    }
  };

  const checkExternalMonitor = async () => {
    try {
      // Method 1: Check using Screen API (more reliable)
      if ('screen' in window && 'orientation' in window.screen) {
        const screenCount = (window as any).screen?.length || 1;
        console.log('Screen count detected:', screenCount);
        
        if (screenCount > 1) {
          setProctorSetup(prev => ({ ...prev, externalMonitorDetected: true }));
          return true;
        }
      }
      
      // Method 2: Get display media to detect screens
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true
      });
      
      // Get video track to access screen details
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      
      // Stop the stream immediately
      stream.getTracks().forEach(track => track.stop());
      
      // Check if multiple screens are available
      const displays = await navigator.mediaDevices.enumerateDevices();
      const screenDevices = displays.filter(device => device.kind === 'videoinput');
      
      console.log('Screen devices detected:', screenDevices.length);
      console.log('Video settings:', settings);
      
      // If more than one screen is detected, assume external monitor
      if (screenDevices.length > 1 || 
          (settings.width && settings.width > 1920) || 
          (settings.height && settings.height > 1080)) {
        setProctorSetup(prev => ({ ...prev, externalMonitorDetected: true }));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking external monitor:', error);
      // If we can't detect, assume no external monitor for safety
      return false;
    }
  };

  const handleExternalMonitorCheck = async () => {
    const hasExternalMonitor = await checkExternalMonitor();
    
    if (hasExternalMonitor) {
      setSetupStep(3.5); // Special step for external monitor warning
    } else {
      setProctorSetup(prev => ({ ...prev, externalMonitorRemoved: true }));
      setSetupStep(4);
    }
  };

  const confirmExternalMonitorRemoval = () => {
    setProctorSetup(prev => ({ ...prev, externalMonitorRemoved: true }));
    setSetupStep(4);
  };

  const confirmTabSwitchWarning = () => {
    setProctorSetup(prev => ({ ...prev, tabSwitchWarning: true }));
    setSetupStep(5);
  };

  const enterFullscreenMode = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }
    setProctorSetup(prev => ({ ...prev, fullscreenMode: true }));
    setSetupStep(6);
  };

  const startExam = async () => {
    if (!selectedTest) return;
    
    // Final security validation
    if (!proctorSetup.webcamPermission || !proctorSetup.microphonePermission || !proctorSetup.screenSharePermission) {
      alert('⚠️ Security Alert: All proctor permissions must be granted before starting the exam.\n\nPlease complete all setup steps.');
      return;
    }
    
    if (proctorSetup.externalMonitorDetected && !proctorSetup.externalMonitorRemoved) {
      alert('⚠️ Security Alert: External monitor detected. Please remove external monitors before starting the exam.');
      return;
    }
    
    setSetupLoading(true);
    try {
      // Navigate to the sequential exam page
      navigate(`/exam/${selectedTest.examId._id}/sequential`, {
        state: {
          testId: selectedTest._id,
          classroomId: selectedTest.classroomId._id,
          proctorSetup: proctorSetup
        }
      });
    } catch (error) {
      console.error('Error starting exam:', error);
      alert('Failed to start exam. Please try again.');
    } finally {
      setSetupLoading(false);
      setShowProctorModal(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'incomplete': return 'bg-yellow-100 text-yellow-800';
      case 'disqualified': return 'bg-red-100 text-red-800';
      default: return 'bg-secondary-100 text-secondary-800';
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const formatDuration = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const formatResultDate = (result: any) => {
    const dateStr = result.endTime || result.submittedAt;
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? 'N/A' : date.toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600 text-lg font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
      {/* Welcome Header */}
      <div className="relative mb-6 sm:mb-8">
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white">
            <div className="absolute inset-0 bg-black opacity-10"></div>
            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="mb-6 lg:mb-0">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl">
                    <AcademicCapIcon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                    </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                        Student Dashboard
            </h1>
                    <p className="text-white/90 text-sm sm:text-lg">
                        Welcome back, {user?.name}! 👋 Ready to ace your next exam?
            </p>
            </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-slate-500">
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="h-4 w-4 text-white" />
                      <span className="text-white">{new Date().toLocaleTimeString('en-US', { 
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                      })}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CalendarIcon className="h-4 w-4 text-white" />
                      <span className="text-white">{new Date().toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    className="inline-flex items-center px-6 py-3 bg-white/80 hover:bg-white text-slate-700 font-medium rounded-xl transition-all duration-300 hover:shadow-lg border border-white/20 backdrop-blur-sm"
                    onClick={() => navigate('/notifications')}
                  >
                    <BellIcon className="h-5 w-5 mr-2 text-white" />
                    Notifications
                  </button>
                  <Link 
                    to="/dashboard/classrooms" 
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105"
                  >
                    <AcademicCapIcon className="h-5 w-5 mr-2 text-white" />
                    My Classrooms
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="relative overflow-hidden rounded-2xl p-4 sm:p-6 transition-all duration-200 hover:scale-102 hover:shadow-xl bg-gradient-to-br from-blue-500 to-blue-600 group cursor-pointer">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 transform rotate-12 translate-x-4 sm:translate-x-8 -translate-y-4 sm:-translate-y-8">
                <UserGroupIcon className="w-full h-full text-white" />
              </div>
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <UserGroupIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
          </div>
              <div className="mb-2">
                <p className="text-2xl sm:text-4xl font-bold text-white mb-1">{user?.enrolledClassrooms ?? classrooms.length}</p>
                <p className="text-white/80 text-xs sm:text-sm font-medium">Enrolled Classrooms</p>
              </div>
              <p className="text-white/60 text-xs">Active classrooms</p>
            </div>
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

          <div className="relative overflow-hidden rounded-2xl p-4 sm:p-6 transition-all duration-200 hover:scale-102 hover:shadow-xl bg-gradient-to-br from-emerald-500 to-emerald-600 group cursor-pointer">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 transform rotate-12 translate-x-4 sm:translate-x-8 -translate-y-4 sm:-translate-y-8">
                <TrophyIcon className="w-full h-full text-white" />
              </div>
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <TrophyIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
          </div>
              <div className="mb-2">
                <p className="text-2xl sm:text-4xl font-bold text-white mb-1">{recentResults.length}</p>
                <p className="text-white/80 text-xs sm:text-sm font-medium">Completed</p>
              </div>
              <p className="text-white/60 text-xs">Exams finished</p>
            </div>
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

          <div className="relative overflow-hidden rounded-2xl p-4 sm:p-6 transition-all duration-200 hover:scale-102 hover:shadow-xl bg-gradient-to-br from-purple-500 to-purple-600 group cursor-pointer animate-fadeInUp">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 transform rotate-12 translate-x-4 sm:translate-x-8 -translate-y-4 sm:-translate-y-8">
                <ChartBarIcon className="w-full h-full text-white" />
              </div>
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <ChartBarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
              <div className="mb-2">
                <p className="text-2xl sm:text-4xl font-bold text-white mb-1">
                {recentResults.length > 0
                  ? `${(
                      recentResults
                        .map((r: any) => typeof r.percentage === 'number' && !isNaN(r.percentage) ? r.percentage : 0)
                        .reduce((sum: number, p: number) => sum + p, 0) /
                      recentResults.length
                    ).toFixed(1)}%`
                  : 'N/A'}
              </p>
                <p className="text-white/80 text-xs sm:text-sm font-medium">Average Score</p>
              </div>
              <p className="text-white/60 text-xs">
                  {recentResults.length > 0 ? 'Great progress!' : 'No exams yet'}
              </p>
              </div>
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

          <div className="relative overflow-hidden rounded-2xl p-4 sm:p-6 transition-all duration-200 hover:scale-102 hover:shadow-xl bg-gradient-to-br from-amber-500 to-amber-600 group cursor-pointer">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 transform rotate-12 translate-x-4 sm:translate-x-8 -translate-y-4 sm:-translate-y-8">
                <CalendarIcon className="w-full h-full text-white" />
            </div>
          </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
        </div>
              </div>
              <div className="mb-2">
                <p className="text-2xl sm:text-4xl font-bold text-white mb-1">{upcomingTests.length}</p>
                <p className="text-white/80 text-xs sm:text-sm font-medium">Upcoming</p>
            </div>
              <p className="text-white/60 text-xs">Next 7 days</p>
            </div>
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Upcoming Exams */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Upcoming Tests</h2>
          {upcomingTests.length > 0 ? (
            <div className="mt-4 space-y-3 sm:space-y-4 max-h-80 overflow-y-auto pr-2">
              {upcomingTests.slice(0, 5).map((test) => (
                <div key={test._id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border border-gray-200 rounded-lg gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">{test.title}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">{test.classroomId?.name || 'Classroom'} • {test.examId?.title || 'Exam Title Not Available'}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(test.scheduledDate).toLocaleDateString()} at {new Date(test.scheduledDate).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {(test.examId?.duration || test.duration) + ' min'}
                    </span>
                    {recentResults.some((result: any) => 
                      (result.examId && result.examId._id) && (test.examId && test.examId._id) && (result.examId._id === test.examId._id)
                    ) ? (
                      <span className="inline-flex items-center px-2 py-1 sm:px-3 sm:py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-gray-500 cursor-not-allowed">
                        <CheckCircleIcon className="h-3 w-3 mr-1" />
                        Completed
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8">
              <p className="text-secondary-600 text-sm sm:text-base">No upcoming tests</p>
              <p className="text-xs sm:text-sm text-secondary-500">Check your classrooms for scheduled tests</p>
            </div>
          )}
        </div>

        {/* Recent Results */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Recent Results</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Your latest exam performances</p>
            </div>
            <Link 
              to="/dashboard/results" 
              className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-medium flex items-center"
            >
              View All Results
              <svg className="w-3 h-3 sm:w-4 sm:h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          
          {recentResults.length > 0 ? (
            <div className="space-y-3 sm:space-y-4 max-h-80 overflow-y-auto pr-2">
              {recentResults.map((result: any) => {
                const percentage = typeof result.percentage === 'number' && !isNaN(result.percentage) ? result.percentage : 0;
                const displayPercentage = Math.min(percentage, 100);
                return (
                  <div key={result._id} className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-md transition-shadow duration-200 animate-fadeInUp flex flex-col gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-base sm:text-lg mb-1 truncate">{result.examId?.title || 'Exam Title Not Available'}</h3>
                      </div>
                      <span className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded-full border ${
                        displayPercentage >= 90 ? 'bg-green-100 text-green-800 border-green-200' :
                        displayPercentage >= 80 ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        displayPercentage >= 70 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        'bg-red-100 text-red-800 border-red-200'
                      }`}>
                        {displayPercentage.toFixed(2)}%
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-gray-500">Score</span>
                        <span className="font-bold text-blue-700">{result.score}/{result.maxScore} pts</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-gray-500">Correct</span>
                        <span className="font-bold text-green-700">{result.correctAnswers !== undefined ? result.correctAnswers : 'N/A'}/{result.totalQuestions}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-gray-500">Date</span>
                        <span className="text-xs text-gray-500">{formatResultDate(result)}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-gray-500">Status</span>
                        <span className={`font-semibold ${getStatusColor('completed')}`}>Completed</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          displayPercentage >= 90 ? 'bg-green-500' :
                          displayPercentage >= 80 ? 'bg-blue-500' :
                          displayPercentage >= 70 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${displayPercentage}%` }}
                      ></div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 gap-1">
                      <span>Performance: {displayPercentage >= 90 ? 'Excellent' : displayPercentage >= 80 ? 'Good' : displayPercentage >= 70 ? 'Fair' : 'Needs Improvement'}</span>
                      <Link 
                        to="/dashboard/results" 
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <ChartBarIcon className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No results yet</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4">Complete an exam to see your performance analytics here</p>
              <Link
                to="/dashboard"
                className="inline-flex items-center px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
              >
                <AcademicCapIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-white" />
                Browse Available Exams
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Quick Actions</h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Access your most important features</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Link
            to="/dashboard/exams"
            className="group flex items-center p-3 sm:p-4 border border-gray-200 rounded-xl hover:shadow-md hover:border-blue-300 transition-all duration-200 bg-white will-change-transform"
          >
            <div className="p-2 sm:p-3 bg-blue-100 rounded-xl mr-3 group-hover:bg-blue-200 transition-colors">
              <UserGroupIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors text-sm">View Exams</h3>
              <p className="text-xs text-gray-600">Browse available exams</p>
            </div>
          </Link>

          <Link
            to="/dashboard/results"
            className="group flex items-center p-3 sm:p-4 border border-gray-200 rounded-xl hover:shadow-md hover:border-green-300 transition-all duration-200 bg-white will-change-transform"
          >
            <div className="p-2 sm:p-3 bg-green-100 rounded-xl mr-3 group-hover:bg-green-200 transition-colors">
              <ChartBarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors text-sm">My Results</h3>
              <p className="text-xs text-gray-600">Check your scores & analytics</p>
            </div>
          </Link>

          <div className="flex items-center p-3 sm:p-4 border border-gray-200 rounded-xl bg-gray-50 opacity-75">
            <div className="p-2 sm:p-3 bg-purple-100 rounded-xl mr-3">
              <AcademicCapIcon className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Study Resources</h3>
              <p className="text-xs text-gray-600">Coming soon</p>
            </div>
          </div>

          <div className="flex items-center p-3 sm:p-4 border border-gray-200 rounded-xl bg-gray-50 opacity-75">
            <div className="p-2 sm:p-3 bg-orange-100 rounded-xl mr-3">
              <TrophyIcon className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Achievements</h3>
              <p className="text-xs text-gray-600">Coming soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* Proctor Setup Modal */}
      {showProctorModal && selectedTest && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-4 sm:top-10 mx-auto p-4 sm:p-5 border w-11/12 max-w-2xl shadow-2xl rounded-2xl bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Proctor Setup</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">Setting up secure exam environment for {selectedTest.title}</p>
                </div>
                <button
                  onClick={() => setShowProctorModal(false)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200"
                >
                  <XMarkIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>

              {/* Progress Steps */}
              <div className="mb-4 sm:mb-6">
                <div className="flex items-center justify-between overflow-x-auto">
                  {[1, 2, 3, 3.5, 4, 5, 6].map((step) => (
                    <div key={step} className="flex items-center flex-shrink-0">
                      <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                        setupStep >= step 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {step === 3.5 ? '!' : step}
                      </div>
                      {step < 6 && (
                        <div className={`w-8 sm:w-12 h-1 mx-1 sm:mx-2 ${
                          setupStep > step ? 'bg-green-600' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Device Compatibility Check */}
              <div className="mb-4 sm:mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                  <h4 className="text-sm sm:text-base font-medium text-blue-900 mb-2">Device Compatibility</h4>
                  <div className="text-xs sm:text-sm text-blue-800 space-y-1">
                    {(() => {
                      const compat = checkDeviceCompatibility();
                      return (
                        <>
                          <p>• Browser: {compat.isChrome ? 'Chrome' : compat.isSafari ? 'Safari' : compat.isFirefox ? 'Firefox' : 'Other'}</p>
                          <p>• Device: {compat.isMobile ? (compat.isIOS ? 'iOS' : compat.isAndroid ? 'Android' : 'Mobile') : 'Desktop'}</p>
                          <p>• Protocol: {compat.isHTTPS ? 'HTTPS' : compat.isLocalhost ? 'Localhost' : 'HTTP'}</p>
                          <p>• Camera Support: {compat.hasGetUserMedia ? '✅ Available' : '❌ Not Available'}</p>
                          <p>• Screen Share Support: {compat.hasGetDisplayMedia ? '✅ Available' : '❌ Not Available'}</p>
                        </>
                      );
                    })()}
                  </div>
                  {(() => {
                    const compat = checkDeviceCompatibility();
                    if (!compat.hasGetUserMedia) {
                      return (
                        <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-800">
                          ⚠️ Your browser does not support camera access. Please use Chrome, Firefox, or Safari.
                        </div>
                      );
                    }
                    if (compat.isMobile && !compat.isHTTPS && !compat.isLocalhost) {
                      return (
                        <div className="mt-2 p-2 bg-yellow-100 border border-yellow-200 rounded text-xs text-yellow-800">
                          ⚠️ Mobile browsers require HTTPS for camera access. Please access via HTTPS.
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              {/* Step Content */}
              <div className="space-y-4 sm:space-y-6">
                {setupStep === 1 && (
                  <div className="text-center py-6 sm:py-8">
                    <VideoCameraIcon className="h-12 w-12 sm:h-16 sm:w-16 text-blue-600 mx-auto mb-3 sm:mb-4" />
                    <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Webcam Access Required</h4>
                    <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                      This exam requires webcam monitoring for security purposes. 
                      Please allow camera access when prompted.
                    </p>
                    <button
                      onClick={requestWebcamPermission}
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm sm:text-base"
                    >
                      Allow Camera Access
                    </button>
                  </div>
                )}

                {setupStep === 2 && (
                  <div className="text-center py-6 sm:py-8">
                    <div className="h-12 w-12 sm:h-16 sm:w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <CheckCircleIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                    </div>
                    <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Microphone Access Required</h4>
                    <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                      Audio monitoring is also required for this exam. 
                      Please allow microphone access when prompted.
                    </p>
                    <button
                      onClick={requestMicrophonePermission}
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm sm:text-base"
                    >
                      Allow Microphone Access
                    </button>
                  </div>
                )}

                {setupStep === 3 && (
                  <div className="text-center py-6 sm:py-8">
                    <div className="h-12 w-12 sm:h-16 sm:w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <CheckCircleIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                    </div>
                    <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Screen Sharing Required</h4>
                    <div className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 space-y-3">
                      <p>
                        Screen sharing will be used to monitor your exam activity for security purposes.
                      </p>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-yellow-800 font-medium text-sm sm:text-base">⚠️ Important Security Requirement:</p>
                        <ul className="text-yellow-700 text-xs sm:text-sm mt-1 space-y-1">
                          <li>• You MUST select "Entire Screen" when prompted</li>
                          <li>• Application or tab sharing is NOT allowed</li>
                          <li>• This ensures complete monitoring of your exam environment</li>
                        </ul>
                      </div>
                    </div>
                    <button
                      onClick={requestScreenSharePermission}
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm sm:text-base"
                    >
                      Allow Screen Sharing
                    </button>
                  </div>
                )}

                {setupStep === 3.5 && (
                  <div className="text-center py-6 sm:py-8">
                    <div className="h-12 w-12 sm:h-16 sm:w-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <ExclamationTriangleIcon className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
                    </div>
                    <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">External Monitor Detected</h4>
                    <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                      An external monitor has been detected. This might interfere with the exam's security.
                      Please ensure your primary display is the only one being used for the exam.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <button
                        onClick={handleExternalMonitorCheck}
                        className="px-4 sm:px-6 py-2 sm:py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors duration-200 text-sm sm:text-base"
                      >
                        Continue Anyway
                      </button>
                      <button
                        onClick={confirmExternalMonitorRemoval}
                        className="px-4 sm:px-6 py-2 sm:py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 text-sm sm:text-base"
                      >
                        Remove External Monitor
                      </button>
                    </div>
                  </div>
                )}

                {setupStep === 4 && (
                  <div className="text-center py-6 sm:py-8">
                    <div className="h-12 w-12 sm:h-16 sm:w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <CheckCircleIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                    </div>
                    <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Tab Switching Warning</h4>
                    <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                      <ExclamationTriangleIcon className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600 mx-auto mb-2" />
                      Switching to other tabs or applications during the exam will be detected and may result in exam termination.
                    </p>
                    <button
                      onClick={confirmTabSwitchWarning}
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors duration-200 text-sm sm:text-base"
                    >
                      I Understand
                    </button>
                  </div>
                )}

                {setupStep === 5 && (
                  <div className="text-center py-6 sm:py-8">
                    <div className="h-12 w-12 sm:h-16 sm:w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <CheckCircleIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                    </div>
                    <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Fullscreen Mode</h4>
                    <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                      For the best exam experience, please enter fullscreen mode. 
                      This helps prevent distractions and ensures proper monitoring.
                    </p>
                    <button
                      onClick={enterFullscreenMode}
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm sm:text-base"
                    >
                      Enter Fullscreen
                    </button>
                  </div>
                )}

                {setupStep === 6 && (
                  <div className="text-center py-6 sm:py-8">
                    <div className="h-12 w-12 sm:h-16 sm:w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <CheckCircleIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                    </div>
                    <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Ready to Start!</h4>
                    <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                      All setup steps are complete. You're ready to begin your exam.
                    </p>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                      <h5 className="font-medium text-green-800 mb-2 text-sm sm:text-base">Exam Details:</h5>
                      <div className="text-xs sm:text-sm text-green-700 space-y-1">
                        <p><strong>Test:</strong> {selectedTest.title}</p>
                        <p><strong>Duration:</strong> {selectedTest.duration} minutes</p>
                        <p><strong>Classroom:</strong> {selectedTest.classroomId.name}</p>
                      </div>
                    </div>
                    <button
                      onClick={startExam}
                      disabled={setupLoading}
                      className="px-6 sm:px-8 py-2 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-sm sm:text-base"
                    >
                      {setupLoading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-2"></div>
                          Starting Exam...
                        </div>
                      ) : (
                        'Start Exam Now'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Bottom spacing to ensure content is fully visible */}
      <div className="h-8 sm:h-12"></div>
    </div>
  );
};

export default StudentDashboard; 