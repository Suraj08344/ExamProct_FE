import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import {
  ChartBarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  AcademicCapIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CalendarIcon,
  FlagIcon,
  ChevronRightIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import StudentDetailModal from '../components/StudentDetailModal';
import { toast } from 'react-toastify';

interface ExamResult {
  _id: string;
  title: string;
  description: string;
  totalQuestions: number;
  maxScore: number;
  passingScore: number;
  duration: number;
  createdAt: string;
  studentCount: number;
  averageScore: number;
  passRate: number;
  suspiciousActivityCount: number;
}

interface StudentResult {
  _id: string;
  studentId: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  examId: {
    _id: string;
    title: string;
    description: string;
    duration: number;
    totalQuestions: number;
    maxScore: number;
    passingScore: number;
  };
  totalScore: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  startTime: string;
  endTime: string;
  timeTaken: number;
  status: 'completed' | 'incomplete' | 'disqualified';
  proctorEvents: ProctorEvent[];
  answers: Answer[];
}

interface ProctorEvent {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
}

interface Answer {
  questionId: string;
  questionText: string;
  questionType: string;
  answer: string | string[];
  correctAnswer: string | string[];
  isCorrect: boolean;
  points: number;
  maxPoints: number;
  timeSpent: number;
  options?: string[];
}

interface ExamStats {
  totalExams: number;
  totalStudents: number;
  averageScore: number;
  passRate: number;
  totalSuspiciousActivities: number;
  averageTimeSpent: number;
}

// Helper to format seconds as Xm Ys
function formatTimeTaken(seconds: number) {
  if (!seconds || isNaN(seconds)) return '0m 0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}
// Helper to calculate seconds between two dates
function calcSecondsBetween(start: string | Date, end: string | Date) {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
  return diff > 0 ? diff : 0;
}

const InstructorResults: React.FC = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState<ExamResult[]>([]);
  const [selectedExam, setSelectedExam] = useState<ExamResult | null>(null);
  const [examStudents, setExamStudents] = useState<StudentResult[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState<ExamStats | null>(null);
  const [showStudentDetail, setShowStudentDetail] = useState(false);
  const [showExamDetail, setShowExamDetail] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Add release results logic
  const [releasing, setReleasing] = useState(false);
  const [released, setReleased] = useState(false); // Track if results have been released
  
  // Delete result state
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; student: StudentResult | null }>({ show: false, student: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchExamResults();
  }, []);

  const fetchExamResults = async () => {
    try {
      setLoading(true);
      const response = await apiService.results.getInstructorResults();
      if (response.success) {
        setExams(response.data.exams || []);
        setStats(response.data.stats || null);
      }
    } catch (error) {
      console.error('Error fetching exam results:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchExamStudents = async (examId: string) => {
    try {
      const response = await apiService.results.getExamStudents(examId);
      if (response.success) {
        setExamStudents(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching exam students:', error);
    }
  };

  const fetchStudentDetail = async (resultId: string) => {
    try {
      const response = await apiService.results.getStudentResult(resultId);
      if (response.success) {
        setSelectedStudent(response.data);
        setShowStudentDetail(true);
      }
    } catch (error) {
      console.error('Error fetching student detail:', error);
    }
  };

  const handleExamClick = async (exam: ExamResult) => {
    setSelectedExam(exam);
    setShowExamDetail(true);
    await fetchExamStudents(exam._id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-800';
      case 'incomplete':
        return 'bg-amber-100 text-amber-800';
      case 'disqualified':
        return 'bg-rose-100 text-rose-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return 'text-emerald-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-amber-600';
    return 'text-rose-600';
  };

  const formatDuration = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredExams = exams.filter((exam) => {
    const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'high-suspicion' && exam.suspiciousActivityCount > 5) ||
      (filter === 'low-pass-rate' && exam.passRate < 70);
    return matchesSearch && matchesFilter;
  });

  const handleRefresh = () => {
    setRefreshing(true);
    fetchExamResults();
  };

  // Deduplicate student results: keep only the latest result per exam per student
  const deduplicateStudentResults = (results: StudentResult[]) => {
    const map = new Map();
    for (const result of results) {
      const examId = typeof result.examId === 'string' ? result.examId : result.examId?._id;
      const studentId = typeof result.studentId === 'string' ? result.studentId : result.studentId?._id;
      if (!examId || !studentId) continue;
      const key = `${examId}_${studentId}`;
      if (!map.has(key) || new Date(result.endTime) > new Date(map.get(key).endTime)) {
        map.set(key, result);
      }
    }
    return Array.from(map.values());
  };

  // Filter to only completed results before deduplication
  const completedExamStudents = examStudents.filter(s => s.status === 'completed');
  const uniqueCompletedStudents = deduplicateStudentResults(completedExamStudents);

  // Add release results logic
  const handleReleaseResults = async () => {
    if (!selectedExam) return;
    setReleasing(true);
    try {
      const response = await apiService.results.releaseResults(selectedExam._id);
      if (response.success) {
        toast.success(response.message || 'Results released successfully!');
        await fetchExamStudents(selectedExam._id);
        
        setReleased(true); // Mark as released
      } else {
        toast.error(response.message || 'Failed to release results.');
      }
    } catch (error) {
      toast.error('Failed to release results.');
    } finally {
      setReleasing(false);
    }
  };

  // Export all student results for the selected exam as Excel
  const handleExportResults = async () => {
    if (!selectedExam) return;
    try {
      const response = await apiService.results.exportExamResults(selectedExam._id);
      if (response.success && response.data) {
        const blob = response.data;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `exam-results-${selectedExam._id}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('Results exported successfully!');
      } else {
        toast.error('Failed to export results.');
      }
    } catch (error) {
      toast.error('Failed to export results.');
    }
  };

  // Delete student result
  const handleDeleteResult = async (student: StudentResult) => {
    setDeleteModal({ show: true, student });
  };

  const confirmDeleteResult = async () => {
    if (!deleteModal.student) return;
    
    try {
      setDeleting(true);
      const response = await apiService.results.deleteResult(deleteModal.student._id);
      if (response.success) {
        toast.success(response.message || 'Result deleted successfully!');
        // Refresh the student list
        if (selectedExam) {
          await fetchExamStudents(selectedExam._id);
        }
        setDeleteModal({ show: false, student: null });
      } else {
        toast.error(response.error || 'Failed to delete result.');
      }
    } catch (error) {
      console.error('Error deleting result:', error);
      toast.error('Failed to delete result.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg font-medium text-gray-700">Loading exam analytics...</p>
          <p className="mt-1 text-sm text-gray-500">Preparing your comprehensive results dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 dark:bg-gray-950 p-4 sm:p-6 lg:p-8 mb-16">
      {/* Consistent Container for Header, Stats, and Search/Filter */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Modern Glassy Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-8 mb-8 shadow-xl text-white">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mr-4 shadow-lg">
                <ChartBarIcon className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white drop-shadow-lg">Exam Analytics Dashboard</h1>
                <p className="text-blue-100 mt-2 text-lg">Comprehensive performance metrics and detailed student insights</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-200 flex items-center transform hover:scale-105 focus:scale-105 shadow-lg"
              >
                {/* <ArrowPathIcon className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> */}
                Refresh Data
              </button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-700/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 text-white">
                <div className="px-6 py-7 flex items-center">
                  <div className="flex-shrink-0 bg-white/20 rounded-xl p-4 mr-5">
                    <AcademicCapIcon className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <dt className="text-base font-medium text-white/80 truncate">Total Exams</dt>
                    <dd className="flex items-baseline">
                      <div className="text-3xl font-bold text-white">{stats.totalExams}</div>
                    </dd>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-500 via-emerald-400 to-teal-500/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 text-white">
                <div className="px-6 py-7 flex items-center">
                  <div className="flex-shrink-0 bg-white/20 rounded-xl p-4 mr-5">
                    <UserGroupIcon className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <dt className="text-base font-medium text-white/80 truncate">Total Students</dt>
                    <dd className="flex items-baseline">
                      <div className="text-3xl font-bold text-white">{stats.totalStudents}</div>
                    </dd>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-600 via-indigo-500 to-blue-700/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 text-white">
                <div className="px-6 py-7 flex items-center">
                  <div className="flex-shrink-0 bg-white/20 rounded-xl p-4 mr-5">
                    <ChartBarIcon className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <dt className="text-base font-medium text-white/80 truncate">Average Score</dt>
                    <dd className="flex items-baseline">
                      <div className="text-3xl font-bold text-white">
                        {stats.averageScore.toFixed(1)}%
                      </div>
                      <span className="ml-2 text-sm font-medium">
                        {stats.averageScore >= 70 ? (
                          <span className="text-emerald-200 flex items-center">
                            <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                            {(stats.averageScore - 70).toFixed(1)}% above target
                          </span>
                        ) : (
                          <span className="text-rose-200 flex items-center">
                            <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
                            {(70 - stats.averageScore).toFixed(1)}% below target
                          </span>
                        )}
                      </span>
                    </dd>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-rose-500 via-pink-500 to-amber-500/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 text-white">
                <div className="px-6 py-7 flex items-center">
                  <div className="flex-shrink-0 bg-white/20 rounded-xl p-4 mr-5">
                    <FlagIcon className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <dt className="text-base font-medium text-white/80 truncate">Suspicious Activities</dt>
                    <dd className="flex items-baseline">
                      <div className="text-3xl font-bold text-white">
                        {stats.totalSuspiciousActivities}
                      </div>
                      <span className="ml-2 text-sm font-medium">
                        {stats.totalSuspiciousActivities > 0 ? (
                          <span className="text-rose-200 flex items-center">
                            <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                            Needs attention
                          </span>
                        ) : (
                          <span className="text-emerald-200 flex items-center">
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            All clear
                          </span>
                        )}
                      </span>
                    </dd>
                  </div>
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
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-6 w-8 text-purple-400" />
              <div className="relative">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="appearance-none border border-purple-300 rounded-full px-4 py-3 pr-8 min-w-[140px] bg-purple-50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-700 transition-all duration-300"
                >
                  <option value="all">All Exams</option>
                  <option value="high-suspicion">High Suspicion</option>
                  <option value="low-pass-rate">Low Pass Rate</option>
                </select>
                <svg className="w-4 h-4 text-purple-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-3 bg-blue-100 text-blue-500 rounded-full hover:bg-blue-200 transition-all duration-200 disabled:opacity-50"
                title="Refresh exams"
              >
                {/* <ArrowPathIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} /> */}
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Exam Results</h2>
          <div className="text-base text-gray-500">
            Showing {filteredExams.length} of {exams.length} exams
          </div>
        </div>

        {filteredExams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredExams.map((exam) => (
              <div
                key={exam._id}
                className="relative bg-white border border-gray-200 rounded-3xl shadow-xl transition-transform duration-200 ease-out will-change-transform hover:scale-105 hover:shadow-2xl cursor-pointer group"
                onClick={() => handleExamClick(exam)}
              >
                <div className="px-7 py-5 rounded-t-3xl bg-gradient-to-r from-blue-600 to-indigo-600 flex justify-between items-center">
                  <h3 className="text-xl font-extrabold text-white truncate">{exam.title}</h3>
                  <div className="flex-shrink-0">
                    <ChevronRightIcon className="h-6 w-6 text-white/80 group-hover:text-white" />
                  </div>
                </div>
                <div className="px-7 py-6">
                  <p className="text-base text-gray-700 mb-4 line-clamp-2 font-medium">{exam.description}</p>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Students</p>
                      <p className="text-xl font-extrabold text-gray-900">{exam.studentCount}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Score</p>
                      <p className={`text-xl font-extrabold ${getScoreColor(exam.averageScore)}`}>{exam.averageScore.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pass Rate</p>
                      <p className={`text-xl font-extrabold ${exam.passRate >= 70 ? 'text-emerald-600' : 'text-rose-600'}`}>{exam.passRate.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</p>
                      <p className="text-xl font-extrabold text-gray-900">{formatDuration(exam.duration)}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 text-gray-400 mr-1.5" />
                        <span className="text-xs text-gray-500">
                          {new Date(exam.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {exam.suspiciousActivityCount > 0 && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                            <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                            {exam.suspiciousActivityCount} suspicious activities
                          </span>
                        )}
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                          {exam.totalQuestions} questions
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden text-center py-16 mx-auto w-full max-w-3xl">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No exams found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filter criteria to find what you're looking for.
            </p>
            <div className="mt-6">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilter('all');
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Clear filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Exam Detail Modal */}
      {showExamDetail && selectedExam && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-8 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-extrabold text-gray-900">{selectedExam.title}</h2>
                <p className="text-gray-500 mt-1 text-lg">Exam Details & Student Results</p>
              </div>
              <button
                onClick={() => setShowExamDetail(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
              >
                <XCircleIcon className="h-7 w-7" />
              </button>
            </div>
            <div className="p-8 space-y-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div className="flex-1">
                  <div className="text-lg font-semibold text-gray-700 mb-2">Exam: {selectedExam.title}</div>
                  <div className="text-sm text-gray-500">{selectedExam.description}</div>
                </div>
                <div className="flex items-center">
                  <button
                    onClick={handleReleaseResults}
                    disabled={releasing || released}
                    className={`px-6 py-3 rounded-lg font-bold text-white transition-all duration-200 bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg hover:from-green-600 hover:to-emerald-700 ${releasing || released ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {released ? 'Result Released' : (releasing ? 'Releasing...' : 'Release Results')}
                  </button>
                  <button
                    onClick={handleExportResults}
                    className="ml-4 px-6 py-3 rounded-lg font-bold text-white transition-all duration-200 bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg hover:from-blue-600 hover:to-indigo-700"
                  >
                    Export Result
                  </button>
                </div>
              </div>
              <div className="overflow-hidden shadow-2xl ring-1 ring-gray-200 rounded-2xl">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th scope="col" className="py-4 pl-6 pr-3 text-left text-base font-extrabold text-gray-900">Student</th>
                      <th scope="col" className="px-4 py-4 text-left text-base font-extrabold text-gray-900">Score</th>
                      <th scope="col" className="px-4 py-4 text-left text-base font-extrabold text-gray-900">Status</th>
                      <th scope="col" className="px-4 py-4 text-left text-base font-extrabold text-gray-900">Time Taken</th>
                      <th scope="col" className="px-4 py-4 text-left text-base font-extrabold text-gray-900">
                        <div className="flex items-center">
                          <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-amber-500" />
                          Suspicious Activities
                        </div>
                      </th>
                      <th scope="col" className="relative py-4 pl-3 pr-6"><span className="sr-only">View</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {uniqueCompletedStudents.map((student) => (
                      <tr key={student._id} className="hover:bg-gray-50 transition-all">
                        <td className="whitespace-nowrap py-4 pl-6 pr-3 text-base">
                          <div className="flex items-center">
                            <div className="h-11 w-11 flex-shrink-0">
                              <div className="h-full w-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-neon">
                                {student.studentId.name.charAt(0)}
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="font-bold text-gray-900 text-lg">{student.studentId.name}</div>
                              <div className="text-gray-500 text-base">{student.studentId.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-base">
                          <span className={`font-extrabold ${getScoreColor(student.percentage)}`}>{student.percentage.toFixed(1)}%</span>
                          <div className="text-gray-500 text-base">{student.totalScore}/{student.maxScore} pts</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-base">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(student.status)}`}>{student.status}</span>
                          <div className="mt-1">
                            {student.passed ? (
                              <span className="inline-flex items-center text-emerald-600 text-xs font-bold"><CheckCircleIcon className="h-4 w-4 mr-1" />Passed</span>
                            ) : (
                              <span className="inline-flex items-center text-rose-600 text-xs font-bold"><XCircleIcon className="h-4 w-4 mr-1" />Failed</span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-base text-gray-500">{formatTimeTaken(calcSecondsBetween(student.startTime, student.endTime))}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-base">
                          {student.proctorEvents.length > 0 ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                                {student.proctorEvents.length} detected
                              </span>
                              <div className="text-xs text-gray-500">
                                {student.proctorEvents.filter((e: ProctorEvent) => e.severity === 'high').length} high, {student.proctorEvents.filter((e: ProctorEvent) => e.severity === 'medium').length} medium
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                Clean
                              </span>
                              <div className="text-xs text-gray-500">
                                No suspicious activities
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => fetchStudentDetail(student._id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Details
                          </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteResult(student);
                              }}
                              className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50 transition-colors"
                              title="Delete result (allows reattempt)"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && deleteModal.student && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <TrashIcon className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-bold text-gray-900">Delete Result</h3>
                <p className="text-gray-600">This action cannot be undone.</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete the result for:
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-semibold text-gray-900">{deleteModal.student.studentId.name}</p>
                <p className="text-gray-600">{deleteModal.student.studentId.email}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Score: {deleteModal.student.percentage.toFixed(1)}% ({deleteModal.student.totalScore}/{deleteModal.student.maxScore})
                </p>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                <strong>Note:</strong> This will allow the student to reattempt the exam.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteModal({ show: false, student: null })}
                disabled={deleting}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteResult}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <TrashIcon className="h-4 w-4" />
                    <span>Delete Result</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Detail Modal */}
      <StudentDetailModal
        open={showStudentDetail}
        onClose={() => {
                        setShowStudentDetail(false);
                        setSelectedStudent(null);
                      }}
        student={selectedStudent}
        getScoreColor={getScoreColor}
        formatDate={formatDate}
        formatDuration={formatDuration}
        formatTimeTaken={formatTimeTaken}
        calcSecondsBetween={calcSecondsBetween}
      />
    </div>
  );
};

export default InstructorResults;