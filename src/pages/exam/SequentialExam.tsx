import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Webcam from 'react-webcam';
import io from 'socket.io-client';
import { createDetector, SupportedModels } from '@tensorflow-models/face-landmarks-detection';
import '@tensorflow/tfjs-backend-webgl';

interface Question {
  _id: string;
  questionText: string;
  questionType: 'multiple-choice' | 'multiple-correct' | 'short-answer' | 'essay' | 'true-false';
  options?: string[];
  correctAnswer?: string | string[];
  points: number;
  timeLimit?: number;
  allowNavigation?: boolean;
}

interface Exam {
  _id: string;
  title: string;
  description: string;
  duration: number;
  totalQuestions: number;
  questions: Question[];
  isActive: boolean;
  requireWebcam?: boolean;
  allowNavigation?: boolean;
  preventTabSwitch?: boolean;
  preventCopyPaste?: boolean;
  randomizeQuestions?: boolean;
  timePerQuestion?: boolean;
  requireFullscreen?: boolean;
  detectHeadMovement?: boolean;
  autoTerminateOnSuspicious?: boolean;
  allowReview?: boolean;
  showResults?: boolean;
  questionOrder?: string[]; // Added for frontend to maintain order
  startTime?: string; // Added for progress tracking
  answers?: { [qid: string]: string | string[] }[]; // Added for progress tracking
  timeLeft?: number; // Added for progress tracking
  currentQuestionIndex?: number; // Added for progress tracking
}

  const socket = io(process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://examproctor-backend-e6mh.onrender.com', {
    transports: ['polling', 'websocket'],
    timeout: 20000,
    forceNew: true
  });

const SequentialExam: React.FC = () => {
  // All hooks at the very top
  const [showPermissions, setShowPermissions] = useState(true);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [exam, setExam] = useState<Exam | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string | string[] }>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [warnings, setWarnings] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number>(0);
  const [attemptMessage, setAttemptMessage] = useState<string | null>(null);
  const [isTestEnded, setIsTestEnded] = useState(false);
  const [questionStartTimes, setQuestionStartTimes] = useState<Record<string, number>>({});
  const [questionTimeSpent, setQuestionTimeSpent] = useState<Record<string, number>>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const sessionKey = user && examId ? `exam_session_${examId}_${user.id}` : null;
  // State to show fullscreen warning/modal
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const [isActuallyFullscreen, setIsActuallyFullscreen] = useState(false);
  // Add state for question order
  const [questionOrder, setQuestionOrder] = useState<string[]>([]);
  // State for per-question timer and locked questions
  const [questionTimers, setQuestionTimers] = useState<{ [qid: string]: number }>({});
  const [lockedQuestions, setLockedQuestions] = useState<{ [qid: string]: boolean }>({});
  // State for mark for review
  const [reviewQuestions, setReviewQuestions] = useState<{ [qid: string]: boolean }>({});
  // State for warning message timer
  const [showWarningMessage, setShowWarningMessage] = useState(true);
  // State for tracking suspicious activities
  const [suspiciousActivities, setSuspiciousActivities] = useState<Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: Date;
  }>>([]);
  // State for real-time suspicious activity alerts
  const [showSuspiciousAlert, setShowSuspiciousAlert] = useState(false);
  const [currentSuspiciousActivity, setCurrentSuspiciousActivity] = useState<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: Date;
  } | null>(null);
  const [suspiciousAlertCount, setSuspiciousAlertCount] = useState(0);
  // Audio ref for alert sounds
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);

  // Helper functions
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper to get the current question based on order
  const getCurrentQuestion = () => {
    if (!exam || !questionOrder.length) return null;
    const qid = questionOrder[currentQuestionIndex];
    return exam.questions.find(q => q._id.toString() === qid) || null;
  };

  const isQuestionAnswered = (questionId: string) => {
    const answer = answers[questionId];
    if (!answer) return false;
    if (Array.isArray(answer)) return answer.length > 0;
    return answer.trim().length > 0;
  };

  // Answer handling
  const handleAnswerChange = (questionId: string, answer: string | string[]) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < (exam?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Track time when navigating
  const navigateToQuestion = useCallback((direction: 'next' | 'prev') => {
    const currentQuestionId = exam?.questions[currentQuestionIndex]._id;
    const now = Date.now();
    if (currentQuestionId && questionStartTimes[currentQuestionId]) {
      const timeSpent = Math.round((now - questionStartTimes[currentQuestionId]) / 1000);
      setQuestionTimeSpent(prev => ({
        ...prev,
        [currentQuestionId]: (prev[currentQuestionId] || 0) + timeSpent
      }));
    }
    if (direction === 'next' && currentQuestionIndex < (exam?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      const newQuestionId = exam?.questions[currentQuestionIndex + 1]?._id;
      if (newQuestionId) {
        setQuestionStartTimes(prev => ({ ...prev, [newQuestionId]: now }));
      }
    } else if (direction === 'prev' && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      const newQuestionId = exam?.questions[currentQuestionIndex - 1]?._id;
      if (newQuestionId) {
        setQuestionStartTimes(prev => ({ ...prev, [newQuestionId]: now }));
      }
    }
  }, [exam, currentQuestionIndex, questionStartTimes]);

  const handleGrantPermissions = async () => {
    if (!exam) return;
    // Webcam
    if (exam.requireWebcam) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setWebcamStream(stream);
      } catch (err) {
        alert('Webcam access is required.');
        return;
      }
    }
    // Fullscreen (move request here, as part of permissions)
    if (exam.requireFullscreen && fullscreenRef.current) {
      try {
        await fullscreenRef.current.requestFullscreen?.();
      } catch (err) {
        setShowFullscreenWarning(true);
      }
    }
    setShowPermissions(false);
    setPermissionsGranted(true);
  };

  // Auto-submit when time is up
  const handleAutoSubmit = useCallback(async () => {
    if (!exam) return;
    
    try {
      const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
        questionId: questionId,
        answer: answer
      }));
      
      const resultData = {
        examId: exam._id,
        answers: answersArray,
        submittedAt: new Date().toISOString(),
        totalQuestions: exam.questions.length,
        answeredQuestions: Object.keys(answers).length,
        proctorEvents: suspiciousActivities.map(activity => ({
          type: activity.type,
          description: activity.description,
          severity: activity.severity,
          timestamp: activity.timestamp.toISOString()
        }))
      };
      
      const response = await apiService.results.submitResult(resultData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to auto-submit exam');
      }
      
      alert('Time is up! Exam has been automatically submitted.');
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to auto-submit exam:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit exam. Please contact your instructor.';
      alert(errorMessage);
      navigate('/dashboard');
    }
  }, [exam, answers, navigate, suspiciousActivities]);

  // Exit fullscreen function
  const exitFullscreen = async () => {
    try {
      // Remove CSS class
      document.body.classList.remove('exam-fullscreen');
      
      // Exit fullscreen for all browser variants
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
    } catch (error) {
      console.error('Failed to exit fullscreen:', error);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!exam || !sessionKey || isSubmitting) return;
    setIsSubmitting(true);
    
    // Stop camera and webcam stream
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
    
    // Exit fullscreen when exam is submitted
    await exitFullscreen();
    
    try {
      const currentQuestionId = exam.questions[currentQuestionIndex]._id;
      const now = Date.now();
      let finalQuestionTimeSpent = { ...questionTimeSpent };
      if (questionStartTimes[currentQuestionId]) {
        const timeSpent = Math.round((now - questionStartTimes[currentQuestionId]) / 1000);
        finalQuestionTimeSpent[currentQuestionId] = (finalQuestionTimeSpent[currentQuestionId] || 0) + timeSpent;
      }
      const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
        questionId: questionId,
        answer: Array.isArray(answer) ? answer : answer,
        timeSpent: finalQuestionTimeSpent[questionId] || 0,
        isLocked: lockedQuestions[questionId] || false
      }));
      const resultData = {
        examId: exam._id,
        answers: answersArray,
        submittedAt: new Date().toISOString(),
        totalQuestions: exam.questions.length,
        answeredQuestions: Object.keys(answers).length,
        proctorEvents: suspiciousActivities.map(activity => ({
          type: activity.type,
          description: activity.description,
          severity: activity.severity,
          timestamp: activity.timestamp.toISOString()
        }))
      };
      const response = await apiService.results.submitResult(resultData);
      if (!response.success) {
        throw new Error(response.error || 'Failed to submit exam');
      }
      setAttemptMessage(response.message || 'Exam submitted.');
      localStorage.removeItem(sessionKey);
      if (response.redirect) {
        navigate('/dashboard');
        return;
      }
      setIsTestEnded(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 3500);
    } catch (error) {
      console.error('Failed to submit exam:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit exam. Please contact your instructor.';
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
      setShowConfirmSubmit(false);
    }
  }, [exam, answers, currentQuestionIndex, questionTimeSpent, questionStartTimes, sessionKey, navigate, isSubmitting, webcamStream, exitFullscreen, suspiciousActivities]);

  // Load exam data
  const loadExam = useCallback(async () => {
    if (!examId) return;
    let testId = location.state?.testId;
    try {
      setIsLoading(true);
      let examData;
      let progress = null;
      if (user) {
        // Try to fetch progress first
        const progressRes = await apiService.exams.getProgress(examId);
        if (progressRes.success && progressRes.data) {
          progress = progressRes.data;
        }
      }
      if (!user) {
        // Not logged in: fetch public exam info
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://examproctor-backend-e6mh.onrender.com/api'}/exams/${examId}/public`);
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to load exam');
        examData = data.data;
      } else {
        // Logged in: use startExam logic (which now returns progress if exists)
        const response = await apiService.exams.startExam(examId, testId);
        if (!response.success) throw new Error(response.error || 'Failed to start exam');
        examData = response.data;
      }
      const transformedQuestions = examData.questions.map((q: any) => ({
        _id: q._id,
        questionText: q.questionText || q.question,
        questionType: q.questionType || q.type,
        options: q.options,
        points: q.points,
        timeLimit: q.timeLimit,
        allowNavigation: q.allowNavigation
      }));
      const transformedExam = {
        ...examData,
        questions: transformedQuestions
      };
      setExam(transformedExam);
      // Restore progress if present
      if (progress) {
        if (progress.answers) setAnswers(progress.answers);
        if (typeof progress.timeLeft === 'number') setTimeLeft(progress.timeLeft);
        if (typeof progress.currentQuestionIndex === 'number') setCurrentQuestionIndex(progress.currentQuestionIndex);
      } else if (examData.answers || typeof examData.timeLeft === 'number' || typeof examData.currentQuestionIndex === 'number') {
        // If backend startExam returns progress fields
        if (examData.answers) setAnswers(examData.answers);
        if (typeof examData.timeLeft === 'number') setTimeLeft(examData.timeLeft);
        else setTimeLeft(examData.duration * 60);
        if (typeof examData.currentQuestionIndex === 'number') setCurrentQuestionIndex(examData.currentQuestionIndex);
      } else {
        setTimeLeft(examData.duration * 60);
      }
      // Always enter fullscreen mode for Sequential Exam
      if (fullscreenRef.current) {
        try {
          await fullscreenRef.current.requestFullscreen();
        } catch (error) {
          console.error('Failed to enter fullscreen:', error);
        }
      }
    } catch (error) {
      console.error('Failed to load exam:', error);
      let errorMessage = 'Failed to load exam. Please try again.';
      if (error instanceof Error && error.message.includes('Exam is not available at this time')) {
        errorMessage = 'This exam is no longer available. If you missed the scheduled time, please check the Unattempted Exams section in My Exams.';
      }
      alert(errorMessage);
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [examId, navigate, location.state, user]);

  // Hide warning message after 10 seconds
  useEffect(() => {
    if (showWarningMessage) {
      const timer = setTimeout(() => {
        setShowWarningMessage(false);
      }, 10000); // 10 seconds

      return () => clearTimeout(timer);
    }
  }, [showWarningMessage]);

  // Always enter fullscreen mode when component mounts
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        // Try multiple fullscreen methods for better browser compatibility
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if ((document.documentElement as any).webkitRequestFullscreen) {
          await (document.documentElement as any).webkitRequestFullscreen();
        } else if ((document.documentElement as any).mozRequestFullScreen) {
          await (document.documentElement as any).mozRequestFullScreen();
        } else if ((document.documentElement as any).msRequestFullscreen) {
          await (document.documentElement as any).msRequestFullscreen();
        }
        
        // Also try the container element
        if (fullscreenRef.current) {
          if (fullscreenRef.current.requestFullscreen) {
            await fullscreenRef.current.requestFullscreen();
          } else if ((fullscreenRef.current as any).webkitRequestFullscreen) {
            await (fullscreenRef.current as any).webkitRequestFullscreen();
          } else if ((fullscreenRef.current as any).mozRequestFullScreen) {
            await (fullscreenRef.current as any).mozRequestFullScreen();
          } else if ((fullscreenRef.current as any).msRequestFullscreen) {
            await (fullscreenRef.current as any).msRequestFullscreen();
          }
        }
      } catch (error) {
        console.error('Failed to enter fullscreen:', error);
      }
    };

    // Small delay to ensure component is fully mounted
    const timer = setTimeout(enterFullscreen, 500);
    return () => clearTimeout(timer);
  }, []);

  // Global suspicious activity reporting function
  const reportSuspiciousActivity = useCallback((type: string, description: string, severity: 'low' | 'medium' | 'high' = 'medium') => {
    if (exam && user) {
      // Store activity locally
      const activity = {
        type,
        description,
        severity,
        timestamp: new Date()
      };
      setSuspiciousActivities(prev => [...prev, activity]);

      // Show real-time alert to student
      setCurrentSuspiciousActivity(activity);
      setShowSuspiciousAlert(true);
      setSuspiciousAlertCount(prev => prev + 1);

      // Play alert sound for medium and high severity activities
      if (severity === 'high' || severity === 'medium') {
        try {
          // Create a simple beep sound using Web Audio API
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(severity === 'high' ? 800 : 600, audioContext.currentTime);
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
          console.log('Audio alert failed:', error);
        }
      }

      // Auto-hide alert after 5 seconds for low severity, 8 seconds for medium, 10 seconds for high
      const alertDuration = severity === 'low' ? 5000 : severity === 'medium' ? 8000 : 10000;
      setTimeout(() => {
        setShowSuspiciousAlert(false);
        setCurrentSuspiciousActivity(null);
      }, alertDuration);

      // Emit real-time event to proctors
      if (socket) {
        socket.emit('student-activity', {
          examId: exam._id,
          studentId: user.id,
          studentName: user.name,
          type,
          description,
          severity,
          timestamp: new Date()
        });
      }
    }
  }, [exam, user, socket]);

  // Enhanced Security measures with suspicious activity tracking
  useEffect(() => {

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setWarnings(prev => prev + 1);
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 3000);
        
        // Report tab switch as suspicious activity
        reportSuspiciousActivity(
          'tab-switch',
          'Student switched to another tab or application',
          'medium'
        );
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      reportSuspiciousActivity(
        'context-menu',
        'Student attempted to access browser context menu',
        'low'
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.key === 'F11') {
        e.preventDefault();
        reportSuspiciousActivity(
          'keyboard-shortcut',
          `Student attempted to use keyboard shortcut: ${e.key}`,
          'medium'
        );
      }
    };

    // Track mouse movements outside exam area
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 || e.clientX <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        reportSuspiciousActivity(
          'mouse-outside',
          'Student moved cursor outside exam window',
          'low'
        );
      }
    };

    // Track fullscreen exit attempts
    const handleFullscreenChange = () => {
      const isFullscreen = !!(
        document.fullscreenElement || 
        (document as any).webkitFullscreenElement || 
        (document as any).mozFullScreenElement || 
        (document as any).msFullscreenElement
      );
      
      if (!isFullscreen && exam?.requireFullscreen) {
        reportSuspiciousActivity(
          'fullscreen-exit',
          'Student exited fullscreen mode',
          'high'
        );
      }
    };

    // Track window resize (potential attempt to see other windows)
    const handleResize = () => {
      reportSuspiciousActivity(
        'window-resize',
        'Student resized browser window',
        'low'
      );
    };

    // Track focus loss (potential alt-tab or clicking outside)
    const handleBlur = () => {
      reportSuspiciousActivity(
        'window-blur',
        'Student clicked outside exam window or switched applications',
        'medium'
      );
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    window.addEventListener('resize', handleResize);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('blur', handleBlur);
    };
  }, [exam, user, socket]);

  // Enhanced proctoring features with comprehensive suspicious activity tracking
  useEffect(() => {
    if (!exam) return;

    const handleTabSwitch = () => {
      if (exam.preventTabSwitch && document.hidden) {
        reportSuspiciousActivity(
          'tab-switch',
          'Student switched to another tab or application',
          'medium'
        );
        setWarnings(prev => prev + 1);
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 3000);
        if (exam.autoTerminateOnSuspicious) handleSubmit();
      }
    };

    const handleCopyPaste = (e: ClipboardEvent) => {
      if (exam.preventCopyPaste) {
        reportSuspiciousActivity(
          'copy-paste',
          'Student attempted to copy/paste content',
          'medium'
        );
        e.preventDefault();
        setWarnings(prev => prev + 1);
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 3000);
        if (exam.autoTerminateOnSuspicious) handleSubmit();
      }
    };

    // Track rapid mouse movements (potential cheating)
    let mouseMoveCount = 0;
    let mouseMoveTimer: NodeJS.Timeout | null = null;
    
    const handleMouseMove = () => {
      mouseMoveCount++;
      if (mouseMoveTimer) clearTimeout(mouseMoveTimer);
      
      mouseMoveTimer = setTimeout(() => {
        if (mouseMoveCount > 50) { // More than 50 movements in 1 second
          reportSuspiciousActivity(
            'rapid-mouse-movement',
            'Unusual rapid mouse movement detected',
            'low'
          );
        }
        mouseMoveCount = 0;
      }, 1000);
    };

    // Track keyboard activity patterns
    let keyPressCount = 0;
    let keyPressTimer: NodeJS.Timeout | null = null;
    
    const handleKeyPress = () => {
      keyPressCount++;
      if (keyPressTimer) clearTimeout(keyPressTimer);
      
      keyPressTimer = setTimeout(() => {
        if (keyPressCount > 100) { // More than 100 key presses in 1 second
          reportSuspiciousActivity(
            'rapid-key-press',
            'Unusual rapid keyboard activity detected',
            'low'
          );
        }
        keyPressCount = 0;
      }, 1000);
    };

    // Track scroll behavior (potential attempt to see hidden content)
    let scrollCount = 0;
    let scrollTimer: NodeJS.Timeout | null = null;
    
    const handleScroll = () => {
      scrollCount++;
      if (scrollTimer) clearTimeout(scrollTimer);
      
      scrollTimer = setTimeout(() => {
        if (scrollCount > 20) { // More than 20 scrolls in 1 second
          reportSuspiciousActivity(
            'excessive-scrolling',
            'Excessive scrolling behavior detected',
            'low'
          );
        }
        scrollCount = 0;
      }, 1000);
    };

    // Track if student tries to open developer tools
    const handleDevTools = () => {
      reportSuspiciousActivity(
        'dev-tools',
        'Student attempted to open developer tools',
        'high'
      );
    };

    // Track if student tries to print
    const handlePrint = () => {
      reportSuspiciousActivity(
        'print-attempt',
        'Student attempted to print exam content',
        'medium'
      );
    };

    if (exam.preventTabSwitch) {
      document.addEventListener('visibilitychange', handleTabSwitch);
    }

    if (exam.preventCopyPaste) {
      document.addEventListener('copy', handleCopyPaste);
      document.addEventListener('paste', handleCopyPaste);
    }

    // Add comprehensive monitoring
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keypress', handleKeyPress);
    document.addEventListener('scroll', handleScroll);
    window.addEventListener('beforeprint', handlePrint);

    // Detect developer tools (basic detection)
    let devtools = { open: false, orientation: null };
    setInterval(() => {
      const threshold = 160;
      if (window.outerHeight - window.innerHeight > threshold || window.outerWidth - window.innerWidth > threshold) {
        if (!devtools.open) {
          devtools.open = true;
          handleDevTools();
        }
      } else {
        devtools.open = false;
      }
    }, 1000);

    return () => {
      if (exam.preventTabSwitch) {
        document.removeEventListener('visibilitychange', handleTabSwitch);
      }
      if (exam.preventCopyPaste) {
        document.removeEventListener('copy', handleCopyPaste);
        document.removeEventListener('paste', handleCopyPaste);
      }
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keypress', handleKeyPress);
      document.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeprint', handlePrint);
      
      if (mouseMoveTimer) clearTimeout(mouseMoveTimer);
      if (keyPressTimer) clearTimeout(keyPressTimer);
      if (scrollTimer) clearTimeout(scrollTimer);
    };
  }, [exam, user, socket, handleSubmit]);

  // Face detection
  useEffect(() => {
    let running = true;
    let detector: any = null;
    
    async function runFaceMesh() {
      if (!exam?.detectHeadMovement || !webcamStream) return;
      
      detector = await createDetector(SupportedModels.MediaPipeFaceMesh, {
        runtime: 'mediapipe',
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
        refineLandmarks: true,
      });
      if (videoRef.current && webcamStream) {
        videoRef.current.srcObject = webcamStream;
        videoRef.current.play();
        detectFace();
      }
    }

    async function detectFace() {
      if (!detector || !videoRef.current || !running) return;
      while (running) {
        const faces = await detector.estimateFaces(videoRef.current);
        if (!faces || faces.length === 0) {
          if (exam) {
            // Store activity locally
            const activity = {
              type: 'face-not-detected',
              description: 'Student face not detected in camera',
              severity: 'high' as const,
              timestamp: new Date()
            };
            setSuspiciousActivities(prev => [...prev, activity]);

            // Emit real-time event to proctors
            if (socket) {
              socket.emit('student-activity', {
                examId: exam._id,
                studentId: user?.id,
                studentName: user?.name,
                type: 'face-not-detected',
                description: 'Student face not detected in camera',
                severity: 'high',
                timestamp: new Date()
              });
            }
            
            if (exam.autoTerminateOnSuspicious) handleSubmit();
          }
        } else if (faces.length > 1) {
          // Multiple faces detected
          if (exam) {
            // Store activity locally
            const activity = {
              type: 'multiple-faces',
              description: 'Multiple faces detected in camera',
              severity: 'high' as const,
              timestamp: new Date()
            };
            setSuspiciousActivities(prev => [...prev, activity]);

            // Emit real-time event to proctors
            if (socket) {
              socket.emit('student-activity', {
                examId: exam._id,
                studentId: user?.id,
                studentName: user?.name,
                type: 'multiple-faces',
                description: 'Multiple faces detected in camera',
                severity: 'high',
                timestamp: new Date()
              });
            }
          }
        }
        await new Promise(res => setTimeout(res, 1000));
      }
    }

    if (exam?.detectHeadMovement && webcamStream) {
      runFaceMesh();
    }

    return () => {
      running = false;
      if (detector && detector.dispose) detector.dispose();
    };
  }, [exam, webcamStream, user, handleSubmit]);

  // Timer effects
  useEffect(() => {
    loadExam();
  }, [loadExam]);

  useEffect(() => {
    if (exam && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [exam, timeLeft, handleAutoSubmit]);

  // Add useEffect for per-question timer
  useEffect(() => {
    if (!exam || !exam.timePerQuestion) return;
    
    const currentQ = getCurrentQuestion();
    if (!currentQ) return;
    
    // Default time limit per question (in seconds) - can be configured
    const defaultTimeLimit = 60; // 1 minute per question
    const limit = currentQ.timeLimit || defaultTimeLimit;
    
    // Only start timer if question is not already locked
    if (!lockedQuestions[currentQ._id]) {
      setQuestionTimeLeft(limit);
      
      let qTimer: NodeJS.Timeout | null = null;
      qTimer = setInterval(() => {
        setQuestionTimeLeft(prev => {
          if (prev <= 1) {
            // Time's up for this question - lock it and move to next
            setLockedQuestions(prev => ({ ...prev, [currentQ._id]: true }));
            
            // Auto-move to next question or submit if last question
            if (currentQuestionIndex < exam.questions.length - 1) {
              setCurrentQuestionIndex(idx => idx + 1);
            } else {
              // Last question - submit exam
              handleSubmit();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => { 
        if (qTimer) clearInterval(qTimer); 
      };
    }
  }, [exam, currentQuestionIndex, handleSubmit, lockedQuestions]);

  // Start timing first question on load
  useEffect(() => {
    if (exam && exam.questions.length > 0) {
      const firstQuestionId = exam.questions[0]._id;
      setQuestionStartTimes(prev => ({ ...prev, [firstQuestionId]: Date.now() }));
    }
  }, [exam]);

  // When exam data is loaded, set question order
  useEffect(() => {
    if (exam && exam.questionOrder && Array.isArray(exam.questionOrder)) {
      setQuestionOrder(exam.questionOrder.map(qid => qid.toString()));
    } else if (exam && exam.questions) {
      setQuestionOrder(exam.questions.map(q => q._id.toString()));
    }
  }, [exam]);

  // Save progress to backend every second (throttled)
  useEffect(() => {
    if (!user || !exam) return;
    const interval = setInterval(() => {
      const progress = {
        answers,
        timeLeft,
        currentQuestionIndex,
        startedAt: exam.startTime || new Date().toISOString()
      };
      apiService.exams.saveProgress(exam._id, progress).catch(() => {});
    }, 1000);
    return () => clearInterval(interval);
  }, [user, exam, answers, timeLeft, currentQuestionIndex]);

  // Robust fullscreen enforcement
  useEffect(() => {
    if (exam?.requireFullscreen && permissionsGranted && fullscreenRef.current) {
      const enforceFullscreen = async () => {
        const isFs = !!(
          document.fullscreenElement || 
          (document as any).webkitFullscreenElement || 
          (document as any).mozFullScreenElement || 
          (document as any).msFullscreenElement
        );
        
        if (!isFs) {
          try {
            if (fullscreenRef.current?.requestFullscreen) {
              await fullscreenRef.current.requestFullscreen();
            } else if ((fullscreenRef.current as any)?.webkitRequestFullscreen) {
              await (fullscreenRef.current as any).webkitRequestFullscreen();
            } else if ((fullscreenRef.current as any)?.mozRequestFullScreen) {
              await (fullscreenRef.current as any).mozRequestFullScreen();
            } else if ((fullscreenRef.current as any)?.msRequestFullscreen) {
              await (fullscreenRef.current as any).msRequestFullscreen();
            }
          } catch (error) {
            setShowFullscreenWarning(true);
          }
        }
      };
      
      // Try immediately
      enforceFullscreen();
      
      // Also try on user interaction (required by some browsers)
      const handleUserInteraction = () => {
        enforceFullscreen();
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
      };
      
      document.addEventListener('click', handleUserInteraction);
      document.addEventListener('keydown', handleUserInteraction);
      
      return () => {
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
      };
    }
  }, [exam, permissionsGranted]);

  // Listen for fullscreenchange and re-request if exited
  useEffect(() => {
    if (!exam?.requireFullscreen || !permissionsGranted) return;
    
    const handleFsChange = () => {
      const isFs = !!(
        document.fullscreenElement || 
        (document as any).webkitFullscreenElement || 
        (document as any).mozFullScreenElement || 
        (document as any).msFullscreenElement
      );
      setIsActuallyFullscreen(isFs);
      
      if (!isFs && fullscreenRef.current) {
        setShowFullscreenWarning(true);
        // Try to re-enter fullscreen
        const enterFullscreen = async () => {
          try {
            if (fullscreenRef.current?.requestFullscreen) {
              await fullscreenRef.current.requestFullscreen();
            } else if ((fullscreenRef.current as any)?.webkitRequestFullscreen) {
              await (fullscreenRef.current as any).webkitRequestFullscreen();
            } else if ((fullscreenRef.current as any)?.mozRequestFullScreen) {
              await (fullscreenRef.current as any).mozRequestFullScreen();
            } else if ((fullscreenRef.current as any)?.msRequestFullscreen) {
              await (fullscreenRef.current as any).msRequestFullscreen();
            }
          } catch (error) {
            setShowFullscreenWarning(true);
          }
        };
        enterFullscreen();
      } else {
        setShowFullscreenWarning(false);
      }
    };
    
    // Add listeners for all browser variants
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);
    
    // Set initial state
    const isFs = !!(
      document.fullscreenElement || 
      (document as any).webkitFullscreenElement || 
      (document as any).mozFullScreenElement || 
      (document as any).msFullscreenElement
    );
    setIsActuallyFullscreen(isFs);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, [exam, permissionsGranted]);

  // Always request fullscreen on mount for all exams
  useEffect(() => {
    const enterFullscreen = async () => {
      if (fullscreenRef.current) {
        try {
          // Try multiple fullscreen methods
          if (fullscreenRef.current.requestFullscreen) {
            await fullscreenRef.current.requestFullscreen();
          } else if ((fullscreenRef.current as any).webkitRequestFullscreen) {
            await (fullscreenRef.current as any).webkitRequestFullscreen();
          } else if ((fullscreenRef.current as any).mozRequestFullScreen) {
            await (fullscreenRef.current as any).mozRequestFullScreen();
          } else if ((fullscreenRef.current as any).msRequestFullscreen) {
            await (fullscreenRef.current as any).msRequestFullscreen();
          }
          
          // Add CSS class to hide browser UI
          document.body.classList.add('exam-fullscreen');
        } catch (error) {
          console.error('Failed to enter fullscreen:', error);
        }
      }
    };

    // Small delay to ensure component is fully mounted
    const timer = setTimeout(enterFullscreen, 500);
    
    return () => {
      clearTimeout(timer);
      // Exit fullscreen when component unmounts
      exitFullscreen();
    };
  }, []);

  // Cleanup camera when component unmounts
  useEffect(() => {
    return () => {
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [webcamStream]);

  // Block exam UI if not in fullscreen (when required)
  const blockExamForFullscreen = exam?.requireFullscreen && permissionsGranted && !isActuallyFullscreen;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Preparing your exam...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Exam Not Found</h2>
          <p className="text-gray-600 mb-6">The requested exam could not be loaded. Please check with your instructor.</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (showPermissions && exam) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-lg w-full">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Exam Permissions & Proctoring</h2>
          <ul className="mb-6 list-disc pl-6 text-gray-700">
            {exam?.allowReview && <li>Allow students to review answers</li>}
            {exam?.showResults && <li>Show results immediately after submission</li>}
            {exam?.randomizeQuestions && <li>Randomize question order</li>}
            {exam?.timePerQuestion && <li>Set time limit per question</li>}
            {exam?.allowNavigation && <li>Allow question navigation</li>}
            {exam?.requireWebcam && <li>Require webcam access</li>}
            {exam?.preventTabSwitch && <li>Prevent tab switching</li>}
            {exam?.preventCopyPaste && <li>Prevent copy/paste</li>}
            {exam?.detectHeadMovement && <li>Detect head movement via webcam (AI)</li>}
            {exam?.requireFullscreen && <li>Enable fullscreen mode</li>}
            {exam?.autoTerminateOnSuspicious && <li>Auto-terminate exam on suspicious activity</li>}
          </ul>
          <button
            onClick={handleGrantPermissions}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Grant Permissions & Start Exam
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = getCurrentQuestion();

  // Helper: can navigate to a question index?
  const canNavigateTo = (idx: number) => {
    const qid = questionOrder[idx];
    if (lockedQuestions[qid]) return false;
    if (exam?.allowNavigation === false) {
      // Only allow current or next unlocked question
      if (idx === currentQuestionIndex) return true;
      if (idx === currentQuestionIndex + 1 && !lockedQuestions[qid]) return true;
      return false;
    }
    return true;
  };

  // Update navigation panel: disable all except current and next if navigation is not allowed
  // Update Previous/Next buttons: Previous is disabled if navigation is not allowed, Next only works for next unlocked question

  // Mark for Review toggle
  const handleToggleReview = () => {
    const currentQ = getCurrentQuestion();
    if (!currentQ) return;
    const qid = currentQ._id.toString();
    setReviewQuestions(prev => ({ ...prev, [qid]: !prev[qid] }));
  };

  // Clear Response
  const handleClearResponse = () => {
    const currentQ = getCurrentQuestion();
    if (!currentQ) return;
    const qid = currentQ._id.toString();
    setAnswers(prev => ({ ...prev, [qid]: '' }));
  };

  // In navigation panel, show marked questions in red
  // In footer, Mark for Review toggles review state; if marked, button says Unmark for Review
  // Clear Response clears answer for current question

  return (
    <>
      {/* Fullscreen overlay to hide browser UI */}
      {(
        document.fullscreenElement || 
        (document as any).webkitFullscreenElement || 
        (document as any).mozFullScreenElement || 
        (document as any).msFullscreenElement
      ) && (
        <div 
          className="fixed inset-0 bg-white z-[9998] pointer-events-none"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 9998,
            backgroundColor: 'white'
          }}
        />
      )}
      
      <div 
        className="min-h-screen bg-gray-50 overflow-y-auto exam-container" 
        ref={fullscreenRef}
        style={{
          // Hide browser UI elements in fullscreen
          ...((
            document.fullscreenElement || 
            (document as any).webkitFullscreenElement || 
            (document as any).mozFullScreenElement || 
            (document as any).msFullscreenElement
          ) && {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 9999,
            backgroundColor: 'white',
            overflow: 'hidden'
          })
        }}
      >
      {blockExamForFullscreen && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex flex-col items-center justify-center">
          <div className="p-8 rounded-lg shadow-lg bg-white border border-red-400 text-center">
            <div className="text-2xl font-bold text-red-700 mb-2">Fullscreen Required</div>
            <div className="text-red-700 text-lg mb-4">Please enable fullscreen mode to continue the exam.<br/>Press F11 or use your browser menu to enter fullscreen.</div>
            <button
              className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
              onClick={() => fullscreenRef.current?.requestFullscreen?.()}
            >
              Enter Fullscreen
            </button>
          </div>
        </div>
      )}
      {/* Attempt Info Message */}
      <div className="max-w-7xl mx-auto pt-24 px-6">
        {showWarningMessage && (
          <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded shadow-sm text-yellow-800 text-sm font-medium">
            Only your first attempt will be counted. Further attempts are for practice only.
          </div>
        )}
        {attemptMessage && (
          <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded shadow-sm text-blue-800 text-base font-semibold">
            {attemptMessage}
          </div>
        )}
        
        {/* Proctoring Status Indicator */}
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-700">Proctoring Active</span>
          </div>
          <div className="text-xs text-gray-500">
            Monitoring: Tab switches, Fullscreen, Copy/Paste, Mouse movements, Keyboard activity
          </div>
        </div>
      </div>
      {/* Header */}
      <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="font-medium text-gray-700">{exam?.title}</div>
          </div>
          
          <div className="flex items-center space-x-6">
            {/* Suspicious Activity Counter */}
            {suspiciousAlertCount > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-500">Suspicious Activities:</span>
                <span className={`text-sm font-semibold px-2 py-1 rounded-full ${
                  suspiciousAlertCount >= 5 ? 'bg-red-100 text-red-700' : 
                  suspiciousAlertCount >= 3 ? 'bg-yellow-100 text-yellow-700' : 
                  'bg-blue-100 text-blue-700'
                }`}>
                  {suspiciousAlertCount}
                </span>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-500">Time Remaining:</span>
              <span className={`text-lg font-mono font-semibold px-3 py-1 rounded ${timeLeft < 300 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-500">Question:</span>
              <span className="text-lg font-medium">
                {currentQuestionIndex + 1} / {exam?.questions.length ?? 0}
              </span>
            </div>
            
            <button 
              onClick={() => setShowConfirmSubmit(true)} 
              disabled={isSubmitting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              Submit Exam
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-24 w-full p-4 sm:p-6 lg:p-8 overflow-y-auto min-h-screen">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Question Panel */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {currentQuestion && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-500">Question {currentQuestionIndex + 1}</h3>
                  {exam?.timePerQuestion && (
                    <div className={`text-sm font-medium ${questionTimeLeft <= 10 ? 'text-red-600' : 'text-gray-500'}`}>
                      Time for this question: {formatTime(questionTimeLeft)}
                      {lockedQuestions[currentQuestion._id] && (
                        <span className="ml-2 text-red-600 font-bold">(TIME'S UP!)</span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className={`mb-6 p-4 rounded-lg border ${
                  lockedQuestions[currentQuestion._id] 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-blue-50 border-blue-100'
                }`}>
                  <p className="text-gray-800 font-medium">{currentQuestion.questionText}</p>
                  {lockedQuestions[currentQuestion._id] && (
                    <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
                      ⚠️ Time's up for this question. You can no longer answer it.
                    </div>
                  )}
                </div>
                
                {/* Answer Options */}
                <div className="space-y-4">
                  {currentQuestion.questionType === 'multiple-choice' && currentQuestion.options && (
                    <div className="grid grid-cols-1 gap-3">
                      {currentQuestion.options.map((option, index) => (
                        <label key={index} className={`flex items-start p-4 border rounded-lg transition-all ${
                          lockedQuestions[currentQuestion._id] 
                            ? 'opacity-50 cursor-not-allowed bg-gray-100' 
                            : 'cursor-pointer hover:bg-gray-50'
                        } ${answers[currentQuestion._id] === option ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                          <input
                            type="radio"
                            name={`question-${currentQuestion._id}`}
                            value={option}
                            checked={answers[currentQuestion._id] === option}
                            onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value)}
                            disabled={lockedQuestions[currentQuestion._id]}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                          />
                          <span className="ml-3 text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  
                  {currentQuestion.questionType === 'multiple-correct' && currentQuestion.options && (
                    <div className="grid grid-cols-1 gap-3">
                      {currentQuestion.options.map((option, index) => (
                        <label key={index} className={`flex items-start p-4 border rounded-lg transition-all ${
                          lockedQuestions[currentQuestion._id] 
                            ? 'opacity-50 cursor-not-allowed bg-gray-100' 
                            : 'cursor-pointer hover:bg-gray-50'
                        } ${Array.isArray(answers[currentQuestion._id]) && (answers[currentQuestion._id] as string[]).includes(option) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                          <input
                            type="checkbox"
                            name={`question-${currentQuestion._id}`}
                            value={option}
                            checked={Array.isArray(answers[currentQuestion._id]) && (answers[currentQuestion._id] as string[]).includes(option)}
                            onChange={e => {
                              let prevAns: string[] = Array.isArray(answers[currentQuestion._id]) ? [...(answers[currentQuestion._id] as string[])] : [];
                              if (e.target.checked) {
                                prevAns.push(option);
                              } else {
                                prevAns = prevAns.filter(ans => ans !== option);
                              }
                              handleAnswerChange(currentQuestion._id, prevAns);
                            }}
                            disabled={lockedQuestions[currentQuestion._id]}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                          />
                          <span className="ml-3 text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  
                  {currentQuestion.questionType === 'true-false' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {['true', 'false'].map((val) => (
                        <label key={val} className={`flex items-start p-4 border rounded-lg transition-all ${
                          lockedQuestions[currentQuestion._id] 
                            ? 'opacity-50 cursor-not-allowed bg-gray-100' 
                            : 'cursor-pointer hover:bg-gray-50'
                        } ${answers[currentQuestion._id] === val ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                          <input
                            type="radio"
                            name={`question-${currentQuestion._id}`}
                            value={val}
                            checked={answers[currentQuestion._id] === val}
                            onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value)}
                            disabled={lockedQuestions[currentQuestion._id]}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                          />
                          <span className="ml-3 text-gray-700 font-medium">{val === 'true' ? 'True' : 'False'}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  
                  {(currentQuestion.questionType === 'short-answer' || currentQuestion.questionType === 'essay') && (
                    <textarea 
                      value={answers[currentQuestion._id] as string || ''} 
                      onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value)} 
                      placeholder={currentQuestion.questionType === 'short-answer' ? "Enter your answer here..." : "Write your detailed answer here..."}
                      disabled={lockedQuestions[currentQuestion._id]}
                      className={`w-full p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                        lockedQuestions[currentQuestion._id] 
                          ? 'border-gray-200 bg-gray-100 opacity-50' 
                          : 'border-gray-300'
                      }`}
                      rows={currentQuestion.questionType === 'essay' ? 8 : 4}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Sidebar */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
              {/* Proctoring Section */}
              {exam?.requireWebcam && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Proctoring</h3>
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-2">
                    <Webcam 
                      audio={false} 
                      className="w-full h-full object-cover"
                      screenshotFormat="image/jpeg"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mb-3">Your activity is being monitored during this exam</p>
                  {/* Proctor Message Section */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-2 shadow-sm">
                    <div className="flex items-center mb-2">
                      <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12c0 4.418-4.03 8-9 8s-9-3.582-9-8 4.03-8 9-8 9 3.582 9 8z" /></svg>
                      <span className="text-sm font-semibold text-blue-700">Proctor Message</span>
                    </div>
                    <div className="text-gray-700 text-sm min-h-[32px]">No new messages from proctor.</div>
                  </div>
                </div>
              )}
              
              {/* Navigation */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Questions</h3>
                <div className="grid grid-cols-5 gap-2">
                  {exam?.questions.map((q, idx) => (
                    <button
                      key={q._id}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      disabled={exam?.allowNavigation === false || lockedQuestions[q._id.toString()]}
                      className={`h-8 rounded-md font-medium text-sm flex items-center justify-center transition-colors
                        ${idx === currentQuestionIndex ? 'bg-blue-600 text-white' : 
                          lockedQuestions[q._id.toString()] ? 'bg-red-100 text-red-800 border border-red-300' :
                          isQuestionAnswered(q._id) ? 'bg-green-100 text-green-800 border border-green-200' : 
                          'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'}
                        ${(exam?.allowNavigation === false || lockedQuestions[q._id.toString()]) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={lockedQuestions[q._id.toString()] ? 'Question timed out' : ''}
                    >
                      {idx + 1}
                      {lockedQuestions[q._id.toString()] && (
                        <span className="ml-1 text-xs">⏰</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Progress */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Progress</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Answered</span>
                    <span className="font-medium">{exam?.questions.filter(q => isQuestionAnswered(q._id)).length}/{exam?.questions.length ?? 0}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${(exam?.questions.filter(q => isQuestionAnswered(q._id)).length / (exam?.questions.length ?? 0)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Navigation Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-sm z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between">
          <button 
            onClick={handlePreviousQuestion} 
            disabled={currentQuestionIndex === 0 || exam?.allowNavigation === false || lockedQuestions[questionOrder[currentQuestionIndex]]}
            className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <div className="flex space-x-3">
            <button onClick={handleToggleReview} className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              {reviewQuestions[questionOrder[currentQuestionIndex]] ? 'Unmark for Review' : 'Mark for Review'}
            </button>
            <button onClick={handleClearResponse} className="px-5 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-200">
              Clear Response
            </button>
          </div>
          
          <button 
            onClick={handleNextQuestion} 
            disabled={currentQuestionIndex === exam?.questions.length - 1 || (exam?.allowNavigation === false && (!currentQuestion || !isQuestionAnswered(currentQuestion._id))) || lockedQuestions[questionOrder[currentQuestionIndex]]}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentQuestionIndex === exam?.questions.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </footer>

      {/* Modals */}
      {showWarning && (
        <div className="fixed inset-0 bg-red-600 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full text-center">
            <div className="text-red-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Warning: Tab Switch Detected</h3>
            <p className="text-gray-600 mb-4">You have switched tabs {warnings} time(s). Continued violations may result in exam termination.</p>
            <button 
              onClick={() => setShowWarning(false)}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* Suspicious Activity Alert */}
      {showSuspiciousAlert && currentSuspiciousActivity && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={`rounded-lg p-4 shadow-lg border-l-4 max-w-sm ${
            currentSuspiciousActivity.severity === 'high' 
              ? 'bg-red-50 border-red-500 text-red-800' 
              : currentSuspiciousActivity.severity === 'medium'
              ? 'bg-yellow-50 border-yellow-500 text-yellow-800'
              : 'bg-blue-50 border-blue-500 text-blue-800'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {currentSuspiciousActivity.severity === 'high' ? (
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                ) : currentSuspiciousActivity.severity === 'medium' ? (
                  <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3 flex-1">
                <h3 className={`text-sm font-medium ${
                  currentSuspiciousActivity.severity === 'high' 
                    ? 'text-red-800' 
                    : currentSuspiciousActivity.severity === 'medium'
                    ? 'text-yellow-800'
                    : 'text-blue-800'
                }`}>
                  {currentSuspiciousActivity.severity === 'high' ? 'High Risk Activity' : 
                   currentSuspiciousActivity.severity === 'medium' ? 'Medium Risk Activity' : 'Low Risk Activity'}
                </h3>
                <p className="text-sm mt-1">
                  {currentSuspiciousActivity.description}
                </p>
                <div className="mt-2 text-xs opacity-75">
                  Total alerts: {suspiciousAlertCount}
                </div>
              </div>
              <div className="ml-4 flex-shrink-0">
                <button
                  onClick={() => {
                    setShowSuspiciousAlert(false);
                    setCurrentSuspiciousActivity(null);
                  }}
                  className={`inline-flex rounded-md p-1.5 ${
                    currentSuspiciousActivity.severity === 'high' 
                      ? 'text-red-400 hover:bg-red-100' 
                      : currentSuspiciousActivity.severity === 'medium'
                      ? 'text-yellow-400 hover:bg-yellow-100'
                      : 'text-blue-400 hover:bg-blue-100'
                  }`}
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Submission</h3>
            <p className="text-gray-600 mb-6">You have answered {Object.keys(answers).length} out of {exam?.questions.length ?? 0} questions. Are you sure you want to submit your exam?</p>
            <div className="flex space-x-4">
              <button 
                onClick={() => setShowConfirmSubmit(false)} 
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Confirm Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
      {isTestEnded && (
        <div className="fixed inset-0 bg-white bg-opacity-80 z-50 flex flex-col items-center justify-center">
          <div className="p-8 rounded-lg shadow-lg bg-blue-50 border border-blue-200 text-center">
            <div className="text-2xl font-bold text-blue-700 mb-2">Test Ended</div>
            <div className="text-blue-700 text-lg">{attemptMessage || 'Thank you for your attempt.'}</div>
            <div className="mt-4 text-gray-500 text-sm">Redirecting to dashboard...</div>
          </div>
        </div>
      )}
      {exam?.detectHeadMovement && permissionsGranted && (
        <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
      )}
      </div>
    </>
  );
};

export default SequentialExam;