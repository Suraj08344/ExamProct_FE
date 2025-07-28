import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ClockIcon,
  UserIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

const PublicExam: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Mock exam data - in real app, this would fetch from backend using examId
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setExam({
        id: examId,
        title: 'JavaScript Fundamentals Test',
        description: 'This test covers basic JavaScript concepts including variables, functions, and DOM manipulation. Please ensure you have a stable internet connection and webcam access before starting.',
        duration: 60,
        totalQuestions: 25,
        passingScore: 70,
        startTime: '2024-01-20T10:00:00',
        endTime: '2024-01-22T18:00:00',
        requireWebcam: true,
        preventTabSwitch: true,
        maxAttempts: 1,
        instructions: [
          'You will have 60 minutes to complete this test',
          'Webcam monitoring is required throughout the test',
          'Tab switching is not allowed and will be detected',
          'You cannot copy and paste answers',
          'Each question has a specific time limit',
          'You can review your answers before submission'
        ]
      });
      setLoading(false);
    }, 1000);
  }, [examId]);

  const handleStartExam = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    navigate(`/exams/${examId}/take`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary-600">Loading test...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-secondary-900 mb-2">Test Not Found</h2>
          <p className="text-secondary-600">The test you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-secondary-200">
        <div className="w-full p-4 sm:p-6 lg:p-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <DocumentTextIcon className="h-8 w-8 text-primary-600" />
              <div>
                <h1 className="text-xl font-semibold text-secondary-900">Exam Proctor</h1>
                <p className="text-sm text-secondary-600">Secure Online Testing</p>
              </div>
            </div>
            {user && (
              <div className="flex items-center space-x-2">
                <UserIcon className="h-5 w-5 text-secondary-400" />
                <span className="text-sm text-secondary-600">{user.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-full p-4 sm:p-6 lg:p-8 py-8">
        {/* Test Information */}
        <div className="card mb-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-secondary-900 mb-2">{exam.title}</h1>
            <p className="text-secondary-600 max-w-2xl mx-auto">{exam.description}</p>
          </div>

          {/* Test Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-secondary-50 rounded-lg">
              <ClockIcon className="h-6 w-6 text-primary-600 mx-auto mb-2" />
              <p className="text-sm text-secondary-600">Duration</p>
              <p className="font-semibold text-secondary-900">{exam.duration} minutes</p>
            </div>
            <div className="text-center p-4 bg-secondary-50 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-primary-600 mx-auto mb-2" />
              <p className="text-sm text-secondary-600">Questions</p>
              <p className="font-semibold text-secondary-900">{exam.totalQuestions}</p>
            </div>
            <div className="text-center p-4 bg-secondary-50 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-primary-600 mx-auto mb-2" />
              <p className="text-sm text-secondary-600">Passing Score</p>
              <p className="font-semibold text-secondary-900">{exam.passingScore}%</p>
            </div>
            <div className="text-center p-4 bg-secondary-50 rounded-lg">
              <UserIcon className="h-6 w-6 text-primary-600 mx-auto mb-2" />
              <p className="text-sm text-secondary-600">Attempts</p>
              <p className="font-semibold text-secondary-900">{exam.maxAttempts}</p>
            </div>
          </div>

          {/* Test Schedule */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Test Schedule</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Start Time:</span>
                <p className="font-medium text-blue-900">{formatDate(exam.startTime)}</p>
              </div>
              <div>
                <span className="text-blue-700">End Time:</span>
                <p className="font-medium text-blue-900">{formatDate(exam.endTime)}</p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-3">Important Instructions</h3>
            <div className="space-y-2">
              {exam.instructions.map((instruction: string, index: number) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-primary-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-secondary-700">{instruction}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Proctoring Requirements */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-yellow-900 mb-2">Proctoring Requirements</h3>
            <div className="space-y-2 text-sm">
              {exam.requireWebcam && (
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="h-4 w-4 text-yellow-600" />
                  <span className="text-yellow-800">Webcam monitoring required</span>
                </div>
              )}
              {exam.preventTabSwitch && (
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="h-4 w-4 text-yellow-600" />
                  <span className="text-yellow-800">Tab switching detection enabled</span>
                </div>
              )}
            </div>
          </div>

          {/* Start Button */}
          <div className="text-center">
            <button
              onClick={handleStartExam}
              className="btn-primary inline-flex items-center px-8 py-3 text-lg"
            >
              {user ? 'Start Test' : 'Login to Start Test'}
              <ArrowRightIcon className="h-5 w-5 ml-2" />
            </button>
            {!user && (
              <p className="text-sm text-secondary-600 mt-2">
                You need to be logged in to take this test
              </p>
            )}
          </div>
        </div>

        {/* System Requirements */}
        <div className="card">
          <h3 className="text-lg font-semibold text-secondary-900 mb-3">System Requirements</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-secondary-900 mb-2">Browser Requirements</h4>
              <ul className="space-y-1 text-secondary-600">
                <li>• Chrome 80+ (recommended)</li>
                <li>• Firefox 75+</li>
                <li>• Safari 13+</li>
                <li>• Edge 80+</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-secondary-900 mb-2">Hardware Requirements</h4>
              <ul className="space-y-1 text-secondary-600">
                <li>• Webcam (required)</li>
                <li>• Microphone (optional)</li>
                <li>• Stable internet connection</li>
                <li>• Quiet environment</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <UserIcon className="h-12 w-12 text-primary-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-secondary-900 mb-2">Login Required</h3>
              <p className="text-secondary-600 mb-4">
                You need to be logged in to take this test. Please create an account or sign in.
              </p>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => navigate('/register')}
                  className="btn-secondary flex-1"
                >
                  Create Account
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="btn-primary flex-1"
                >
                  Sign In
                </button>
              </div>
              
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-sm text-secondary-500 mt-4 hover:text-secondary-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicExam; 