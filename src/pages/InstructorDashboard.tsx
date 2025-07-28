import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import apiService from '../services/api';
import {
  AcademicCapIcon,
  DocumentTextIcon,
  ChartBarIcon,
  UsersIcon,
  PlusIcon,
  VideoCameraIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  TrophyIcon,
  CalendarIcon,
  BellIcon,
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  SparklesIcon,
  StarIcon,
  FireIcon,
  LightBulbIcon,
  RocketLaunchIcon,
  HeartIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  CpuChipIcon,
  WifiIcon,
  Battery100Icon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

interface DashboardStats {
  totalExams: number;
  activeExams: number;
  totalStudents: number;
  totalClassrooms: number;
  recentResults: number;
  proctorAlerts: number;
}

interface RecentExam {
  id: string;
  title: string;
  status: string;
  studentsCompleted: number;
  startTime: string;
  endTime: string;
  alerts: number;
}

interface RecentActivity {
  id: string;
  type: string;
  message: string;
  time: string;
  user: string;
}

const InstructorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalExams: 0,
    activeExams: 0,
    totalStudents: 0,
    totalClassrooms: 0,
    recentResults: 0,
    proctorAlerts: 0
  });
  const [recentExams, setRecentExams] = useState<RecentExam[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Constants for performance optimization
  const INITIAL_ACTIVITY_LIMIT = 5;
  const MAX_ACTIVITIES_TO_SHOW = 20;
  const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

  // Debounced refresh function
  const debouncedRefresh = useCallback(
    debounce(async () => {
      const now = new Date();
      const timeSinceLastRefresh = now.getTime() - lastRefresh.getTime();
      
      // Only refresh if more than 30 seconds have passed
      if (timeSinceLastRefresh > 30000) {
        await fetchDashboardData();
        setLastRefresh(now);
      }
    }, 1000),
    [lastRefresh]
  );

  // Debounce utility function
  function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  // Memoized filtered activities for better performance
  const displayedActivities = useMemo(() => {
    const limit = showAllActivities ? MAX_ACTIVITIES_TO_SHOW : INITIAL_ACTIVITY_LIMIT;
    return recentActivity.slice(0, limit);
  }, [recentActivity, showAllActivities]);

  // Memoized activity count for performance
  const hasMoreActivities = useMemo(() => {
    return recentActivity.length > INITIAL_ACTIVITY_LIMIT;
  }, [recentActivity.length]);

  useEffect(() => {
    fetchDashboardData();
    
    // Update time every minute
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    // Auto-refresh dashboard data every 5 minutes
    const refreshInterval = setInterval(() => {
      debouncedRefresh();
    }, REFRESH_INTERVAL);

    return () => {
      clearInterval(timeInterval);
      clearInterval(refreshInterval);
    };
  }, [debouncedRefresh]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard stats
      const statsResponse = await apiService.dashboard.getStats();
      if (statsResponse.success) {
        setStats(statsResponse.data);
      }

      // Fetch recent exams
      const examsResponse = await apiService.dashboard.getRecentExams();
      if (examsResponse.success) {
        setRecentExams(examsResponse.data);
      }

      // Fetch recent activity
      const activityResponse = await apiService.dashboard.getRecentActivity();
      if (activityResponse.success) {
        setRecentActivity(activityResponse.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ComponentType<any>;
    gradient: string;
    subtitle?: string;
    link?: string;
    trend?: { value: number; isPositive: boolean };
  }> = ({ title, value, icon: Icon, gradient, subtitle, link, trend }) => {
    const content = (
      <div className={`relative overflow-hidden rounded-2xl p-6 transition-transform transition-shadow duration-200 ease-out hover:scale-105 hover:shadow-2xl will-change-transform ${gradient} group cursor-pointer`}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-32 h-32 transform rotate-12 translate-x-8 -translate-y-8">
            <Icon className="w-full h-full" />
          </div>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Icon className="h-6 w-6 text-white" />
            </div>
            {trend && (
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                trend.isPositive ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'
              }`}>
                {trend.isPositive ? (
                  <ArrowTrendingUpIcon className="h-3 w-3" />
                ) : (
                  <ArrowTrendingDownIcon className="h-3 w-3" />
                )}
                <span>{Math.abs(trend.value)}%</span>
              </div>
            )}
          </div>
          
          <div className="mb-2">
            <p className="text-4xl font-bold text-white mb-1">{value}</p>
            <p className="text-white/80 text-sm font-medium">{title}</p>
          </div>
          
          {subtitle && (
            <p className="text-white/60 text-xs">{subtitle}</p>
          )}
        </div>
        
        {/* Hover Effect */}
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
    );

    if (link) {
      return <Link to={link}>{content}</Link>;
    }
    return content;
  };

  // Memoized status icon function
  const getStatusIcon = useCallback((type: string) => {
    switch (type) {
      case 'exam_created':
        return <DocumentTextIcon className="h-5 w-5 text-blue-500" />;
      case 'exam_completed':
        return <TrophyIcon className="h-5 w-5 text-green-500" />;
      case 'proctor_alert':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <EyeIcon className="h-5 w-5 text-gray-500" />;
    }
  }, []);

  // Memoized time formatting function
  const formatTimeAgo = useCallback((timeString: string) => {
    const time = new Date(timeString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  }, []);

  // Memoized activity item component for better performance
  const ActivityItem = useCallback(({ activity, index }: { activity: RecentActivity; index: number }) => (
    <div 
      className="activity-item flex items-start space-x-3 p-4 bg-white/50 rounded-2xl hover:bg-white/80 transform-gpu"
      style={{ 
        animationDelay: `${Math.min(index * 20, 200)}ms`,
        animationFillMode: 'both'
      }}
    >
      <div className="p-2 bg-gradient-to-r from-slate-100 to-slate-200 rounded-xl flex-shrink-0">
        {getStatusIcon(activity.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 mb-1 line-clamp-2">
          {activity.message}
        </p>
        <p className="text-xs text-slate-500">{formatTimeAgo(activity.time)}</p>
      </div>
    </div>
  ), [getStatusIcon, formatTimeAgo]);

  // Memoized activity list component for better performance
  const ActivityList = useMemo(() => (
    <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
      {displayedActivities.map((activity, index) => (
        <ActivityItem key={activity.id} activity={activity} index={index} />
      ))}
    </div>
  ), [displayedActivities, ActivityItem]);

  // Memoized show more button
  const ShowMoreButton = useMemo(() => {
    if (!hasMoreActivities) return null;
    
    return (
      <div className="flex justify-center pt-4">
        <button
          onClick={() => setShowAllActivities(!showAllActivities)}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg"
        >
          <span className="text-sm font-medium">
            {showAllActivities ? 'Show Less' : `Show ${Math.min(recentActivity.length - INITIAL_ACTIVITY_LIMIT, MAX_ACTIVITIES_TO_SHOW - INITIAL_ACTIVITY_LIMIT)} More`}
          </span>
          <ChevronDownIcon 
            className={`h-4 w-4 transition-transform duration-300 ${
              showAllActivities ? 'rotate-180' : ''
            }`} 
          />
        </button>
      </div>
    );
  }, [hasMoreActivities, showAllActivities, recentActivity.length]);

  // Memoized activity summary
  const ActivitySummary = useMemo(() => {
    if (recentActivity.length <= MAX_ACTIVITIES_TO_SHOW) return null;
    
    return (
      <div className="text-center pt-2">
        <p className="text-xs text-slate-500">
          Showing {displayedActivities.length} of {recentActivity.length} activities
        </p>
      </div>
    );
  }, [recentActivity.length, displayedActivities.length]);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8 px-2 sm:px-6 lg:px-12 mb-16">
      <div className="w-full p-4 sm:p-6 lg:p-8 py-8">
        {/* Modern Welcome Header (matches Student) */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-8 mb-8 shadow-xl text-white">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center mb-2">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl mr-4 shadow-lg inline-block">
                <AcademicCapIcon className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white drop-shadow-lg">{user?.role === 'instructor' ? 'Instructor' : 'Teacher'} Dashboard</h1>
                <p className="text-blue-100 text-lg">
                  {getGreeting()}, {user?.name}! Here's your teaching overview.
                </p>
                <div className="flex items-center mt-4 space-x-4 text-sm">
                  <span className="flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </span>
                  <span className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-6 lg:mt-0 flex flex-col sm:flex-row gap-4">
              <button 
                onClick={debouncedRefresh}
                disabled={loading}
                className="inline-flex items-center px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg transition-all duration-200 flex items-center transform hover:scale-105 focus:scale-105"
              >
                <ArrowPathIcon className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
              <button className="inline-flex items-center px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg transition-all duration-200 flex items-center transform hover:scale-105 focus:scale-105">
                <BellIcon className="h-5 w-5 mr-2" />
                Notifications
              </button>
              <Link 
                to="/dashboard/exams/create" 
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 flex items-center transform hover:scale-105 focus:scale-105"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Exam
              </Link>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Exams"
            value={stats.totalExams}
            icon={DocumentTextIcon}
            gradient="bg-gradient-to-br from-blue-500 to-blue-600"
            subtitle={`${stats.activeExams} currently active`}
            link="/dashboard/exams"
            trend={{ value: 12, isPositive: true }}
          />
          <MetricCard
            title="Total Students"
            value={stats.totalStudents}
            icon={UsersIcon}
            gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
            subtitle="across all classrooms"
            link="/dashboard/classrooms"
            trend={{ value: 8, isPositive: true }}
          />
          <MetricCard
            title="Classrooms"
            value={stats.totalClassrooms}
            icon={AcademicCapIcon}
            gradient="bg-gradient-to-br from-purple-500 to-purple-600"
            subtitle="active classrooms"
            link="/dashboard/classrooms"
            trend={{ value: 5, isPositive: true }}
          />
          <MetricCard
            title="Proctor Alerts"
            value={stats.proctorAlerts}
            icon={ExclamationTriangleIcon}
            gradient="bg-gradient-to-br from-amber-500 to-amber-600"
            subtitle="require attention"
            link="/dashboard/proctor"
            trend={{ value: 3, isPositive: false }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Exams */}
          <div className="lg:col-span-2">
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                    <DocumentTextIcon className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">Recent Exams</h2>
                </div>
                <Link 
                  to="/dashboard/exams" 
                  className="text-indigo-600 hover:text-indigo-700 font-medium text-sm transition-colors duration-200"
                >
                  View all →
                </Link>
              </div>
              
              <div className="space-y-4 max-h-[400px] h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                {recentExams.length > 0 ? (
                  recentExams.map((exam, index) => (
                    <div 
                      key={exam.id} 
                      className="group bg-white/50 hover:bg-white/80 rounded-2xl p-6 transition-all duration-300 hover:shadow-lg border border-white/30 cursor-pointer"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors duration-200">
                              {exam.title}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              exam.status === 'active' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {exam.status}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-6 text-sm text-slate-600">
                            <span className="flex items-center">
                              <UsersIcon className="h-4 w-4 mr-1" />
                              {exam.studentsCompleted} completed
                            </span>
                            {exam.alerts > 0 && (
                              <span className="flex items-center text-amber-600">
                                <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                                {exam.alerts} alerts
                              </span>
                            )}
                            <span className="flex items-center">
                              <ClockIcon className="h-4 w-4 mr-1" />
                              {new Date(exam.startTime).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <button
                            className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            onClick={() => window.location.href = '/dashboard/exams'}
                            title="Go to Exam List"
                          >
                            <EyeIcon className="h-5 w-5 text-white" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="p-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl inline-block mb-4">
                      <DocumentTextIcon className="h-12 w-12 text-blue-500" />
                    </div>
                    <p className="text-slate-600 text-lg mb-2">No exams created yet</p>
                    <Link 
                      to="/dashboard/exams/create" 
                      className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors duration-200"
                    >
                      Create your first exam →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity - Optimized */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl">
                  <ChartBarIcon className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Recent Activity</h2>
                {recentActivity.length > 0 && (
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                    {recentActivity.length}
                  </span>
                )}
              </div>
            </div>
            
            <div className="space-y-3 max-h-[400px] h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="flex items-start space-x-3 p-4 bg-white/30 rounded-2xl animate-pulse">
                      <div className="p-2 bg-slate-200 rounded-xl w-9 h-9"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                        <div className="h-3 bg-slate-200 rounded w-1/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivity.length > 0 ? (
                <>
                  {/* Activity List */}
                  {ActivityList}
                  
                  {/* Show More/Less Button */}
                  {ShowMoreButton}
                  
                  {/* Activity Summary */}
                  {ActivitySummary}
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="p-4 bg-gradient-to-r from-emerald-100 to-green-100 rounded-2xl inline-block mb-4">
                    <ChartBarIcon className="h-12 w-12 text-emerald-500" />
                  </div>
                  <p className="text-slate-600">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/20">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl">
                <RocketLaunchIcon className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Quick Actions</h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <Link 
                to="/dashboard/exams/create" 
                className="group p-6 bg-gradient-to-br from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 rounded-2xl border border-indigo-100 hover:border-indigo-200 transition-all duration-300 hover:scale-105 hover:shadow-lg flex flex-col items-center justify-center text-center"
              >
                <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300 flex items-center justify-center">
                  <PlusIcon className="h-8 w-8 text-white" />
                </div>
                <span className="text-sm font-semibold text-slate-800 mt-1">Create Exam</span>
              </Link>
              
              <Link 
                to="/dashboard/classrooms" 
                className="group p-6 bg-gradient-to-br from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 rounded-2xl border border-emerald-100 hover:border-emerald-200 transition-all duration-300 hover:scale-105 hover:shadow-lg flex flex-col items-center justify-center text-center"
              >
                <div className="p-3 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300 flex items-center justify-center">
                  <AcademicCapIcon className="h-8 w-8 text-white" />
                </div>
                <span className="text-sm font-semibold text-slate-800 mt-1">Manage Classrooms</span>
              </Link>
              
              <Link 
                to="/dashboard/proctor" 
                className="group p-6 bg-gradient-to-br from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 rounded-2xl border border-amber-100 hover:border-amber-200 transition-all duration-300 hover:scale-105 hover:shadow-lg flex flex-col items-center justify-center text-center"
              >
                <div className="p-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300 flex items-center justify-center">
                  <VideoCameraIcon className="h-8 w-8 text-white" />
                </div>
                <span className="text-sm font-semibold text-slate-800 mt-1">Proctor Exams</span>
              </Link>
              
              <Link 
                to="/dashboard/instructor-results" 
                className="group p-6 bg-gradient-to-br from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 rounded-2xl border border-blue-100 hover:border-blue-200 transition-all duration-300 hover:scale-105 hover:shadow-lg flex flex-col items-center justify-center text-center"
              >
                <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300 flex items-center justify-center">
                  <ChartBarIcon className="h-8 w-8 text-white" />
                </div>
                <span className="text-sm font-semibold text-slate-800 mt-1">View Results</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Upcoming Exams */}
        <div className="mt-8">
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl">
                  <CalendarIcon className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Upcoming Exams</h2>
              </div>
              <Link 
                to="/dashboard/exams" 
                className="text-indigo-600 hover:text-indigo-700 font-medium text-sm transition-colors duration-200"
              >
                View all →
              </Link>
            </div>
            
            <div className="space-y-4">
              {recentExams.filter(exam => new Date(exam.startTime) > new Date()).length > 0 ? (
                recentExams
                  .filter(exam => new Date(exam.startTime) > new Date())
                  .slice(0, 3)
                  .map((exam, index) => (
                    <div 
                      key={exam.id} 
                      className="flex items-center justify-between p-6 bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl border border-rose-100 hover:border-rose-200 transition-all duration-300 hover:shadow-lg"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800 mb-2">{exam.title}</h3>
                        <div className="flex items-center space-x-6 text-sm text-slate-600">
                          <span className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            {new Date(exam.startTime).toLocaleDateString()}
                          </span>
                          <span className="flex items-center">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            {new Date(exam.startTime).toLocaleTimeString()}
                          </span>
                          <span className="flex items-center">
                            <UsersIcon className="h-4 w-4 mr-1" />
                            {exam.studentsCompleted} completed
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="p-3 bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl">
                          <ClockIcon className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-12">
                  <div className="p-4 bg-gradient-to-r from-rose-100 to-pink-100 rounded-2xl inline-block mb-4">
                    <CalendarIcon className="h-12 w-12 text-rose-500" />
                  </div>
                  <p className="text-slate-600 text-lg mb-2">No upcoming exams scheduled</p>
                  <Link 
                    to="/dashboard/exams/create" 
                    className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors duration-200"
                  >
                    Schedule your first exam →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorDashboard; 