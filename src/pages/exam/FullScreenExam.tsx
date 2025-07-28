import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useProctor } from '../../contexts/ProctorContext';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';
import {
  ClockIcon,
  VideoCameraIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';

interface ExamQuestion {
  _id: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay';
  options?: string[];
  correctAnswer: string;
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
}

interface ExamSession {
  examId: string;
  startTime: Date;
  timeLeft: number;
  currentQuestion: number;
  answers: Record<string, string>;
  savedAnswers: Record<string, string>;
}

const FullScreenExam: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { startSession, addProctorEvent } = useProctor();
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [savedAnswers, setSavedAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [questionStartTimes, setQuestionStartTimes] = useState<Record<string, number>>({});
  const [questionTimeSpent, setQuestionTimeSpent] = useState<Record<string, number>>({});
  const [showWarning, setShowWarning] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sessionData, setSessionData] = useState<ExamSession | null>(null);

  // Check if exam was already submitted
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [submissionCheck, setSubmissionCheck] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get proctor setup data from navigation state
  useEffect(() => {
    if (location.state) {
      // setProctorSetup(location.state.proctorSetup); // This line was removed
    }
  }, [location.state]);

  // Check if student already submitted this exam
  useEffect(() => {
    const checkSubmission = async () => {
      if (!examId || !user) return;
      
      try {
        const response = await apiService.results.getUserResults();
        if (response.success) {
          const hasSubmitted = response.data.some((result: any) => 
            result.examId === examId || result.examId._id === examId
          );
          setExamSubmitted(hasSubmitted);
        }
      } catch (error) {
        console.error('Error checking submission:', error);
      } finally {
        setSubmissionCheck(false);
      }
    };

    checkSubmission();
  }, [examId, user]);

  // Check for existing session
  useEffect(() => {
    const checkExistingSession = async () => {
      if (!examId || !user) return;
      
      try {
        const sessionKey = `exam_session_${examId}_${user.id}`;
        const savedSession = localStorage.getItem(sessionKey);
        
        if (savedSession) {
          const session: ExamSession = JSON.parse(savedSession);
          const now = new Date();
          const sessionStart = new Date(session.startTime);
          const elapsedMinutes = (now.getTime() - sessionStart.getTime()) / (1000 * 60);
          const remainingTime = Math.max(0, session.timeLeft - elapsedMinutes);
          
          if (remainingTime > 0) {
            // Show resume option
            setSessionData({
              ...session,
              timeLeft: remainingTime
            });
          } else {
            // Session expired, clear it
            localStorage.removeItem(sessionKey);
          }
        }
      } catch (error) {
        console.error('Error checking existing session:', error);
      }
    };

    checkExistingSession();
  }, [examId, user]);

  // Fetch exam data
  useEffect(() => {
    const fetchExam = async () => {
      if (!examId) return;
      
      try {
        setLoading(true);
        const response = await apiService.exams.startExam(examId);
        if (response.success) {
          if (!response.data.questions || response.data.questions.length === 0) {
            alert('This exam has no questions. Please contact your instructor.');
            navigate('/dashboard');
            return;
          }
          
          setExam(response.data);
          setTimeLeft(response.data.duration * 60);
          
          // Start timing the first question
          if (response.data.questions.length > 0) {
            const firstQuestionId = response.data.questions[0]._id;
            setQuestionStartTimes(prev => ({
              ...prev,
              [firstQuestionId]: Date.now()
            }));
          }
        } else {
          alert('Failed to start exam. Please try again.');
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error starting exam:', error);
        alert('Error starting exam. Please try again.');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    if (!examSubmitted && !submissionCheck) {
      fetchExam();
    }
  }, [examId, navigate, examSubmitted, submissionCheck]);

  // Save session to localStorage
  const saveSession = useCallback((session: ExamSession) => {
    if (!examId || !user) return;
    
    const sessionKey = `exam_session_${examId}_${user.id}`;
    localStorage.setItem(sessionKey, JSON.stringify(session));
  }, [examId, user]);

  // Resume exam session
  const resumeExam = () => {
    if (!sessionData || !exam) return;
    
    setTimeLeft(sessionData.timeLeft);
    setCurrentQuestion(sessionData.currentQuestion);
    setAnswers(sessionData.answers);
    setSavedAnswers(sessionData.savedAnswers);
    setExamStarted(true);
    startSession(examId!);
    
    // Start timing the current question
    const currentQuestionId = exam.questions[sessionData.currentQuestion]._id;
    setQuestionStartTimes(prev => ({
      ...prev,
      [currentQuestionId]: Date.now()
    }));
    
    // Enter fullscreen
    enterFullscreen();
  };

  // Enter fullscreen mode
  const enterFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }
    setIsFullscreen(true);
  };

  // Disable ESC key in fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault();
        setShowExitWarning(true);
        addProctorEvent({
          sessionId: examId || '1',
          type: 'escape-attempt',
          severity: 'high',
          description: 'Student attempted to exit fullscreen mode'
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, addProctorEvent, examId]);

  // Monitor fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Save answer and allow navigation
  const saveAnswer = async () => {
    if (!exam) return;
    
    const currentQuestionData = exam.questions[currentQuestion];
    const currentAnswer = answers[currentQuestionData._id];
    
    if (currentAnswer && currentAnswer !== savedAnswers[currentQuestionData._id]) {
      setSaving(true);
      
      // Simulate save delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSavedAnswers(prev => ({
        ...prev,
        [currentQuestionData._id]: currentAnswer
      }));
      
      setHasUnsavedChanges(false);
      setSaving(false);
    }
  };

  // Navigate to question (only if saved or no changes)
  const navigateToQuestion = (direction: 'next' | 'prev') => {
    if (hasUnsavedChanges) {
      alert('Please save your answer before navigating to another question.');
      return;
    }

    const currentQuestionId = exam!.questions[currentQuestion]._id;
    const now = Date.now();
    
    // Record time spent on current question
    if (questionStartTimes[currentQuestionId]) {
      const timeSpent = Math.round((now - questionStartTimes[currentQuestionId]) / 1000);
      setQuestionTimeSpent(prev => ({
        ...prev,
        [currentQuestionId]: (prev[currentQuestionId] || 0) + timeSpent
      }));
    }

    if (direction === 'next' && currentQuestion < exam!.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      
      // Start timing the new question
      const newQuestionId = exam!.questions[currentQuestion + 1]._id;
      setQuestionStartTimes(prev => ({
        ...prev,
        [newQuestionId]: now
      }));
    } else if (direction === 'prev' && currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      
      // Start timing the new question
      const newQuestionId = exam!.questions[currentQuestion - 1]._id;
      setQuestionStartTimes(prev => ({
        ...prev,
        [newQuestionId]: now
      }));
    }
  };

  // Handle answer change
  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
    
    // Check if answer is different from saved
    const savedAnswer = savedAnswers[questionId];
    setHasUnsavedChanges(answer !== savedAnswer);
  };

  // Submit exam
  const handleSubmitExam = useCallback(async () => {
    if (!exam || !user || examSubmitted || isSubmitting) return;
    setIsSubmitting(true);

    if (!exam._id) {
      alert('Error: Exam ID is missing. Please try again.');
      return;
    }

    if (Object.keys(answers).length === 0) {
      const confirmed = window.confirm('You haven\'t answered any questions. Are you sure you want to submit the exam?');
      if (!confirmed) return;
    }

    try {
      // Calculate final time spent on current question
      const currentQuestionId = exam.questions[currentQuestion]._id;
      const now = Date.now();
      let finalQuestionTimeSpent = { ...questionTimeSpent };
      if (questionStartTimes[currentQuestionId]) {
        const timeSpent = Math.round((now - questionStartTimes[currentQuestionId]) / 1000);
        finalQuestionTimeSpent[currentQuestionId] = (finalQuestionTimeSpent[currentQuestionId] || 0) + timeSpent;
      }

      const examData = {
        examId: exam._id,
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId,
          answer,
          timeSpent: finalQuestionTimeSpent[questionId] || 0
        })),
        timeTaken: (exam.duration * 60) - timeLeft,
        startTime: new Date(Date.now() - ((exam.duration * 60) - timeLeft) * 1000),
        endTime: new Date()
      };

      const response = await apiService.results.submitResult(examData);
      
      if (response.success) {
        // Clear session
        if (examId && user) {
          const sessionKey = `exam_session_${examId}_${user.id}`;
          localStorage.removeItem(sessionKey);
        }
        
        // Check if this is a redirect response (second attempt)
        if (response.redirect) {
          alert(response.message || 'You have already completed this exam. Redirecting to dashboard.');
          navigate('/dashboard');
          return;
        }
        
        setExamSubmitted(true);
        setIsSubmitting(false);
        alert('Exam submitted successfully!');
        navigate('/dashboard');
      } else {
        setIsSubmitting(false);
        alert(`Failed to submit exam: ${response.error || 'Please try again.'}`);
      }
    } catch (error: any) {
      setIsSubmitting(false);
      console.error('Error submitting exam:', error);
      alert(`Error submitting exam: ${error.message || 'Please try again.'}`);
    }
  }, [exam, user, answers, timeLeft, navigate, examId, examSubmitted, isSubmitting]);

  // Timer countdown
  useEffect(() => {
    if (!examStarted || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [examStarted, timeLeft, handleSubmitExam]);

  // Save session periodically
  useEffect(() => {
    if (!examStarted || !exam || !user) return;

    const saveInterval = setInterval(() => {
      const session: ExamSession = {
        examId: exam._id,
        startTime: new Date(Date.now() - ((exam.duration * 60) - timeLeft) * 1000),
        timeLeft,
        currentQuestion,
        answers,
        savedAnswers
      };
      saveSession(session);
    }, 30000); // Save every 30 seconds

    return () => clearInterval(saveInterval);
  }, [examStarted, exam, user, timeLeft, currentQuestion, answers, savedAnswers, saveSession]);

  // Monitor tab switching
  useEffect(() => {
    if (!exam?.preventTabSwitch) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        addProctorEvent({
          sessionId: examId || '1',
          type: 'tab-switch',
          severity: 'medium',
          description: 'Student switched to another tab'
        });
        setShowWarning(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [exam?.preventTabSwitch, addProctorEvent, examId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // If exam was already submitted
  if (examSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <CheckCircleIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Exam Already Submitted</h2>
          <p className="text-gray-600 mb-6">
            You have already completed this exam. You cannot attempt it again.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Resume exam modal
  if (sessionData && !examStarted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-lg shadow-lg">
          <ExclamationTriangleIcon className="h-16 w-16 text-orange-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Resume Exam?</h2>
          <p className="text-gray-600 mb-6">
            We detected an interrupted exam session. You have {formatTime(sessionData.timeLeft)} remaining.
          </p>
          <div className="flex space-x-4">
            <button
              onClick={resumeExam}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Resume Exam
            </button>
            <button
              onClick={() => {
                // Clear session and start fresh
                if (examId && user) {
                  const sessionKey = `exam_session_${examId}_${user.id}`;
                  localStorage.removeItem(sessionKey);
                }
                setSessionData(null);
              }}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Start Fresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircleIcon className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Exam not found</p>
        </div>
      </div>
    );
  }

  const currentQuestionData = exam.questions[currentQuestion];
  const isFirstQuestion = currentQuestion === 0;
  const isLastQuestion = currentQuestion === exam.questions.length - 1;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Exit Warning Modal */}
      {showExitWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white text-gray-900 rounded-lg p-8 max-w-md mx-4">
            <ExclamationTriangleIcon className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-center mb-4">⚠️ Security Alert</h3>
            <p className="text-center mb-6">
              Attempting to exit fullscreen mode will be reported to your instructor and may result in exam termination.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowExitWarning(false)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Continue Exam
              </button>
              <button
                onClick={() => {
                  setShowExitWarning(false);
                  handleSubmitExam();
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Submit & Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{exam.title}</h1>
            <p className="text-sm text-gray-400">
              Question {currentQuestion + 1} of {exam.questions.length}
            </p>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 text-red-400">
              <ClockIcon className="h-5 w-5" />
              <span className="font-mono text-lg">{formatTime(timeLeft)}</span>
            </div>
            
            {exam.requireWebcam && (
              <div className="flex items-center space-x-2">
                <VideoCameraIcon className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-400">Webcam</span>
              </div>
            )}

            {hasUnsavedChanges && (
              <div className="flex items-center space-x-2 text-yellow-400">
                <ExclamationTriangleIcon className="h-5 w-5" />
                <span className="text-sm">Unsaved</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      {showWarning && (
        <div className="bg-yellow-900 border border-yellow-700 text-yellow-200 px-4 py-3 flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
          <span>Warning: Tab switching detected. This may result in exam termination.</span>
          <button
            onClick={() => setShowWarning(false)}
            className="ml-auto text-yellow-400 hover:text-yellow-200"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex h-screen">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Question */}
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="w-full p-4 sm:p-6 lg:p-8">
              <div className="bg-gray-800 rounded-lg p-8 mb-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold">
                    Question {currentQuestion + 1}
                  </h2>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-400">
                      {currentQuestionData.points} point{currentQuestionData.points !== 1 ? 's' : ''}
                    </span>
                    {savedAnswers[currentQuestionData._id] && (
                      <div className="flex items-center space-x-2 text-green-400">
                        <CheckCircleIcon className="h-4 w-4" />
                        <span className="text-sm">Saved</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <p className="text-lg text-gray-200 mb-8 leading-relaxed">{currentQuestionData.question}</p>

                {/* Answer Options */}
                <div className="space-y-4">
                  {currentQuestionData.type === 'multiple-choice' && currentQuestionData.options?.map((option, index) => (
                    <label key={index} className="flex items-center space-x-4 cursor-pointer p-4 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors">
                      <input
                        type="radio"
                        name={`question-${currentQuestionData._id}`}
                        value={option}
                        checked={answers[currentQuestionData._id] === option}
                        onChange={(e) => handleAnswerChange(currentQuestionData._id, e.target.value)}
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-400"
                      />
                      <span className="text-gray-200">{option}</span>
                    </label>
                  ))}

                  {currentQuestionData.type === 'true-false' && (
                    <div className="space-y-4">
                      <label className="flex items-center space-x-4 cursor-pointer p-4 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors">
                        <input
                          type="radio"
                          name={`question-${currentQuestionData._id}`}
                          value="true"
                          checked={answers[currentQuestionData._id] === 'true'}
                          onChange={(e) => handleAnswerChange(currentQuestionData._id, e.target.value)}
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-400"
                        />
                        <span className="text-gray-200">True</span>
                      </label>
                      <label className="flex items-center space-x-4 cursor-pointer p-4 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors">
                        <input
                          type="radio"
                          name={`question-${currentQuestionData._id}`}
                          value="false"
                          checked={answers[currentQuestionData._id] === 'false'}
                          onChange={(e) => handleAnswerChange(currentQuestionData._id, e.target.value)}
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-400"
                        />
                        <span className="text-gray-200">False</span>
                      </label>
                    </div>
                  )}

                  {(currentQuestionData.type === 'short-answer' || currentQuestionData.type === 'essay') && (
                    <textarea
                      value={answers[currentQuestionData._id] || ''}
                      onChange={(e) => handleAnswerChange(currentQuestionData._id, e.target.value)}
                      placeholder={`Enter your ${currentQuestionData.type === 'short-answer' ? 'answer' : 'essay'} here...`}
                      className="w-full h-32 p-4 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Footer */}
          <div className="bg-gray-800 border-t border-gray-700 px-8 py-6">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigateToQuestion('prev')}
                  disabled={isFirstQuestion}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  <span>Previous</span>
                </button>

                <button
                  onClick={saveAnswer}
                  disabled={!hasUnsavedChanges || saving}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : 'Save Answer'}</span>
                </button>

                <button
                  onClick={() => navigateToQuestion('next')}
                  disabled={isLastQuestion || hasUnsavedChanges}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span>Next</span>
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-400">
                  {Object.keys(savedAnswers).length} of {exam.questions.length} answered
                </div>
                <button
                  onClick={handleSubmitExam}
                  disabled={isSubmitting || examSubmitted}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Exam'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Question Navigator Sidebar */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 p-6 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">Question Navigator</h3>
          <div className="grid grid-cols-5 gap-2">
            {exam.questions.map((question, index) => (
              <button
                key={question._id}
                onClick={() => {
                  if (hasUnsavedChanges) {
                    alert('Please save your answer before navigating to another question.');
                    return;
                  }
                  setCurrentQuestion(index);
                }}
                disabled={hasUnsavedChanges}
                className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                  index === currentQuestion
                    ? 'bg-blue-600 text-white'
                    : savedAnswers[question._id]
                    ? 'bg-green-600 text-white'
                    : answers[question._id]
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {index + 1}
              </button>
            ))}
          </div>
          
          <div className="mt-6 space-y-2">
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-4 h-4 bg-blue-600 rounded"></div>
              <span className="text-gray-400">Current</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-4 h-4 bg-green-600 rounded"></div>
              <span className="text-gray-400">Answered</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-4 h-4 bg-yellow-600 rounded"></div>
              <span className="text-gray-400">Unsaved</span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-4 h-4 bg-gray-700 rounded"></div>
              <span className="text-gray-400">Unanswered</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullScreenExam; 