import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import apiService from '../services/api';
import {
  ChartBarIcon,
  DocumentArrowDownIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  AcademicCapIcon,
  TrophyIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  DocumentTextIcon,
  ChartPieIcon
} from '@heroicons/react/24/outline';

interface StudentResult {
  _id: string;
  examId: {
    _id: string;
    title: string;
    description: string;
    duration: number;
    totalQuestions: number;
    maxScore: number;
    passingScore?: number; // Added passingScore to the interface
  };
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  percentage: number;
  submittedAt?: string;
  duration: number;
  status: 'completed' | 'incomplete' | 'disqualified';
  proctorAlerts: number;
  questionDetails?: QuestionDetail[];
  attemptNumber: number;
  startTime: string;
  endTime: string;
  answers?: Answer[]; // Added answers to the interface
  passed?: boolean; // Pass/fail status from backend
  timeTaken?: number; // Total time taken in seconds
  timeLeft?: number; // Time left at submission (for accurate time taken calculation)
  awaiting?: boolean; // Added awaiting field
  allowReview?: boolean; // Added allowReview field
}

interface Answer {
  questionId: string;
  answer: string;
  correctAnswer: string;
  isCorrect: boolean;
  points: number;
  timeSpent?: number; // Added timeSpent to the interface
  questionText?: string; // Added questionText to the interface
  options?: string[]; // Added options to the interface
}

interface QuestionDetail {
  questionId: string;
  questionText: string;
  questionType: string;
  studentAnswer: string | string[];
  correctAnswer: string | string[];
  isCorrect: boolean;
  points: number;
  maxPoints: number;
  timeSpent: number;
  proctorFlags: string[];
}

interface PerformanceStats {
  totalExams: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  totalQuestions: number;
  correctAnswers: number;
  overallAccuracy: number;
  totalTimeSpent: number;
  averageTimePerQuestion: number;
  improvementTrend: 'up' | 'down' | 'stable';
}

const Results: React.FC = () => {
  const location = useLocation();
  const [results, setResults] = useState<StudentResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<StudentResult | null>(null);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);

  useEffect(() => {
    console.log('Results component mounted, fetching results...');
    fetchResults();
  }, [location.pathname]);

  // Close detailed view modal on route change
  useEffect(() => {
    setShowDetailedView(false);
  }, [location.pathname]);

  // Improved modal UX: prevent background scroll, close on route change or Escape
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (showDetailedView) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setShowDetailedView(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [showDetailedView]);
  useEffect(() => {
    setShowDetailedView(false);
  }, [location.pathname]);

  // Show all results (only first attempts are stored now)
  const getAllResults = (results: StudentResult[]) => {
    console.log('getAllResults called with:', results.length, 'results');
    const filtered = results.filter(result => {
      const examId = typeof result.examId === 'string' ? result.examId : result.examId?._id;
      if (!examId) {
        console.log('Filtering out result with no examId:', result);
        return false;
      }
      return true;
    });
    console.log('getAllResults returning:', filtered.length, 'results');
    return filtered;
  };

  // Deduplicate results: keep only the latest result per examId
  const deduplicateResults = (results: StudentResult[]) => {
    const map = new Map();
    for (const result of results) {
      const examId = typeof result.examId === 'string' ? result.examId : result.examId?._id;
      if (!examId) continue;
      if (!map.has(examId) || (result.submittedAt && map.get(examId).submittedAt && new Date(result.submittedAt) > new Date(map.get(examId).submittedAt))) {
        map.set(examId, result);
      }
    }
    return Array.from(map.values());
  };

  // Use deduplicated results for display and stats
  const allResults = deduplicateResults(getAllResults(results));

  useEffect(() => {
    console.log('useEffect triggered, allResults length:', allResults.length);
    if (allResults.length > 0) {
      console.log('Calculating performance stats for:', allResults.length, 'results');
      calculatePerformanceStats(allResults);
    } else {
      console.log('No results to calculate stats for');
    }
  }, [allResults]);

  // Update stats calculation to use only first attempts
  const calculatePerformanceStats = (filteredResults: StudentResult[]) => {
    if (filteredResults.length === 0) return;

    const totalExams = filteredResults.length;
    const totalQuestions = filteredResults.reduce((sum, result) => sum + result.totalQuestions, 0);
    const totalCorrect = filteredResults.reduce((sum, result) => sum + result.correctAnswers, 0);
    // Calculate total time as the sum of time taken to submit each exam
    const totalTime = filteredResults.reduce((sum, result) => {
      const t = Number(result.timeTaken);
      if (!isNaN(t) && t > 0) {
        return sum + t;
      } else if (result.startTime && result.endTime) {
        const start = new Date(result.startTime);
        const end = new Date(result.endTime);
        const diff = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
        return sum + (isNaN(diff) ? 0 : diff);
      }
      return sum;
    }, 0);
    const scores = filteredResults.map(r => r.percentage).sort((a, b) => a - b);
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / totalExams;
    const overallAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
    const averageTimePerQuestion = totalQuestions > 0 ? totalTime / totalQuestions : 0;
    // Calculate improvement trend
    let improvementTrend: 'up' | 'down' | 'stable' = 'stable';
    if (filteredResults.length >= 2) {
      const recentScores = filteredResults.slice(-3).map(r => r.percentage);
      const firstHalf = recentScores.slice(0, Math.ceil(recentScores.length / 2));
      const secondHalf = recentScores.slice(Math.ceil(recentScores.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      if (secondAvg > firstAvg + 5) improvementTrend = 'up';
      else if (secondAvg < firstAvg - 5) improvementTrend = 'down';
    }
    setPerformanceStats({
      totalExams,
      averageScore,
      highestScore,
      lowestScore,
      totalQuestions,
      correctAnswers: totalCorrect,
      overallAccuracy,
      totalTimeSpent: totalTime,
      averageTimePerQuestion,
      improvementTrend
    });
  };

  const fetchResults = async () => {
    try {
      setLoading(true);
      console.log('Fetching user results...');
      const response = await apiService.results.getUserResults();
      console.log('API Response:', response);
      
      const resultsData = response.data || [];
      console.log('Results data:', resultsData);
      

      
      // Transform the data to include calculated fields
      const transformedResults = resultsData.map((result: any) => {
        // Use exam's totalQuestions if available, otherwise calculate from answers
        const totalQuestions = result.examId?.totalQuestions || (result.answers ? result.answers.length : 0);
        
        // Calculate timeTaken with multiple fallbacks
        let timeTaken = result.timeTaken;
        if (typeof result.timeLeft === 'number' && typeof result.examId?.duration === 'number') {
          timeTaken = Math.max(0, result.examId.duration * 60 - result.timeLeft);
        } else if (result.startTime && result.endTime) {
          const start = new Date(result.startTime);
          const end = new Date(result.endTime);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            timeTaken = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
          }
        } else if (typeof result.examId?.duration === 'number') {
          timeTaken = result.examId.duration * 60; // Use full duration as fallback
        }
        
        // Ensure startTime and endTime are valid
        let startTime = result.startTime;
        let endTime = result.endTime;
        
        if (!startTime || startTime === 'Invalid Date' || startTime === 'null') {
          startTime = result.createdAt || new Date().toISOString();
        }
        
        if (!endTime || endTime === 'Invalid Date' || endTime === 'null') {
          endTime = result.updatedAt || result.createdAt || new Date().toISOString();
        }
        
        // Ensure submittedAt is valid - use endTime as submission time, fallback to updatedAt
        let submittedAt = result.submittedAt;
        if (!submittedAt || submittedAt === 'Invalid Date' || submittedAt === 'null' || submittedAt === 'undefined') {
          // Use endTime as the submission time (when exam was completed)
          // Fallback to updatedAt (when result was last modified)
          // Then createdAt (when result was created)
          submittedAt = result.endTime || result.updatedAt || result.createdAt || new Date().toISOString();
        }
        
        const correctAnswers = Array.isArray(result.answers)
          ? result.answers.filter((a: any) => a.isCorrect).length
          : 0;
          
        return {
          ...result,
          totalQuestions,
          timeTaken,
          correctAnswers,
          startTime,
          endTime,
          submittedAt,
        };
      });
      
      console.log('Transformed results:', transformedResults);
      setResults(transformedResults);
    } catch (error) {
      console.error('Error fetching results:', error);
      // Set empty results to show the "no results" state
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Use all results for display
  const filteredResults = allResults.filter((result: StudentResult) => {
    const matchesSearch = result.examId?.title?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const matchesFilter = filter === 'all' || result.status === filter;
    return matchesSearch && matchesFilter;
  });

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

  const getScoreBadgeColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-100 text-green-800 border-green-200';
    if (percentage >= 80) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (percentage >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const formatDuration = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'Invalid Date' || dateString === 'null' || dateString === 'undefined') {
      return 'Not available';
    }
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Not available';
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Not available';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />;
      case 'down': return <ArrowTrendingDownIcon className="h-5 w-5 text-red-600" />;
      default: return <MinusIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  // Helper to determine pass/fail
  const getPassStatus = (result: StudentResult) => {
    // Use the passed field from backend if available, otherwise calculate
    if (result.passed !== undefined) {
      return result.passed ? 'Pass' : 'Fail';
    }
    // Fallback calculation
    const passingScore = (result.examId as any).passingScore || 60;
    return result.percentage >= passingScore ? 'Pass' : 'Fail';
  };

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

  // Helper to get time taken for a result
  function getTimeTaken(result: StudentResult): string {
    // Try to calculate from start and end time first
    if (result.startTime && result.endTime) {
      const seconds = calcSecondsBetween(result.startTime, result.endTime);
      if (seconds > 0) {
        return formatTimeTaken(seconds);
      }
    }
    
    // Try to calculate from timeLeft and duration
    if (typeof result.timeLeft === 'number' && typeof result.examId?.duration === 'number') {
      const seconds = Math.max(0, result.examId.duration * 60 - result.timeLeft);
      return formatTimeTaken(seconds);
    } 
    
    // Use timeTaken if available
    if (typeof result.timeTaken === 'number' && result.timeTaken > 0) {
      return formatTimeTaken(result.timeTaken);
    }
    
    // Fallback to calculating from duration if available
    if (typeof result.examId?.duration === 'number') {
      return formatTimeTaken(result.examId.duration * 60);
    }
    
    return '0m 0s';
  }

  // Add this function to download all results as PDF
  const handleExportAllPDF = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://examproctor-backend-e6mh.onrender.com/api'}/results/export-all`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to download PDF');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'exam-results-report.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to download report.');
    }
  };
  // Add this function to download a single result as PDF
  const handleExportSinglePDF = async (resultId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://examproctor-backend-e6mh.onrender.com/api'}/results/${resultId}/export`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to download PDF');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `exam-result-${resultId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to download report.');
    }
  };

  // Helper for average time calculation (avoid linter errors)
  function getAverageTime(performanceStats: PerformanceStats | null): number {
    if (!performanceStats) return 0;
    const total = Number(performanceStats.totalTimeSpent ?? 0);
    const count = Math.max(1, Number(performanceStats.totalExams ?? 1));
    return Math.round(total / count);
  }

  // Helper to format seconds as hh:mm:ss
  function formatTotalTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8" style={{ height: '1300px' }}>
      {/* Header with Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-8 text-white max-w-7xl mx-auto">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">My Exam Results</h1>
              <p className="text-blue-100 text-lg">
                Track your academic progress and performance analytics
              </p>
              <div className="flex items-center mt-4 space-x-4 text-sm">
                <span className="flex items-center">
                  <AcademicCapIcon className="h-4 w-4 mr-1" />
                  {allResults.length} Exams Completed
                </span>
                <span className="flex items-center">
                  <TrophyIcon className="h-4 w-4 mr-1" />
                  {performanceStats?.averageScore.toFixed(2)}% Average
                </span>
                <span className="flex items-center">
                  {getTrendIcon(performanceStats?.improvementTrend || 'stable')}
                  {performanceStats?.improvementTrend === 'up' ? 'Improving' : 
                   performanceStats?.improvementTrend === 'down' ? 'Needs Focus' : 'Stable'}
                </span>
              </div>
            </div>
            <div className="mt-6 lg:mt-0">
              <button
                onClick={handleExportAllPDF}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center"
              >
                <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                Export Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Overview Cards */}
      {performanceStats && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Average</p>
                <p className="text-3xl font-bold text-gray-900">{performanceStats.averageScore.toFixed(2)}%</p>
              </div>
              <div className="p-3 bg-blue-500 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-600">Accuracy: {performanceStats.overallAccuracy.toFixed(2)}%</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Best Performance</p>
                <p className="text-3xl font-bold text-green-600">{performanceStats.highestScore.toFixed(2)}%</p>
              </div>
              <div className="p-3 bg-green-500 rounded-lg">
                <TrophyIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-600">Out of {performanceStats.totalExams} exams</span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Questions Answered</p>
                <p className="text-3xl font-bold text-gray-900">{performanceStats.totalQuestions}</p>
              </div>
              <div className="p-3 bg-purple-500 rounded-lg">
                <ChartPieIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-600">{performanceStats.correctAnswers} correct</span>
            </div>
          </div>

          {/* Remove Time Efficiency card and add Average Time card */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Time</p>
                <p className="text-3xl font-bold text-gray-900">{performanceStats && performanceStats.totalExams > 0 ? formatTimeTaken(getAverageTime(performanceStats)) : '0m 0s'}</p>
              </div>
              <div className="p-3 bg-orange-500 rounded-lg">
                <ClockIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-600">Average time per exam</span>
            </div>
          </div>
        </div>
      )}

      {/* Performance Analytics */}
      {performanceStats && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Insights */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              Performance Insights
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="font-medium text-blue-800">Overall Performance</span>
                <span className="text-sm font-medium text-blue-600">{performanceStats.averageScore.toFixed(2)}%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="font-medium text-green-800">Best Score</span>
                <span className="text-sm font-medium text-green-600">{performanceStats.highestScore.toFixed(2)}%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="font-medium text-purple-800">Questions Answered</span>
                <span className="text-sm font-medium text-purple-600">{performanceStats.totalQuestions}</span>
              </div>
              {/* Remove Time Efficiency row from Performance Insights and add Average Time */}
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <span className="font-medium text-orange-800">Average Time</span>
                <span className="text-sm font-medium text-orange-600">{performanceStats && performanceStats.totalExams > 0 ? formatTimeTaken(getAverageTime(performanceStats)) : '0m 0s'} per exam</span>
              </div>
            </div>
          </div>

          {/* Improvement Trend */}
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <ArrowTrendingUpIcon className="h-5 w-5 text-blue-500 mr-2" />
              Performance Trend
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Recent Performance</span>
                <div className="flex items-center space-x-2">
                  {getTrendIcon(performanceStats.improvementTrend)}
                  <span className={`font-medium ${
                    performanceStats.improvementTrend === 'up' ? 'text-green-600' :
                    performanceStats.improvementTrend === 'down' ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {performanceStats.improvementTrend === 'up' ? 'Improving' : 
                     performanceStats.improvementTrend === 'down' ? 'Needs Focus' : 'Stable'}
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-2">Performance Summary</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Exams Taken:</span>
                    <div className="font-semibold text-gray-900">{performanceStats.totalExams}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Accuracy:</span>
                    <div className="font-semibold text-gray-900">{performanceStats.overallAccuracy.toFixed(2)}%</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Correct Answers:</span>
                    <div className="font-semibold text-gray-900">{performanceStats.correctAnswers}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Time:</span>
                    <div className="font-semibold text-gray-900">{formatTotalTime(performanceStats.totalTimeSpent)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-purple-400" />
            <input
              type="text"
              placeholder="Search results..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-3 w-full border border-purple-300 rounded-full focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-purple-50 text-gray-700 placeholder-gray-400 transition-all duration-300"
            />
          </div>
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-6 w-6 text-purple-400" />
            <div className="relative">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="appearance-none border border-purple-300 rounded-full px-4 py-3 pr-8 min-w-[140px] bg-purple-50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-700 transition-all duration-300"
              >
                <option value="all">All Results</option>
                <option value="completed">Completed</option>
                <option value="incomplete">Incomplete</option>
              </select>
              <svg className="w-4 h-4 text-purple-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Results Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16 overflow-y-auto" style={{ maxHeight: '70vh' }}>
        {filteredResults.map((result) => {
          // Calculate total score as sum of points for correct answers
          const totalScore = result.answers && result.answers.length > 0
            ? result.answers.filter((a: any) => a.isCorrect).reduce((sum: number, a: any) => sum + (a.points || 0), 0)
            : 0;
          // Awaiting logic
          if ((result as any).awaiting) {
            return (
              <div key={result._id} className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-xl border border-yellow-400 hover:shadow-2xl hover:border-yellow-500 transform hover:scale-105 transition-all duration-200 will-change-transform flex flex-col justify-between p-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{result.examId?.title || 'Exam Title Not Available'}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2">{result.examId?.description || 'Exam Description Not Available'}</p>
                </div>
                <div className="flex flex-col items-center justify-center mt-8">
                  <span className="inline-block px-6 py-3 rounded-full text-lg font-bold mb-2 bg-yellow-100 text-yellow-800 border-2 border-yellow-300">Awaiting Result Release</span>
                  <div className="text-xs text-gray-500">Your result will be available once released by the instructor.</div>
                </div>
              </div>
            );
          }
          // Normal result card
          return (
            <div key={result._id} className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl hover:border-blue-400 transform hover:scale-105 transition-all duration-200 will-change-transform">
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{result.examId?.title || 'Exam Title Not Available'}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2">{result.examId?.description || 'Exam Description Not Available'}</p>
                  </div>
                  <span className={`px-4 py-1 text-lg font-bold rounded-full border-2 ${getScoreBadgeColor(result.percentage)}`}>{result.percentage.toFixed(2)}%</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-blue-600 font-semibold">Score</div>
                    <div className="text-xl font-bold text-blue-900">{totalScore}</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-green-600 font-semibold">Correct</div>
                    <div className="text-xl font-bold text-green-900">{result.correctAnswers}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>Time Taken: <span className="font-medium text-gray-900">{getTimeTaken(result)}</span></span>
                  <span>Submitted: <span className="font-medium text-gray-900">{formatDate(result.submittedAt)}</span></span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(result.status)}`}>{result.status}</span>
                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border-2 ${getPassStatus(result) === 'Pass' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300'}`}>{getPassStatus(result)}</span>
                </div>
                <button
                  onClick={() => { setSelectedResult(result); setShowDetailedView(true); }}
                  className="mt-6 w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold shadow hover:from-blue-700 hover:to-indigo-700 transition-all"
                  disabled={!(result as any).allowReview}
                  title={!(result as any).allowReview ? 'Review not allowed for this exam' : ''}
                >
                  View Details
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredResults.length === 0 && (
        <div className="max-w-2xl mx-auto text-center py-12 bg-white rounded-xl shadow-lg border border-gray-100">
          <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-600">
            {searchTerm || filter !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'You haven\'t completed any exams yet. Start by taking an exam!'
            }
          </p>
          {!searchTerm && filter === 'all' && (
            <Link
              to="/dashboard"
              className="inline-flex items-center mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <AcademicCapIcon className="h-5 w-5 mr-2" />
              Browse Available Exams
            </Link>
          )}
        </div>
      )}

      {/* Detailed View Modal */}
      {showDetailedView && selectedResult && !((selectedResult as any).awaiting) && ((selectedResult as any).allowReview !== false) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', transition: 'background 0.3s' }}>
          <div
            ref={modalRef}
            className="bg-white rounded-2xl max-w-7xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in"
            style={{ transition: 'transform 0.3s, opacity 0.3s' }}
          >
            <div className="p-8 border-b border-gray-200 flex items-center justify-between">
                <div>
                <h2 className="text-3xl font-extrabold text-gray-900">
                    {selectedResult.examId?.title || 'Exam Title Not Available'}
                  </h2>
                <p className="text-gray-500 mt-1 text-lg">Detailed Performance Analysis</p>
                </div>
                <button
                  onClick={() => setShowDetailedView(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
                >
                <XCircleIcon className="h-7 w-7" />
                </button>
            </div>
            <div className="p-8 space-y-10">
              {/* Redesigned Performance Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 shadow flex flex-col md:flex-row md:items-center md:justify-between gap-8">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="text-center">
                    <div className={`text-4xl font-extrabold ${getScoreColor(selectedResult.percentage)}`}>{selectedResult.percentage.toFixed(2)}%</div>
                    <div className="text-base text-gray-600 mt-1">Final Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-extrabold text-green-700">{selectedResult.correctAnswers}</div>
                    <div className="text-base text-gray-600 mt-1">Correct Answers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-extrabold text-indigo-700">{formatTimeTaken(calcSecondsBetween(selectedResult.startTime, selectedResult.endTime))}</div>
                    <div className="text-base text-gray-600 mt-1">Total Time Taken</div>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center mt-8 md:mt-0">
                  <div className={`inline-block px-6 py-3 rounded-full text-lg font-bold mb-2 ${getPassStatus(selectedResult) === 'Pass' ? 'bg-green-100 text-green-800 border-2 border-green-300' : 'bg-red-100 text-red-800 border-2 border-red-300'}`}>{getPassStatus(selectedResult)}</div>
                  <div className="text-xs text-gray-500">Status</div>
                </div>
              </div>
              {/* Exam Details (remove Max Score, keep clean) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Exam Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Exam Title:</span>
                      <span className="font-medium">{selectedResult.examId?.title || 'Exam Title Not Available'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">{selectedResult.examId?.duration || 0} minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Questions:</span>
                      <span className="font-medium">{selectedResult.examId?.totalQuestions || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Attempt Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Start Time:</span>
                      <span className="font-medium">{formatDate(selectedResult.startTime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">End Time:</span>
                      <span className="font-medium">{formatDate(selectedResult.endTime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedResult.status)}`}>{selectedResult.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Performance Insights */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  Performance Insights
                </h4>
                <div className="space-y-3">
                  {selectedResult.percentage >= 90 && (
                    <div className="flex items-center text-green-700">
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      <span>Excellent performance! You've mastered this subject area.</span>
                    </div>
                  )}
                  {selectedResult.percentage >= 80 && selectedResult.percentage < 90 && (
                    <div className="flex items-center text-blue-700">
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      <span>Great work! You have a solid understanding of the material.</span>
                    </div>
                  )}
                  {selectedResult.percentage >= 70 && selectedResult.percentage < 80 && (
                    <div className="flex items-center text-yellow-700">
                      <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                      <span>Good effort! Consider reviewing the topics you found challenging.</span>
                    </div>
                  )}
                  {selectedResult.percentage < 70 && (
                    <div className="flex items-center text-red-700">
                      <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                      <span>This area needs more focus. Consider additional study and practice.</span>
                    </div>
                  )}
                  
                  <div className="flex items-center text-gray-700">
                    <ClockIcon className="h-4 w-4 mr-2" />
                    <span>You completed the exam in {formatTimeTaken(calcSecondsBetween(selectedResult.startTime, selectedResult.endTime))}</span>
                  </div>
                </div>
              </div>

              {/* Question Review Section */}
              {selectedResult.answers && selectedResult.answers.length > 0 ? (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Question Review</h4>
                  <div className="space-y-4">
                    {selectedResult.answers.map((answer: any, index: number) => (
                      <div key={answer.questionId} className={`border rounded-xl p-6 ${
                        answer.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                      }`}>
                        <div className="flex items-start justify-between mb-4">
                          <h5 className="font-semibold text-gray-900">
                            Question {index + 1}
                          </h5>
                          <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${answer.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{answer.isCorrect ? 'Correct' : 'Incorrect'}</span>
                          </div>
                        <div className="mb-2 text-gray-900 font-medium">{answer.questionText || 'Question text not available'}</div>
                        <div className="mb-2">
                          {answer.options && answer.options.length > 0 && (
                            <ul className="list-disc pl-5 space-y-1">
                              {answer.options.map((opt: string, i: number) => (
                                <li key={i} className={
                                  (opt === answer.answer ? 'font-bold underline' : '') +
                                  (opt === answer.correctAnswer ? ' text-green-700' : '')
                                }>
                                  {String.fromCharCode(65 + i)}. {opt}
                                  {opt === answer.answer && <span className="ml-2 text-xs text-blue-600">(Your Answer)</span>}
                                  {opt === answer.correctAnswer && <span className="ml-2 text-xs text-green-600">(Correct)</span>}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="mb-2 text-sm text-gray-700">
                          <span className="font-semibold">Your Answer:</span> {answer.answer || 'N/A'}
                          </div>
                        <div className="mb-2 text-sm text-gray-700">
                          <span className="font-semibold">Correct Answer:</span> {answer.correctAnswer || 'N/A'}
                            </div>
                        <div className="mb-2 text-sm text-gray-700">
                          <span className="font-semibold">Points:</span> {answer.points}
                            </div>
                        {/* Removed per-question time taken */}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-center py-8">Question Details Not Available<br />Detailed question analysis is not available for this exam.</div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200">
              <div className="flex justify-end space-x-3 mt-8">
                <button
                  onClick={() => setShowDetailedView(false)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => handleExportSinglePDF(selectedResult._id)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                  Export Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal animation styles */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.25s cubic-bezier(0.4,0,0.2,1);
        }
      `}</style>
    </div>
  );
};

export default Results; 