import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { examsAPI, testsAPI, resultsAPI } from '../../services/api';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  EyeIcon,
  DocumentTextIcon,
  ShareIcon,
  DocumentArrowDownIcon,
  KeyIcon,
  LockClosedIcon,
  LockOpenIcon,
  ClockIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  TrashIcon,
  CalendarIcon,
  AcademicCapIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  TrophyIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  PauseIcon,
  PencilIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import EditExam from './EditExam';

interface Exam {
  _id: string;
  title: string;
  description: string;
  duration: number;
  totalQuestions: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdBy: string;
  enrolledStudents?: number;
  completedStudents?: number;
  averageScore?: number;
  passingScore?: number;
  maxAttempts?: number;
  requireWebcam?: boolean;
  preventTabSwitch?: boolean;
  preventCopyPaste?: boolean;
  randomizeQuestions?: boolean;
  timePerQuestion?: boolean;
  allowNavigation?: boolean;
  allowReview?: boolean;
  showResults?: boolean;
  questions?: any[];
  suspiciousCount?: number;
}

const ExamList: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareModal, setShareModal] = useState<{ show: boolean; exam: Exam | null }>({ show: false, exam: null });
  const [downloading, setDownloading] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; exam: Exam | null }>({ show: false, exam: null });
  const [deleting, setDeleting] = useState(false);
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const [scheduledExams, setScheduledExams] = useState<any[]>([]);
  const [attemptedExams, setAttemptedExams] = useState<any[]>([]);
  const [unattemptedExams, setUnattemptedExams] = useState<any[]>([]);
  const [reviewModal, setReviewModal] = useState<{ show: boolean; result: any; test: any } | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [editModal, setEditModal] = useState<{ show: boolean; exam: Exam | null }>({ show: false, exam: null });
  const navigate = useNavigate();

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const fetchExamsOrTests = async () => {
    try {
      setLoading(true);
      if (user?.role === 'student') {
        const response = await testsAPI.getStudentExams();
        if (response.success) {
          setScheduledExams(response.data.scheduled || []);
          setAttemptedExams(response.data.attempted || []);
          setUnattemptedExams(response.data.unattempted || []);
        } else {
          setError('Failed to fetch your exams');
        }
      } else {
        const response = await examsAPI.getAllExams();
        if (response.success) {
          setExams(response.data);
        } else {
          setError('Failed to fetch exams');
        }
      }
    } catch (error) {
      setError('Error loading exams');
      console.error('Error fetching exams:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExamsOrTests();
  }, []);

  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exam.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || exam.isActive === (filter === 'active');
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const handleShareExam = (exam: Exam) => {
    setShareModal({ show: true, exam });
  };

  const handleDownloadQuestionPaper = async (examId: string) => {
    setDownloading(`question-${examId}`);
    try {
      const response = await examsAPI.downloadQuestionPaper(examId);
      if (response.success) {
        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = `question-paper-${examId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download question paper. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadAnswerKey = async (examId: string) => {
    setDownloading(`answer-${examId}`);
    try {
      const response = await examsAPI.downloadAnswerKey(examId);
      if (response.success) {
        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = `answer-key-${examId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download answer key. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  const handleToggleExamStatus = async (examId: string, currentStatus: boolean) => {
    try {
      setRefreshing(true);
      const response = await examsAPI.toggleExamStatus(examId, !currentStatus);
      if (response.success) {
        setExams(prev => prev.map(exam => 
          exam._id === examId ? { ...exam, isActive: !currentStatus } : exam
        ));
        const newStatus = !currentStatus ? 'opened' : 'closed';
        showNotification(`Exam ${newStatus} successfully!`);
      } else {
        showNotification('Failed to update exam status. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Toggle status error:', error);
      showNotification('Error updating exam status. Please try again.', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeleteExam = async (exam: Exam) => {
    setDeleteModal({ show: true, exam });
  };

  const confirmDeleteExam = async () => {
    if (!deleteModal.exam) return;
    
    try {
      setDeleting(true);
      const response = await examsAPI.deleteExam(deleteModal.exam._id);
      if (response.success) {
        setExams(prev => prev.filter(exam => exam._id !== deleteModal.exam?._id));
        showNotification('Exam deleted successfully!');
        setDeleteModal({ show: false, exam: null });
      } else {
        showNotification('Failed to delete exam. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Delete exam error:', error);
      showNotification('Error deleting exam. Please try again.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showNotification('Copied to clipboard!');
  };

  const handleReviewPerformance = async (test: any) => {
    setReviewLoading(true);
    setReviewError('');
    try {
      const result = await resultsAPI.getUserResultForExam(test.examId?._id);
      if (result) {
        setReviewModal({ show: true, result, test });
      } else {
        setReviewError('No completed attempt found for this exam.');
      }
    } catch (err) {
      setReviewError('Failed to load exam performance.');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleEditExam = async (exam: Exam) => {
    try {
      const response = await examsAPI.getExam(exam._id);
      if (response.success) {
        setEditModal({ show: true, exam: response.data });
      } else {
        showNotification('Failed to load exam for editing', 'error');
      }
    } catch (error) {
      console.error('Error loading exam for editing:', error);
      showNotification('Failed to load exam for editing', 'error');
    }
  };

  const isStudent = user?.role === 'student';
  const isInstructor = user?.role === 'instructor' || user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'university';

  // Calculate stats
  const totalExams = exams.length;
  const activeExams = exams.filter(exam => exam.isActive).length;
  const totalEnrolled = exams.reduce((sum, exam) => sum + (exam.enrolledStudents || 0), 0);
  const totalCompleted = exams.reduce((sum, exam) => sum + (exam.completedStudents || 0), 0);
  const averageCompletionRate = totalEnrolled > 0 ? Math.round((totalCompleted / totalEnrolled) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">Loading your exams...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-20">
            <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Exams</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={fetchExamsOrTests}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowPathIcon className="h-5 w-5 mr-2" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8 mb-16">
      {/* Notification */}
      {notification.show && (
        <div className={`mb-8 p-4 rounded-xl border shadow-sm ${
          notification.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {notification.type === 'success' ? (
                <CheckCircleIcon className="h-5 w-5 mr-2" />
              ) : (
                <XCircleIcon className="h-5 w-5 mr-2" />
              )}
              <span className="font-medium">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification({ show: false, message: '', type: 'success' })}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-8 mb-8 shadow-xl text-white">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center mb-2">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl mr-4 shadow-lg inline-block">
              <AcademicCapIcon className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white drop-shadow-lg">My Exams</h1>
          </div>
          <p className="text-white text-lg font-medium drop-shadow mt-2 lg:mt-0">View and take your enrolled exams</p>
        </div>
      </div>

      {/* Enhanced Stats Dashboard - Only for Instructors */}
      {isInstructor && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Exams</p>
                <p className="text-3xl font-bold text-gray-900">{totalExams}</p>
                <p className="text-xs text-gray-500 mt-1">Created exams</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <ClipboardDocumentListIcon className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Active Exams</p>
                <p className="text-3xl font-bold text-blue-600">{activeExams}</p>
                <p className="text-xs text-gray-500 mt-1">Currently running</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <PlayIcon className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Students</p>
                <p className="text-3xl font-bold text-indigo-600">{totalEnrolled}</p>
                <p className="text-xs text-gray-500 mt-1">Enrolled across all exams</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-indigo-500 to-violet-600 rounded-xl shadow-lg">
                <UsersIcon className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Completion Rate</p>
                <p className="text-3xl font-bold text-purple-600">{averageCompletionRate}%</p>
                <p className="text-xs text-gray-500 mt-1">Students completed</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl shadow-lg">
                <TrophyIcon className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Search and Filter Section */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-purple-400" />
            <input
              type="text"
              placeholder={'Search exams by title or description...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-3 w-full border border-purple-300 rounded-full focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-purple-50 text-gray-700 placeholder-gray-400 transition-all duration-300"
            />
          </div>
          {isStudent ? (
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-6 w-8 text-purple-400" />
              <div className="relative">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="appearance-none border border-purple-300 rounded-full px-4 py-3 pr-8 min-w-[140px] bg-purple-50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-700 transition-all duration-300"
                >
                  <option value="all">All</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="attempted">Attempted</option>
                  <option value="unattempted">Unattempted</option>
                </select>
                <svg className="w-4 h-4 text-purple-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
              <button
                onClick={fetchExamsOrTests}
                disabled={loading || refreshing}
                className="p-3 bg-blue-100 text-blue-500 rounded-full hover:bg-blue-200 transition-all duration-200 disabled:opacity-50"
                title="Refresh exams"
              >
                <ArrowPathIcon className={`h-5 w-5 ${(loading || refreshing) ? 'animate-spin' : ''}`} />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-6 w-8 text-purple-400" />
              <div className="relative">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="appearance-none border border-purple-300 rounded-full px-4 py-3 pr-8 min-w-[140px] bg-purple-50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-700 transition-all duration-300"
                >
                  <option value="all">All Exams</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <svg className="w-4 h-4 text-purple-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
              <button
                onClick={fetchExamsOrTests}
                disabled={loading || refreshing}
                className="p-3 bg-blue-100 text-blue-500 rounded-full hover:bg-blue-200 transition-all duration-200 disabled:opacity-50"
                title="Refresh exams"
              >
                <ArrowPathIcon className={`h-5 w-5 ${(loading || refreshing) ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Exam/Test Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        {isStudent ? (
          <>
            {/* Check if there are any exams at all for students */}
            {scheduledExams.length === 0 && attemptedExams.length === 0 && unattemptedExams.length === 0 ? (
              <div className="col-span-full text-center py-16">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12">
                  <AcademicCapIcon className="h-20 w-20 text-gray-300 mx-auto mb-6" />
                  <h3 className="text-2xl font-semibold text-gray-900 mb-3">No exams available</h3>
                  <p className="text-gray-500 text-lg max-w-md mx-auto mb-6">
                    You don't have any exams assigned to you at the moment. Check back later or contact your instructor.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={fetchExamsOrTests}
                      className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <ArrowPathIcon className="h-5 w-5 mr-2" />
                      Refresh
                    </button>
                    <Link
                      to="/dashboard"
                      className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <AcademicCapIcon className="h-5 w-5 mr-2" />
                      Back to Dashboard
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <>
            {(filter === 'all' || filter === 'scheduled') && (
              scheduledExams.length > 0 ? (
                scheduledExams
                  .filter(test =>
                    test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (test.description || '').toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((test) => {
                    const now = dayjs();
                    const start = dayjs(test.startTime);
                    const end = dayjs(test.endTime);
                    const canAttempt = now.isAfter(start) && now.isBefore(end);
                    return (
                      <div key={test._id} className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl hover:border-blue-400 transform hover:scale-105 transition-transform transition-shadow transition-border transition-colors duration-200 ease-out will-change-transform">
                        <div className="px-6 py-5 border-b border-white/10 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white flex items-center gap-3 rounded-t-2xl">
                          <AcademicCapIcon className="h-7 w-7 text-white drop-shadow" />
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-white mb-1 truncate">{test.title || test.examId?.title}</h3>
                            <p className="text-white/80 text-sm truncate">{test.description || test.examId?.description}</p>
                          </div>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/30 ml-2">
                            {test.status || 'Scheduled'}
                          </span>
                        </div>
                        <div className="p-6 rounded-b-2xl">
                          <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-xl">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <ClockIcon className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-xs text-blue-600 uppercase tracking-wide font-semibold">Duration</p>
                                <p className="text-sm font-bold text-gray-900">{test.duration || test.examId?.duration || 0} min</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3 p-3 bg-indigo-50 rounded-xl">
                              <div className="p-2 bg-indigo-100 rounded-lg">
                                <DocumentTextIcon className="h-4 w-4 text-indigo-600" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <p className="text-xs text-indigo-600 uppercase tracking-wide font-semibold whitespace-nowrap">Classroom</p>
                                <p
                                  className="text-base font-bold text-gray-900 truncate max-w-[120px] sm:max-w-[180px] lg:max-w-[220px] overflow-hidden whitespace-nowrap" title={test.classroomId?.name}>
                                  {test.classroomId?.name}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 mb-6 border border-gray-100">
                            <div className="flex items-center space-x-2 mb-3">
                              <CalendarIcon className="h-4 w-4 text-gray-500" />
                              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Schedule</span>
                            </div>
                            <div className="text-sm text-gray-700 space-y-2">
                              <div className="flex justify-between">
                                <span className="font-medium text-gray-600">Start:</span>
                                <span className="font-semibold">{formatDate(test.startTime)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-medium text-gray-600">End:</span>
                                <span className="font-semibold">{formatDate(test.endTime)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Link
                              to={`/exam/${test.examId?._id}/sequential`}
                              state={{
                                testId: test._id,
                                classroomId: test.classroomId?._id,
                                proctorSetup: undefined
                              }}
                              className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium ${canAttempt ? 'text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400' : 'text-gray-400 bg-gray-100 cursor-not-allowed'}`}
                              tabIndex={canAttempt ? 0 : -1}
                              aria-disabled={!canAttempt}
                              onClick={e => { if (!canAttempt) e.preventDefault(); }}
                              title={canAttempt ? 'Start the exam' : 'You can only attempt this exam during the scheduled window.'}
                            >
                              <EyeIcon className="h-4 w-4 mr-2" />
                              Attempt
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })
                  ) : filter === 'scheduled' && (
                <div className="col-span-full text-center py-16">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12">
                        <CalendarIcon className="h-20 w-20 text-gray-300 mx-auto mb-6" />
                        <h3 className="text-2xl font-semibold text-gray-900 mb-3">No scheduled exams</h3>
                        <p className="text-gray-500 text-lg max-w-md mx-auto">
                          You don't have any upcoming exams scheduled at the moment.
                        </p>
                  </div>
                </div>
              )
            )}
            {(filter === 'all' || filter === 'attempted') && (
              attemptedExams.length > 0 ? (
                attemptedExams
                  .filter(test =>
                    test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (test.description || '').toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((test) => (
                    <div key={test._id} className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl hover:border-blue-400 transform hover:scale-105 transition-transform transition-shadow transition-border transition-colors duration-200 ease-out will-change-transform">
                      <div className="px-6 py-5 border-b border-white/10 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white flex items-center gap-3 rounded-t-2xl">
                        <AcademicCapIcon className="h-7 w-7 text-white drop-shadow" />
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-1 truncate">{test.title || test.examId?.title}</h3>
                          <p className="text-white/80 text-sm truncate">{test.description || test.examId?.description}</p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/30 ml-2">
                          {test.canAttempt ? 'Can Attempt' : 'Max Attempts Reached'}
                        </span>
                      </div>
                      <div className="p-6 rounded-b-2xl">
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-xl">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <ClockIcon className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-xs text-blue-600 uppercase tracking-wide font-semibold">Duration</p>
                              <p className="text-sm font-bold text-gray-900">{test.duration || test.examId?.duration || 0} min</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 p-3 bg-indigo-50 rounded-xl">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                              <DocumentTextIcon className="h-4 w-4 text-indigo-600" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <p className="text-xs text-indigo-600 uppercase tracking-wide font-semibold whitespace-nowrap">Classroom</p>
                              <p
                                className="text-base font-bold text-gray-900 truncate max-w-[120px] sm:max-w-[180px] lg:max-w-[220px] overflow-hidden whitespace-nowrap"
                                title={test.classroomId?.name}
                              >
                                {test.classroomId?.name}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-gradient-to-r from-gray-50 to-indigo-50 rounded-xl p-4 mb-6 border border-gray-100">
                          <div className="flex items-center space-x-2 mb-3">
                            <CalendarIcon className="h-4 w-4 text-gray-500" />
                            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Schedule</span>
                          </div>
                          <div className="text-sm text-gray-700 space-y-2">
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-600">Start:</span>
                              <span className="font-semibold">{formatDate(test.startTime)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-600">End:</span>
                              <span className="font-semibold">{formatDate(test.endTime)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-600">Attempts:</span>
                              <span className="font-semibold">{test.attempts}/{test.maxAttempts || 1}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {test.canAttempt ? (
                            <Link
                              to={`/exam/${test.examId?._id}/sequential`}
                              state={{
                                testId: test._id,
                                classroomId: test.classroomId?._id,
                                proctorSetup: undefined
                              }}
                              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                            >
                              <EyeIcon className="h-4 w-4 mr-2" />
                              Take Exam Again
                            </Link>
                          ) : (
                            <span className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-400 bg-gray-100 cursor-not-allowed">
                              <XCircleIcon className="h-4 w-4 mr-2" />
                              Max Attempts Reached
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                   ) : filter === 'attempted' && (
                <div className="col-span-full text-center py-16">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12">
                         <TrophyIcon className="h-20 w-20 text-gray-300 mx-auto mb-6" />
                         <h3 className="text-2xl font-semibold text-gray-900 mb-3">No attempted exams</h3>
                         <p className="text-gray-500 text-lg max-w-md mx-auto">
                           You haven't completed any exams yet. Start with a scheduled exam!
                         </p>
                  </div>
                </div>
              )
            )}
            {(filter === 'all' || filter === 'unattempted') && (
              unattemptedExams.length > 0 ? (
                unattemptedExams
                  .filter(test =>
                    test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (test.description || '').toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((test) => (
                    <div key={test._id} className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl hover:border-blue-400 transform hover:scale-105 transition-transform transition-shadow transition-border transition-colors duration-200 ease-out will-change-transform">
                      <div className="px-6 py-5 border-b border-white/10 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white flex items-center gap-3 rounded-t-2xl">
                        <AcademicCapIcon className="h-7 w-7 text-white drop-shadow" />
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-1 truncate">{test.title || test.examId?.title}</h3>
                          <p className="text-white/80 text-sm truncate">{test.description || test.examId?.description}</p>
                        </div>
                      </div>
                      <div className="p-6 rounded-b-2xl">
                        <div className="grid grid-cols-1 gap-4 mb-6">
                          <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-xl">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                              <DocumentTextIcon className="h-4 w-4 text-yellow-600" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <p className="text-xs text-yellow-600 uppercase tracking-wide font-semibold whitespace-nowrap">Classroom</p>
                              <p
                                className="text-base font-bold text-gray-900 truncate max-w-[120px] sm:max-w-[180px] lg:max-w-[220px] overflow-hidden whitespace-nowrap"
                                title={test.classroomId?.name}
                              >
                                {test.classroomId?.name}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 mb-6 border border-yellow-100">
                          <div className="flex items-center space-x-2 mb-3">
                            <CalendarIcon className="h-4 w-4 text-gray-500" />
                            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Schedule</span>
                          </div>
                          <div className="text-sm text-gray-700 space-y-2">
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-600">Start:</span>
                              <span className="font-semibold">{formatDate(test.startTime)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-600">End:</span>
                              <span className="font-semibold">{formatDate(test.endTime)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center px-4 py-2 border border-yellow-300 rounded-lg text-sm font-medium text-yellow-700 bg-yellow-50 cursor-not-allowed">
                            <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                            Missed Exam
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                   ) : filter === 'unattempted' && (
                <div className="col-span-full text-center py-16">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12">
                         <ExclamationTriangleIcon className="h-20 w-20 text-gray-300 mx-auto mb-6" />
                         <h3 className="text-2xl font-semibold text-gray-900 mb-3">No missed exams</h3>
                         <p className="text-gray-500 text-lg max-w-md mx-auto">
                           Great! You haven't missed any exam deadlines.
                         </p>
                  </div>
                </div>
              )
                 )}
               </>
            )}
          </>
        ) : filteredExams.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12">
              <DocumentTextIcon className="h-20 w-20 text-gray-300 mx-auto mb-6" />
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">No exams found</h3>
              <p className="text-gray-500 text-lg max-w-md mx-auto">
                {searchTerm || filter !== 'all' 
                  ? 'Try adjusting your search or filter criteria to find what you\'re looking for.'
                  : 'No exams are available at the moment. Create your first exam to get started.'
                }
              </p>
            </div>
          </div>
        ) : (
          filteredExams.map((exam) => (
            <div key={exam._id} className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl hover:border-blue-400 transform hover:scale-105 transition-transform transition-shadow transition-border transition-colors duration-200 ease-out will-change-transform">
              {/* Enhanced Exam Header */}
              <div className="px-6 py-5 border-b border-white/10 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white flex items-center gap-3 rounded-t-2xl">
                <AcademicCapIcon className="h-7 w-7 text-white drop-shadow" />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1 truncate">{exam.title}</h3>
                  <p className="text-white/80 text-sm truncate">{exam.description}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/30 ml-2 ${
                  exam.isActive 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {exam.isActive ? (
                    <span className="flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                      Active
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <PauseIcon className="h-3 w-3 mr-1" />
                      Inactive
                    </span>
                  )}
                </span>
                {exam.averageScore && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full border border-blue-200">
                    {exam.averageScore.toFixed(1)}% avg
                  </span>
                )}
              </div>

              {/* Enhanced Exam Details */}
              <div className="p-6 rounded-b-2xl">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-xl">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <ClockIcon className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-blue-600 uppercase tracking-wide font-semibold">Duration</p>
                      <p className="text-sm font-bold text-gray-900">{formatDuration(exam.duration)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-indigo-50 rounded-xl">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <DocumentTextIcon className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs text-indigo-600 uppercase tracking-wide font-semibold">Questions</p>
                      <p className="text-sm font-bold text-gray-900">{exam.totalQuestions}</p>
                    </div>
                  </div>
                  {/* Suspicious Activities (replaces Enrolled) */}
                  <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-xl">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs text-red-600 uppercase tracking-wide font-semibold">Suspicious Activities</p>
                      <p className="text-sm font-bold text-gray-900">{exam.suspiciousCount || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-xl">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <CheckCircleIcon className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-orange-600 uppercase tracking-wide font-semibold">Completed</p>
                      <p className="text-sm font-bold text-gray-900">{exam.completedStudents || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 mb-6 border border-gray-100">
                  <div className="flex items-center space-x-2 mb-3">
                    <CalendarIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Schedule</span>
                  </div>
                  <div className="text-sm text-gray-700 space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Start:</span>
                      <span className="font-semibold">{formatDate(exam.startTime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">End:</span>
                      <span className="font-semibold">{formatDate(exam.endTime)}</span>
                    </div>
                  </div>
                </div>

                {/* Enhanced Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  {isInstructor && (
                    <>
                      <button
                        onClick={() => handleShareExam(exam)}
                        className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 transition-all duration-200"
                      >
                        <ShareIcon className="h-4 w-4 mr-2" />
                        Share
                      </button>

                      <button
                        onClick={() => handleEditExam(exam)}
                        className="inline-flex items-center px-4 py-2 border border-indigo-300 rounded-lg text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-400 transition-all duration-200"
                      >
                        <PencilIcon className="h-4 w-4 mr-2" />
                        Edit
                      </button>

                      <button
                        onClick={() => handleToggleExamStatus(exam._id, exam.isActive)}
                        disabled={refreshing}
                        className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 ${
                          exam.isActive
                            ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100 hover:border-red-400'
                            : 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100 hover:border-green-400'
                        }`}
                      >
                        {exam.isActive ? (
                          <>
                            <LockClosedIcon className="h-4 w-4 mr-2" />
                            {refreshing ? 'Closing...' : 'Close'}
                          </>
                        ) : (
                          <>
                            <LockOpenIcon className="h-4 w-4 mr-2" />
                            {refreshing ? 'Opening...' : 'Open'}
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleDownloadQuestionPaper(exam._id)}
                        disabled={downloading === `question-${exam._id}`}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 disabled:opacity-50"
                      >
                        <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                        {downloading === `question-${exam._id}` ? 'Downloading...' : 'Questions'}
                      </button>

                      <button
                        onClick={() => handleDownloadAnswerKey(exam._id)}
                        disabled={downloading === `answer-${exam._id}`}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 disabled:opacity-50"
                      >
                        <KeyIcon className="h-4 w-4 mr-2" />
                        {downloading === `answer-${exam._id}` ? 'Downloading...' : 'Answers'}
                      </button>

                      <button
                        onClick={() => handleDeleteExam(exam)}
                        className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 hover:border-red-400 transition-all duration-200"
                      >
                        <TrashIcon className="h-4 w-4 mr-2" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Share Modal */}
      {shareModal.show && shareModal.exam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Share Exam</h3>
            <p className="text-gray-600 mb-4">
              Share the exam landing page link with your students. They will see exam details and can login/register to start the exam.
            </p>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={`${window.location.origin}/exam/${shareModal.exam._id}`}
                readOnly
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={() => copyToClipboard(`${window.location.origin}/exam/${shareModal.exam?._id}`)}
                className="p-3 bg-blue-100 text-blue-500 rounded-full hover:bg-blue-200 transition-all duration-200"
                title="Copy Link"
              >
                <DocumentArrowDownIcon className="h-5 w-5" />
              </button>
            </div>
            <button
              onClick={() => setShareModal({ show: false, exam: null })}
              className="mt-6 px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-2xl w-full">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Exam Performance</h3>
            {reviewLoading ? (
              <div className="text-center py-10">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 text-lg">Loading exam performance...</p>
              </div>
            ) : reviewError ? (
              <div className="text-center py-10 text-red-600">
                <ExclamationTriangleIcon className="h-16 w-16 mx-auto mb-4" />
                <p className="text-lg">{reviewError}</p>
                <button
                  onClick={() => setReviewModal(null)}
                  className="mt-6 px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  OK
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="text-xl font-bold text-gray-900 mb-3">Exam Details</h4>
                  <p className="text-gray-600">
                    <span className="font-semibold text-gray-900">Title:</span> {reviewModal.test.title || reviewModal.test.examId?.title}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-semibold text-gray-900">Duration:</span> {reviewModal.test.duration || reviewModal.test.examId?.duration || 0} minutes
                  </p>
                  <p className="text-gray-600">
                    <span className="font-semibold text-gray-900">Questions:</span> {reviewModal.test.totalQuestions || reviewModal.test.examId?.totalQuestions || 0}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-semibold text-gray-900">Status:</span> {reviewModal.test.canAttempt ? 'Can Attempt' : 'Max Attempts Reached'}
                  </p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="text-xl font-bold text-gray-900 mb-3">Your Performance</h4>
                  <p className="text-gray-600">
                    <span className="font-semibold text-gray-900">Score:</span> {reviewModal.result.score || 0}%
                  </p>
                  <p className="text-gray-600">
                    <span className="font-semibold text-gray-900">Attempts:</span> {reviewModal.result.attempts || 0}/{reviewModal.test.maxAttempts || 1}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-semibold text-gray-900">Time Taken:</span> {reviewModal.result.timeTaken || 0} seconds
                  </p>
                  <p className="text-gray-600">
                    <span className="font-semibold text-gray-900">Date:</span> {dayjs(reviewModal.result.completedAt).format('MMM DD, YYYY HH:mm')}
                  </p>
                </div>
              </div>
            )}
            <button
              onClick={() => setReviewModal(null)}
              className="mt-6 px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal.show && editModal.exam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="relative w-full max-w-4xl">
            <div className="absolute top-0 right-0 z-10">
              <button onClick={() => setEditModal({ show: false, exam: null })} className="m-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 shadow">
                <span className="sr-only">Close</span>
                &times;
              </button>
            </div>
            <div className="bg-white rounded-2xl shadow-xl overflow-y-auto max-h-[90vh]">
              <EditExam examId={editModal.exam._id} onClose={() => setEditModal({ show: false, exam: null })} />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the exam "{deleteModal.exam?.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setDeleteModal({ show: false, exam: null })}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteExam}
                disabled={deleting}
                className="px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Exam'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamList;