import React, { useState } from 'react';
import {
  ChartBarIcon,
  ClockIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  AcademicCapIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface AnalyticsData {
  totalExams: number;
  totalStudents: number;
  averageScore: number;
  completionRate: number;
  proctorAlerts: number;
  timeSpentData: TimeSpentData[];
  scoreDistribution: ScoreDistribution[];
  examPerformance: ExamPerformance[];
  monthlyTrends: MonthlyTrend[];
  topPerformers: TopPerformer[];
  recentActivity: RecentActivity[];
}

interface TimeSpentData {
  examId: string;
  examTitle: string;
  averageTime: number;
  totalStudents: number;
}

interface ScoreDistribution {
  range: string;
  count: number;
  percentage: number;
}

interface ExamPerformance {
  examId: string;
  examTitle: string;
  totalStudents: number;
  averageScore: number;
  completionRate: number;
  proctorAlerts: number;
}

interface MonthlyTrend {
  month: string;
  exams: number;
  students: number;
  averageScore: number;
}

interface TopPerformer {
  studentId: string;
  studentName: string;
  examTitle: string;
  score: number;
  timeSpent: number;
  date: string;
}

interface RecentActivity {
  id: string;
  type: 'exam_completed' | 'exam_started' | 'proctor_alert' | 'student_registered';
  description: string;
  timestamp: string;
  studentName?: string;
  examTitle?: string;
}

const Analytics: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [selectedExam, setSelectedExam] = useState('all');

  // Mock analytics data
  const analyticsData: AnalyticsData = {
    totalExams: 15,
    totalStudents: 342,
    averageScore: 78.5,
    completionRate: 92.3,
    proctorAlerts: 47,
    timeSpentData: [
      { examId: '1', examTitle: 'JavaScript Fundamentals', averageTime: 45, totalStudents: 45 },
      { examId: '2', examTitle: 'Advanced Mathematics', averageTime: 75, totalStudents: 32 },
      { examId: '3', examTitle: 'Web Development Basics', averageTime: 60, totalStudents: 28 },
      { examId: '4', examTitle: 'Database Design', averageTime: 90, totalStudents: 25 }
    ],
    scoreDistribution: [
      { range: '90-100%', count: 45, percentage: 15.2 },
      { range: '80-89%', count: 78, percentage: 26.3 },
      { range: '70-79%', count: 89, percentage: 30.0 },
      { range: '60-69%', count: 52, percentage: 17.5 },
      { range: '50-59%', count: 23, percentage: 7.7 },
      { range: '0-49%', count: 10, percentage: 3.3 }
    ],
    examPerformance: [
      { examId: '1', examTitle: 'JavaScript Fundamentals', totalStudents: 45, averageScore: 82.3, completionRate: 95.6, proctorAlerts: 8 },
      { examId: '2', examTitle: 'Advanced Mathematics', totalStudents: 32, averageScore: 71.8, completionRate: 87.5, proctorAlerts: 12 },
      { examId: '3', examTitle: 'Web Development Basics', totalStudents: 28, averageScore: 88.9, completionRate: 96.4, proctorAlerts: 3 },
      { examId: '4', examTitle: 'Database Design', totalStudents: 25, averageScore: 76.2, completionRate: 92.0, proctorAlerts: 7 }
    ],
    monthlyTrends: [
      { month: 'Jan', exams: 3, students: 45, averageScore: 75.2 },
      { month: 'Feb', exams: 4, students: 67, averageScore: 78.9 },
      { month: 'Mar', exams: 5, students: 89, averageScore: 81.3 },
      { month: 'Apr', exams: 3, students: 56, averageScore: 79.8 },
      { month: 'May', exams: 6, students: 98, averageScore: 83.1 },
      { month: 'Jun', exams: 4, students: 72, averageScore: 80.5 }
    ],
    topPerformers: [
      { studentId: 'STU001', studentName: 'John Smith', examTitle: 'JavaScript Fundamentals', score: 98, timeSpent: 42, date: '2024-01-15' },
      { studentId: 'STU002', studentName: 'Maria Garcia', examTitle: 'Web Development Basics', score: 96, timeSpent: 58, date: '2024-01-20' },
      { studentId: 'STU003', studentName: 'David Johnson', examTitle: 'Advanced Mathematics', score: 94, timeSpent: 78, date: '2024-01-18' },
      { studentId: 'STU004', studentName: 'Sarah Wilson', examTitle: 'Database Design', score: 92, timeSpent: 85, date: '2024-01-22' },
      { studentId: 'STU005', studentName: 'Michael Brown', examTitle: 'JavaScript Fundamentals', score: 90, timeSpent: 48, date: '2024-01-16' }
    ],
    recentActivity: [
      { id: '1', type: 'exam_completed', description: 'Exam completed', studentName: 'John Smith', examTitle: 'JavaScript Fundamentals', timestamp: '2024-01-15T11:30:00' },
      { id: '2', type: 'proctor_alert', description: 'Proctor alert triggered', studentName: 'Maria Garcia', examTitle: 'Web Development Basics', timestamp: '2024-01-15T10:45:00' },
      { id: '3', type: 'exam_started', description: 'Exam started', studentName: 'David Johnson', examTitle: 'Advanced Mathematics', timestamp: '2024-01-15T10:00:00' },
      { id: '4', type: 'student_registered', description: 'New student registered', studentName: 'Sarah Wilson', timestamp: '2024-01-15T09:30:00' }
    ]
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'exam_completed': return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
      case 'exam_started': return <ClockIcon className="h-4 w-4 text-blue-600" />;
      case 'proctor_alert': return <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />;
      case 'student_registered': return <UserGroupIcon className="h-4 w-4 text-purple-600" />;
      default: return <EyeIcon className="h-4 w-4 text-secondary-600" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
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

  const exportAnalytics = () => {
    console.log('Exporting analytics data...');
    alert('Analytics report downloaded successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900">Analytics Dashboard</h1>
          <p className="text-secondary-600 mt-2">
            Comprehensive insights into exam performance and student analytics.
          </p>
        </div>
        <div className="flex space-x-2 mt-4 sm:mt-0">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="input-field"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <button
            onClick={exportAnalytics}
            className="btn-primary inline-flex items-center"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-600">Total Exams</p>
              <p className="text-2xl font-semibold text-secondary-900">{analyticsData.totalExams}</p>
              <p className="text-xs text-secondary-500 mt-1">
                <ArrowTrendingUpIcon className="h-3 w-3 inline mr-1 text-green-600" />
                +12% from last month
              </p>
            </div>
            <div className="p-3 bg-blue-500 rounded-lg">
              <AcademicCapIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-600">Total Students</p>
              <p className="text-2xl font-semibold text-secondary-900">{analyticsData.totalStudents}</p>
              <p className="text-xs text-secondary-500 mt-1">
                <ArrowTrendingUpIcon className="h-3 w-3 inline mr-1 text-green-600" />
                +8% from last month
              </p>
            </div>
            <div className="p-3 bg-green-500 rounded-lg">
              <UserGroupIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-600">Average Score</p>
              <p className="text-2xl font-semibold text-secondary-900">{analyticsData.averageScore.toFixed(2)}%</p>
              <p className="text-xs text-secondary-500 mt-1">
                <ArrowTrendingUpIcon className="h-3 w-3 inline mr-1 text-green-600" />
                +2.3% from last month
              </p>
            </div>
            <div className="p-3 bg-yellow-500 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-600">Completion Rate</p>
              <p className="text-2xl font-semibold text-secondary-900">{analyticsData.completionRate.toFixed(2)}%</p>
              <p className="text-xs text-secondary-500 mt-1">
                <ArrowTrendingDownIcon className="h-3 w-3 inline mr-1 text-red-600" />
                -1.2% from last month
              </p>
            </div>
            <div className="p-3 bg-purple-500 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">Score Distribution</h3>
          <div className="space-y-3">
            {analyticsData.scoreDistribution.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-secondary-600 w-16">{item.range}</span>
                <div className="flex-1 mx-4">
                  <div className="w-full bg-secondary-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
                <span className="text-sm font-medium text-secondary-900 w-12 text-right">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Trends */}
        <div className="card">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">Monthly Trends</h3>
          <div className="space-y-4">
            {analyticsData.monthlyTrends.map((trend, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CalendarIcon className="h-5 w-5 text-secondary-400" />
                  <span className="font-medium text-secondary-900">{trend.month}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-secondary-600">
                    {trend.exams} exams • {trend.students} students
                  </div>
                  <div className="text-sm font-medium text-secondary-900">
                    {trend.averageScore.toFixed(2)}% avg
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Exam Performance Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-secondary-900">Exam Performance</h3>
          <select
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
            className="input-field"
          >
            <option value="all">All Exams</option>
            {analyticsData.examPerformance.map(exam => (
              <option key={exam.examId} value={exam.examId}>{exam.examTitle}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-secondary-200">
            <thead className="bg-secondary-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Exam
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Students
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Avg Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Completion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                  Alerts
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-secondary-200">
              {analyticsData.examPerformance.map((exam) => (
                <tr key={exam.examId} className="hover:bg-secondary-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-secondary-900">{exam.examTitle}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                    {exam.totalStudents}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${getScoreColor(exam.averageScore)}`}>
                      {exam.averageScore.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                    {exam.completionRate.toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                    {exam.proctorAlerts > 0 ? (
                      <span className="text-red-600 font-medium">{exam.proctorAlerts}</span>
                    ) : (
                      <span className="text-green-600">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Performers and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="card">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">Top Performers</h3>
          <div className="space-y-3">
            {analyticsData.topPerformers.map((performer, index) => (
              <div key={performer.studentId} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-600">{index + 1}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-secondary-900">{performer.studentName}</div>
                    <div className="text-xs text-secondary-500">{performer.examTitle}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${getScoreColor(performer.score)}`}>
                    {performer.score.toFixed(2)}%
                  </div>
                  <div className="text-xs text-secondary-500">
                    {performer.timeSpent} min
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {analyticsData.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 p-3 bg-secondary-50 rounded-lg">
                <div className="mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-secondary-900">
                    {activity.description}
                    {activity.studentName && (
                      <span className="font-medium"> {activity.studentName}</span>
                    )}
                    {activity.examTitle && (
                      <span> - {activity.examTitle}</span>
                    )}
                  </div>
                  <div className="text-xs text-secondary-500 mt-1">
                    {formatDate(activity.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Time Analysis */}
      <div className="card">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Time Analysis by Exam</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {analyticsData.timeSpentData.map((timeData) => (
            <div key={timeData.examId} className="p-4 bg-secondary-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <ClockIcon className="h-5 w-5 text-secondary-400" />
                <span className="text-sm font-medium text-secondary-900">
                  {timeData.averageTime} min
                </span>
              </div>
              <div className="text-sm text-secondary-600 mb-1">{timeData.examTitle}</div>
              <div className="text-xs text-secondary-500">{timeData.totalStudents} students</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Analytics; 