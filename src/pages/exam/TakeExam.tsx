import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Webcam from 'react-webcam';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { resultsAPI } from '../../services/api';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  VideoCameraIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
// @ts-ignore
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';

interface ExamQuestion {
  _id: string;
  question: string; // Changed from 'text' to 'question' to match backend
  type: 'multiple-choice' | 'multiple-correct' | 'true-false' | 'short-answer' | 'essay';
  options?: string[];
  correctAnswer: string | string[];
  points: number;
  timeLimit?: number;
  order: number;
}

interface Exam {
  _id: string;
  title: string;
  description: string;
  duration: number;
  totalQuestions: number;
  questions: ExamQuestion[];
  requireWebcam: boolean;
  preventTabSwitch: boolean;
  preventCopyPaste: boolean;
  requireFullscreen: boolean;
  detectHeadMovement: boolean;
}

// --- StudentWebRTC Component ---
type StudentWebRTCProps = {
  examId: string;
  studentId: string;
  active: boolean;
};
const StudentWebRTC: React.FC<StudentWebRTCProps> = ({ examId, studentId, active }) => {
  const { socket } = useSocket();
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!active || !socket || !examId || !studentId || startedRef.current) return;
    startedRef.current = true;
    let webcamStream: MediaStream | undefined;
    let screenStream: MediaStream | undefined;
    let pc: RTCPeerConnection;

    const startWebRTC = async () => {
      try {
        webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        pc = new window.RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        pcRef.current = pc;
        // Add tracks
        webcamStream.getTracks().forEach(track => pc.addTrack(track, webcamStream!));
        screenStream.getTracks().forEach(track => pc.addTrack(track, screenStream!));
        // ICE
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('webrtc-ice-candidate', {
              examId,
              studentId,
              candidate: event.candidate,
              target: 'proctor'
            });
          }
        };
        // Offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc-offer', { examId, studentId, offer });
        // Answer
        socket.on('webrtc-answer', async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        });
        // ICE from proctor
        socket.on('webrtc-ice-candidate', ({ candidate, from }: { candidate: RTCIceCandidateInit, from: string }) => {
          if (from === 'proctor') {
            pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        });
      } catch (err) {
        // Optionally handle error
      }
    };
    startWebRTC();
    return () => {
      pcRef.current?.close();
      socket.off('webrtc-answer');
      socket.off('webrtc-ice-candidate');
      webcamStream?.getTracks().forEach(t => t.stop());
      screenStream?.getTracks().forEach(t => t.stop());
    };
  }, [active, socket, examId, studentId]);
  return null;
};

const TakeExam: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { socket } = useSocket();
  const webcamRef = useRef<Webcam>(null);
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [questionStartTimes, setQuestionStartTimes] = useState<Record<string, number>>({});
  const [questionTimeSpent, setQuestionTimeSpent] = useState<Record<string, number>>({});
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [proctorSetup, setProctorSetup] = useState<any>(null);
  const [showWebcamModal, setShowWebcamModal] = useState(false);
  const [webcamError, setWebcamError] = useState('');
  const [showProctorModal, setShowProctorModal] = useState(true);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [aiWarning, setAiWarning] = useState('');
  const [faceDetector, setFaceDetector] = useState<any>(null);
  const [aiEnabled, setAiEnabled] = useState(false);

  // --- Add at the top ---
  const EXAM_STORAGE_KEY = (examId: string | undefined) => `exam-session-${examId}`;
  const TAB_SWITCH_KEY = (examId: string | undefined) => `tab-switch-count-${examId}`;

  // --- Add at the top, after other useState declarations ---
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(0);
  const [autoSubmitted, setAutoSubmitted] = useState<boolean>(false);

  // Get proctor setup data from navigation state
  useEffect(() => {
    if (location.state) {
      setProctorSetup(location.state.proctorSetup);
    }
  }, [location.state]);

  // Show webcam modal on exam load if required
  useEffect(() => {
    if (exam && exam.requireWebcam && !isWebcamActive) {
      setShowWebcamModal(true);
    } else {
      setShowWebcamModal(false);
    }
  }, [exam, isWebcamActive]);

  const handleGrantWebcam = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      setShowWebcamModal(false);
      setWebcamError('');
    } catch (err) {
      setWebcamError('Webcam permission is required to attempt this exam. Please allow camera access.');
    }
  };

  // Start exam session with real-time monitoring
  useEffect(() => {
    const startExamSession = async () => {
      if (!examId || !user || examStarted) return;

      try {
        console.log('🚀 Starting exam session for:', examId);
        
        // Start session via API
        const response = await resultsAPI.startSession(examId);
        if (response.success) {
          setSessionId(response.data.sessionId);
          setExamStarted(true);
          console.log('✅ Exam session started:', response.data.sessionId);

          // Emit real-time event to proctors
          if (socket) {
            socket.emit('student-join-exam', {
              examId: examId,
              studentId: user.id,
              studentName: user.name
            });
            console.log('[DEBUG] Emitted student-join-exam event');
          }
        } else {
          console.error('❌ Failed to start exam session:', response.error);
          alert('Failed to start exam session. Please try again.');
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('❌ Error starting exam session:', error);
        alert('Error starting exam session. Please try again.');
        navigate('/dashboard');
      }
    };

    startExamSession();
  }, [examId, user, examStarted, socket, navigate]);

  // Fetch exam data
  useEffect(() => {
    const fetchExam = async () => {
      if (!examId) return;
      
      try {
        setLoading(true);
        // Use the existing API to get exam data
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://examproctor-backend-e6mh.onrender.com/api'}/exams/${examId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Check if exam has questions
          if (!data.data.questions || data.data.questions.length === 0) {
            alert('This exam has no questions. Please contact your instructor.');
            navigate('/dashboard');
            return;
          }
          
          setExam(data.data);
          setTimeLeft(data.data.duration * 60); // Convert minutes to seconds
        } else {
          alert('Failed to load exam. Please try again.');
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error loading exam:', error);
        alert('Error loading exam. Please try again.');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchExam();
  }, [examId, navigate]);

  // Update progress in real-time
  useEffect(() => {
    if (!sessionId || !socket || !exam) return;

    const updateProgress = () => {
      const progress = Math.round((Object.keys(answers).length / exam.questions.length) * 100);
      const timeRemaining = timeLeft;

      // Update progress via API
      resultsAPI.updateProgress(sessionId, {
        progress,
        currentQuestion: currentQuestion + 1,
        timeRemaining
      }).catch(error => {
        console.error('❌ Error updating progress:', error);
      });

      // Emit real-time progress update
      socket.emit('student-progress', {
        examId: exam._id,
        studentId: user?.id,
        progress,
        currentQuestion: currentQuestion + 1,
        timeRemaining
      });
      console.log('[DEBUG] Emitted student-progress', { examId: exam._id, studentId: user?.id, progress: progress, currentQuestion: currentQuestion + 1, timeRemaining: timeRemaining });
    };

    // Update progress every 30 seconds
    const interval = setInterval(updateProgress, 30000);
    
    // Also update when answers change
    updateProgress();

    return () => clearInterval(interval);
  }, [sessionId, socket, exam, answers, currentQuestion, timeLeft, user]);

  // Track time when navigating questions
  const navigateToQuestion = (direction: 'next' | 'prev') => {
    const currentQuestionId = exam?.questions[currentQuestion]?._id;
    const now = Date.now();
    if (currentQuestionId && questionStartTimes[currentQuestionId]) {
      const timeSpent = Math.round((now - questionStartTimes[currentQuestionId]) / 1000);
      setQuestionTimeSpent(prev => ({
        ...prev,
        [currentQuestionId]: (prev[currentQuestionId] || 0) + timeSpent
      }));
    }
    if (direction === 'next' && currentQuestion < (exam?.questions.length || 0) - 1) {
      setCurrentQuestion(currentQuestion + 1);
      const newQuestionId = exam?.questions[currentQuestion + 1]?._id;
      if (newQuestionId) {
        setQuestionStartTimes(prev => ({ ...prev, [newQuestionId]: now }));
      }
    } else if (direction === 'prev' && currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      const newQuestionId = exam?.questions[currentQuestion - 1]?._id;
      if (newQuestionId) {
        setQuestionStartTimes(prev => ({ ...prev, [newQuestionId]: now }));
      }
    }
    emitProgress(); // Emit progress after navigation
  };

  // Start timing the first question when exam loads
  useEffect(() => {
    if (exam && exam.questions.length > 0) {
      const firstQuestionId = exam.questions[0]._id;
      setQuestionStartTimes(prev => ({ ...prev, [firstQuestionId]: Date.now() }));
    }
  }, [exam]);

  // On submit, finalize time for current question and send all timeSpent
  const handleSubmitExam = useCallback(async () => {
    if (!exam || !user || !sessionId) return;
    if (!exam._id) {
      alert('Error: Exam ID is missing. Please try again.');
      return;
    }
    if (Object.keys(answers).length === 0) {
      const confirmed = window.confirm('You haven\'t answered any questions. Are you sure you want to submit the exam?');
      if (!confirmed) return;
    }
    // Finalize time for current question
    const currentQuestionId = exam.questions[currentQuestion]._id;
    const now = Date.now();
    let finalQuestionTimeSpent = { ...questionTimeSpent };
    if (questionStartTimes[currentQuestionId]) {
      const timeSpent = Math.round((now - questionStartTimes[currentQuestionId]) / 1000);
      finalQuestionTimeSpent[currentQuestionId] = (finalQuestionTimeSpent[currentQuestionId] || 0) + timeSpent;
    }
    const allQuestionIds = exam.questions.map(q => q._id);
    const answersArray = allQuestionIds.map(questionId => ({
      questionId,
      answer: answers[questionId] !== undefined ? answers[questionId] : '',
      timeSpent: finalQuestionTimeSpent[questionId] || 0
    }));
    try {
      const examData = {
        examId: exam._id,
        answers: answersArray,
        timeTaken: (exam.duration * 60) - timeLeft,
        startTime: new Date(Date.now() - ((exam.duration * 60) - timeLeft) * 1000),
        endTime: new Date()
      };

      console.log('📝 Submitting exam data:', {
        examId: examData.examId,
        answersCount: examData.answers.length,
        answers: examData.answers,
        timeTaken: examData.timeTaken
      });

      const response = await resultsAPI.submitResult(examData);
      
      if (response.success) {
        // Check if this is a redirect response (second attempt)
        if (response.redirect) {
          alert(response.message || 'You have already completed this exam. Redirecting to dashboard.');
          navigate('/dashboard');
          return;
        }
        
        // Emit student leaving exam event
        if (socket) {
          socket.emit('student-leave-exam', {
            examId: exam._id,
            studentId: user.id,
            studentName: user.name
          });
        }

        alert('Exam submitted successfully!');
        navigate('/dashboard');
      } else {
        alert(`Failed to submit exam: ${response.error || 'Please try again.'}`);
      }
    } catch (error: any) {
      console.error('Error submitting exam:', error);
      alert(`Error submitting exam: ${error.message || 'Please try again.'}`);
    }
  }, [exam, user, answers, timeLeft, navigate, sessionId, socket, questionTimeSpent]);

  // --- Auto-submit exam on 4th tab switch ---
  const handleAutoSubmitExam = useCallback(async () => {
    if (!exam || !user || !sessionId) return;
    // Assign 0 to all unanswered questions
    const unanswered = exam.questions.filter(q => !answers[q._id]);
    const zeroAnswers = unanswered.map(q => ({ questionId: q._id, answer: '', timeSpent: questionTimeSpent[q._id] || 0 }));
    const allAnswers = [
      ...Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer, timeSpent: questionTimeSpent[questionId] || 0 })),
      ...zeroAnswers
    ];
    try {
      const examData = {
        examId: exam._id,
        answers: allAnswers,
        timeTaken: (exam.duration * 60) - timeLeft,
        startTime: new Date(Date.now() - ((exam.duration * 60) - timeLeft) * 1000),
        endTime: new Date()
      };
      await resultsAPI.submitResult(examData);
      alert('You have switched tabs too many times. Your exam has been auto-submitted.');
      navigate('/dashboard');
    } catch (error: any) {
      alert('Error auto-submitting exam. Please contact your instructor.');
      navigate('/dashboard');
    }
  }, [exam, user, sessionId, answers, timeLeft, questionTimeSpent, navigate]);

  // --- Tab switch detection and enforcement ---
  useEffect(() => {
    if (!exam?.preventTabSwitch || !sessionId) return;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Report activity via API
        resultsAPI.reportActivity(sessionId, {
          type: 'tab-switch',
          description: 'Student switched to another tab',
          severity: 'medium'
        }).catch(error => {
          console.error('❌ Error reporting activity:', error);
        });
        // Emit real-time activity event
        if (socket) {
          socket.emit('student-activity', {
            examId: exam._id,
            studentId: user?.id,
            studentName: user?.name,
            type: 'tab-switch',
            description: 'Student switched to another tab',
            severity: 'medium'
          });
        }
        setShowWarning(true);
        setTabSwitchCount(prev => {
          const newCount = prev + 1;
          localStorage.setItem(TAB_SWITCH_KEY(examId), newCount.toString());
          if (newCount >= 3 && !autoSubmitted) {
            setAutoSubmitted(true);
            // Auto-submit exam with 0 for all unanswered questions
            handleAutoSubmitExam();
          }
          return newCount;
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [exam?.preventTabSwitch, sessionId, socket, exam, user, examId, autoSubmitted, handleAutoSubmitExam]);

  // --- Timer logic: always use original start time ---
  useEffect(() => {
    if (!examStarted) return;
    let startTimestamp = Date.now();
    const saved = localStorage.getItem(EXAM_STORAGE_KEY(examId));
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.startTimestamp) startTimestamp = parsed.startTimestamp;
      else parsed.startTimestamp = startTimestamp;
      localStorage.setItem(EXAM_STORAGE_KEY(examId), JSON.stringify(parsed));
    } else {
      localStorage.setItem(EXAM_STORAGE_KEY(examId), JSON.stringify({ startTimestamp }));
    }
    setTimeLeft(prev => {
      const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
      return Math.max((exam?.duration || 0) * 60 - elapsed, 0);
    });
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
        return Math.max((exam?.duration || 0) * 60 - elapsed, 0);
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [examStarted, exam, examId]);

  // --- Emit progress after every answer and navigation ---
  const emitProgress = () => {
    if (socket && exam && user) {
      const progress = Math.round((Object.keys(answers).length / exam.questions.length) * 100);
      socket.emit('student-progress', {
        examId: exam._id,
        studentId: user.id,
        progress,
        currentQuestion: currentQuestion + 1,
        timeRemaining: timeLeft,
      });
    }
  };

  const handleAnswerChange = (questionId: string, answer: string | string[]) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
    emitProgress(); // Emit progress after every answer
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper to request webcam
  const requestWebcam = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      setIsWebcamActive(true);
      setWebcamError('');
      return true;
    } catch (err) {
      setWebcamError('Webcam permission is required.');
      setIsWebcamActive(false);
      return false;
    }
  };
  // Remove unused state and code from requestMic and requestScreen
  const requestMic = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (err) {
      return false;
    }
  };
  const requestScreen = async () => {
    try {
      // @ts-ignore
      const stream = await (navigator.mediaDevices.getDisplayMedia || navigator.getDisplayMedia).call(navigator.mediaDevices, { video: true });
      if (stream) {
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  // --- Enhanced Professional Permission Stepper UI ---
  const [permissionStep, setPermissionStep] = useState(0);
  const [permissionStatus, setPermissionStatus] = useState<{ [key: string]: boolean }>({
    monitor: false,
    webcam: false,
    mic: false,
    screen: false,
    fullscreen: false,
  });
  const [permissionError, setPermissionError] = useState('');
  const [monitorWarning, setMonitorWarning] = useState('');

  // Add logo and exam title (customize as needed)
  const logoUrl = '/logo.png'; // Place your logo in public/

  // Steps: now include external monitor as first step
  const steps = [
    { key: 'monitor', label: 'External Monitor', description: 'Ensure no external monitor is connected.' },
    { key: 'webcam', label: 'Camera', description: 'Allow access to your camera for proctoring.' },
    { key: 'mic', label: 'Microphone', description: 'Allow access to your microphone for proctoring.' },
    { key: 'screen', label: 'Screen Share', description: 'Share your entire screen for the duration of the exam.' },
    { key: 'fullscreen', label: 'Fullscreen', description: 'Exam must be taken in fullscreen mode.' },
  ];

  // Heuristic: Detect external monitor
  const checkExternalMonitor = () => {
    const isExternal = window.screen.width > window.innerWidth + 100 || window.screen.height > window.innerHeight + 100;
    setPermissionStatus(prev => ({ ...prev, monitor: !isExternal }));
    setMonitorWarning(isExternal ? 'External monitor detected. Please disconnect and use only your primary display.' : '');
    // Emit to proctor
    if (socket && exam && user) {
      socket.emit('student-permission-status', {
        examId: exam._id,
        studentId: user.id,
        permission: 'monitor',
        granted: !isExternal,
      });
    }
  };

  useEffect(() => {
    checkExternalMonitor();
    window.addEventListener('resize', checkExternalMonitor);
    return () => window.removeEventListener('resize', checkExternalMonitor);
  }, []);

  const requestPermission = async (key: string) => {
    setPermissionError('');
    try {
      if (key === 'webcam') {
        await navigator.mediaDevices.getUserMedia({ video: true });
      } else if (key === 'mic') {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } else if (key === 'screen') {
        // @ts-ignore
        await (navigator.mediaDevices.getDisplayMedia || navigator.getDisplayMedia).call(navigator.mediaDevices, { video: true });
      } else if (key === 'fullscreen') {
        if (document.fullscreenElement) return;
        await document.documentElement.requestFullscreen();
      } else if (key === 'monitor') {
        checkExternalMonitor();
        if (!permissionStatus.monitor) throw new Error('External monitor detected');
      }
      setPermissionStatus(prev => ({ ...prev, [key]: true }));
      // Emit permission status to proctor
      if (socket && exam && user) {
        socket.emit('student-permission-status', {
          examId: exam._id,
          studentId: user.id,
          permission: key,
          granted: true,
        });
      }
      setPermissionStep(prev => prev + 1);
    } catch (err) {
      setPermissionError(`Failed to grant ${steps[permissionStep].label} permission. Please allow and try again.`);
      setPermissionStatus(prev => ({ ...prev, [key]: false }));
      // Emit permission status to proctor
      if (socket && exam && user) {
        socket.emit('student-permission-status', {
          examId: exam._id,
          studentId: user.id,
          permission: key,
          granted: false,
        });
      }
    }
  };

  const allPermissionsGranted = Object.values(permissionStatus).every(Boolean);

  const handleStartExam = async () => {
    if (!exam || !user) return;
    try {
              await fetch('https://examproctor-backend-e6mh.onrender.com/api/results/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId: exam._id, studentId: user.id }),
      });
      setExamStarted(true);
    } catch (err) {
      alert('Could not start exam. Please try again.');
    }
  };

  // --- Render Enhanced Permission Stepper ---
  if (!examStarted) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900 bg-opacity-95" role="dialog" aria-modal="true">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-xl">
          <div className="flex flex-col items-center mb-4">
            <img src={logoUrl} alt="Logo" className="h-12 mb-2" />
            <h2 className="text-2xl font-bold mb-1 text-center">{exam?.title || 'Exam'}</h2>
          </div>
          <p className="mb-4 text-gray-700 text-center">Before you begin, we need a few permissions to ensure a secure and fair exam experience. Please follow the steps below.</p>
          <ol className="mb-6">
            {steps.map((step, idx) => (
              <li key={step.key} className="flex items-center mb-3">
                <span className={`w-6 h-6 flex items-center justify-center rounded-full mr-3 text-lg font-bold ${permissionStatus[step.key] ? 'bg-green-500 text-white' : idx === permissionStep ? (permissionError ? 'bg-red-500 text-white' : 'bg-blue-500 text-white') : 'bg-gray-300 text-gray-700'}`}>{permissionStatus[step.key] ? '✓' : idx === permissionStep ? (permissionError ? '✗' : '→') : ''}</span>
                <span className="font-medium">{step.label}</span>
                <span className="ml-2 text-gray-500 text-sm">{step.description}</span>
                {step.key === 'monitor' && monitorWarning && (
                  <span className="ml-2 text-red-600 text-sm">{monitorWarning}</span>
                )}
              </li>
            ))}
          </ol>
          {permissionError && <div className="text-red-600 mb-4 text-center" role="alert">{permissionError}</div>}
          {permissionStep < steps.length && (
            <button
              className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition mb-2"
              onClick={() => requestPermission(steps[permissionStep].key)}
              aria-label={`Allow ${steps[permissionStep].label}`}
              disabled={steps[permissionStep].key === 'monitor' && !permissionStatus.monitor}
            >
              Allow {steps[permissionStep].label}
            </button>
          )}
          {permissionStep === steps.length && (
            <button
              className={`w-full py-2 px-4 rounded ${allPermissionsGranted ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-400 text-gray-200 cursor-not-allowed'}`}
              onClick={allPermissionsGranted ? handleStartExam : undefined}
              disabled={!allPermissionsGranted}
              aria-label="Start Exam"
          >
            Start Exam
          </button>
          )}
          <div className="mt-4 text-xs text-gray-500 text-center">
            Need help? Please ensure your browser allows all permissions and disconnect any external monitors.
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <XCircleIcon className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-secondary-600">Exam not found</p>
        </div>
      </div>
    );
  }

  if (showWebcamModal && exam?.requireWebcam) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <VideoCameraIcon className="h-12 w-12 text-primary-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-secondary-900">Webcam Access Required</h2>
          <p className="text-secondary-700 mb-4">
            This exam requires webcam monitoring for proctoring. Please grant camera access to proceed.
          </p>
          {webcamError && <div className="text-red-600 mb-2">{webcamError}</div>}
          <button
            onClick={handleGrantWebcam}
            className="btn-primary px-6 py-2 text-lg w-full"
          >
            Grant Permission
          </button>
        </div>
      </div>
    );
  }

  const currentQuestionData = exam.questions[currentQuestion];

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-md border-b border-secondary-200 px-6 py-4 sticky top-0 z-40">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">{exam.title}</h1>
            <p className="text-sm text-secondary-600">
              Question {currentQuestion + 1} of {exam.questions.length}
            </p>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 text-red-600">
              <ClockIcon className="h-5 w-5" />
              <span className="font-mono text-lg">{formatTime(timeLeft)}</span>
            </div>
            {exam.requireWebcam && (
              <div className="flex items-center space-x-2">
                <VideoCameraIcon className={`h-5 w-5 ${isWebcamActive ? 'text-green-600' : 'text-secondary-400'}`} />
                <span className="text-sm text-secondary-600">Webcam</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col md:flex-row w-full gap-6 p-4 sm:p-6 lg:p-8">
        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Warning Banner */}
          {showWarning && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6 flex items-center w-full max-w-xl">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              <span>Warning: Tab switching detected. This may result in exam termination.</span>
              <button
                onClick={() => setShowWarning(false)}
                className="ml-auto text-yellow-600 hover:text-yellow-800"
              >
                ×
              </button>
            </div>
          )}
          {/* Question Card */}
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-xl mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-secondary-900">
                Question {currentQuestion + 1}
              </h2>
              <span className="text-sm text-secondary-600">
                {currentQuestionData.points} point{currentQuestionData.points !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-secondary-900 mb-6 text-lg font-medium">{currentQuestionData.question}</p>
            {/* Answer Options */}
            <div className="space-y-3">
              {currentQuestionData.type === 'multiple-choice' && currentQuestionData.options?.map((option, index) => (
                <label key={index} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name={`question-${currentQuestionData._id}`}
                    value={option}
                    checked={answers[currentQuestionData._id] === option}
                    onChange={(e) => handleAnswerChange(currentQuestionData._id, e.target.value)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300"
                  />
                  <span className="text-secondary-900 text-base">{option}</span>
                </label>
              ))}
              {currentQuestionData.type === 'multiple-correct' && currentQuestionData.options?.map((option, index) => (
                <label key={index} className="flex items-center space-x-4 cursor-pointer p-4 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors">
                  <input
                    type="checkbox"
                    name={`question-${currentQuestionData._id}`}
                    value={option}
                    checked={Array.isArray(answers[currentQuestionData._id]) && (answers[currentQuestionData._id] as string[]).includes(option)}
                    onChange={e => {
                      let prevAns: string[] = Array.isArray(answers[currentQuestionData._id]) ? [...(answers[currentQuestionData._id] as string[])] : [];
                      if (e.target.checked) {
                        prevAns.push(option);
                      } else {
                        prevAns = prevAns.filter(ans => ans !== option);
                      }
                      handleAnswerChange(currentQuestionData._id, prevAns);
                    }}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-400"
                  />
                  <span className="text-gray-200">{option}</span>
                </label>
              ))}
              {currentQuestionData.type === 'true-false' && (
                <div className="flex gap-4">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name={`question-${currentQuestionData._id}`}
                      value="True"
                      checked={answers[currentQuestionData._id] === 'True'}
                      onChange={(e) => handleAnswerChange(currentQuestionData._id, e.target.value)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300"
                    />
                    <span className="text-secondary-900 text-base">True</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name={`question-${currentQuestionData._id}`}
                      value="False"
                      checked={answers[currentQuestionData._id] === 'False'}
                      onChange={(e) => handleAnswerChange(currentQuestionData._id, e.target.value)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300"
                    />
                    <span className="text-secondary-900 text-base">False</span>
                  </label>
                </div>
              )}
              {(currentQuestionData.type === 'short-answer' || currentQuestionData.type === 'essay') && (
                <textarea
                  value={answers[currentQuestionData._id] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestionData._id, e.target.value)}
                  className="w-full border border-secondary-300 rounded-lg px-3 py-2 focus:ring-primary-500 focus:border-primary-500 text-base"
                  rows={currentQuestionData.type === 'essay' ? 6 : 3}
                  placeholder={`Enter your ${currentQuestionData.type === 'essay' ? 'essay' : 'answer'} here...`}
                />
              )}
            </div>
          {/* Navigation */}
            <div className="flex justify-between mt-8">
            <button
              onClick={() => navigateToQuestion('prev')}
              disabled={currentQuestion === 0}
              className="btn-secondary inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="h-4 w-4 mr-2" />
              Previous
            </button>
            <div className="flex space-x-2">
              {currentQuestion < exam.questions.length - 1 ? (
                <button
                  onClick={() => navigateToQuestion('next')}
                  className="btn-primary inline-flex items-center"
                >
                  Next
                  <ChevronRightIcon className="h-4 w-4 ml-2" />
                </button>
              ) : (
                <button
                  onClick={handleSubmitExam}
                  className="btn-primary"
                >
                  Submit Exam
                </button>
              )}
            </div>
          </div>
        </div>
        </div>
        {/* Sidebar */}
        <div className="w-full md:w-80 bg-white border border-secondary-200 rounded-xl shadow-lg p-6 flex flex-col gap-8 mt-8 md:mt-0">
          {/* Webcam */}
          {exam.requireWebcam && (
            <div>
              <h3 className="text-sm font-medium text-secondary-900 mb-3">Webcam Feed</h3>
              <div className="relative h-48">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  width="100%"
                  height="100%"
                  className="rounded-lg w-full h-full object-cover"
                  onUserMedia={() => setIsWebcamActive(true)}
                  onUserMediaError={() => setIsWebcamActive(false)}
                />
                {!isWebcamActive && (
                  <div className="absolute inset-0 bg-secondary-100 rounded-lg flex items-center justify-center">
                    <span className="text-secondary-500">Camera not available</span>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Question Navigation */}
          <div>
            <h3 className="text-sm font-medium text-secondary-900 mb-3">Question Navigation</h3>
            <div className="grid grid-cols-5 gap-2">
              {exam.questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestion(index)}
                  className={`p-2 text-sm rounded font-semibold transition-colors duration-200
                    ${currentQuestion === index
                      ? 'bg-primary-600 text-white'
                      : answers[exam.questions[index]._id]
                      ? 'bg-green-100 text-green-800'
                      : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'}
                  `}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
          {/* Progress */}
          <div>
            <h3 className="text-sm font-medium text-secondary-900 mb-3">Progress</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Answered</span>
                <span>{Object.keys(answers).length}/{exam.questions.length}</span>
              </div>
              <div className="w-full bg-secondary-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(Object.keys(answers).length / exam.questions.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
          {/* Proctor Status */}
          {proctorSetup && (
            <div>
              <h3 className="text-sm font-medium text-secondary-900 mb-3">Proctor Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Webcam</span>
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex items-center justify-between">
                  <span>Microphone</span>
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex items-center justify-between">
                  <span>Screen Share</span>
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex items-center justify-between">
                  <span>Fullscreen</span>
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </div>
          )}
          {/* Time Spent Per Question */}
          <div>
            <h3 className="text-sm font-medium text-secondary-900 mb-3">Time Spent Per Question</h3>
            <ul>
              {exam.questions.map((q, idx) => (
                <li key={q._id} className="flex justify-between text-sm">
                  <span>Q{idx + 1}</span>
                  <span>{formatTime(questionTimeSpent[q._id] || 0)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 text-sm font-medium">Overall Time: {formatTime((exam.duration * 60) - timeLeft)}</div>
          </div>
        </div>
      </div>
      {/* Render AI warning if present */}
      {aiWarning && (
        <div className="bg-red-100 text-red-700 p-2 rounded mb-2 text-center">
          {aiWarning}
        </div>
      )}
      {/* StudentWebRTC for live streaming */}
      {allPermissionsGranted && examStarted && user && (
        <StudentWebRTC examId={exam._id} studentId={user.id} active={true} />
      )}
    </div>
  );
};

export default TakeExam; 