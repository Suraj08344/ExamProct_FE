import React, { useState, useEffect, useRef } from 'react';
import { useProctor } from '../../contexts/ProctorContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { proctorAPI } from '../../services/api';
import {
  EyeIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  VideoCameraIcon,
  ComputerDesktopIcon,
  ChatBubbleLeftRightIcon,
  BellIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  SignalIcon,
  ShieldExclamationIcon,
  UserGroupIcon,
  SpeakerXMarkIcon,
  StopIcon,
  ChartBarIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';

interface Exam {
  _id: string;
  title: string;
  description: string;
  duration: number;
  totalQuestions: number;
  isActive: boolean;
  startTime: string;
  endTime: string;
  enrolledStudents: number;
  activeStudents: number;
}

interface Student {
  id: string;
  name: string;
  email: string;
  examId: string;
  examTitle: string;
  status: 'active' | 'paused' | 'disconnected' | 'completed';
  progress: number;
  timeRemaining: number;
  timeElapsed: number;
  lastActivity: Date;
  alerts: number;
  suspiciousActivity: number;
  tabSwitches: number;
  faceDetected: boolean;
  multipleFaces: boolean;
  screenShared: boolean;
  audioEnabled: boolean;
  networkStatus: 'stable' | 'unstable' | 'disconnected';
  currentQuestion: number;
  totalQuestions: number;
  score?: number;
  timeTaken?: number; // Added for completed students
}

interface ProctorEvent {
  id: string;
  studentId: string;
  studentName?: string;
  type: 'tab-switch' | 'face-not-detected' | 'multiple-faces' | 'screen-share-lost' | 'audio-lost' | 'network-issue' | 'suspicious-activity' | 'warning-sent' | 'message-sent' | 'session-terminated';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  resolved: boolean;
}

interface Message {
  id: string;
  sender: 'proctor' | 'student';
  message: string;
  timestamp: Date;
  read: boolean;
}

// --- Helper: Status Badge ---
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  let color = 'bg-gray-300 text-gray-800';
  let label = status.charAt(0).toUpperCase() + status.slice(1);
  if (status === 'active') color = 'bg-green-100 text-green-800';
  if (status === 'completed') color = 'bg-blue-100 text-blue-800';
  if (status === 'disconnected') color = 'bg-red-100 text-red-800';
  if (status === 'paused') color = 'bg-yellow-100 text-yellow-800';
  return <span className={`px-2 py-1 rounded text-xs font-semibold ${color}`}>{label}</span>;
};

const ProctorExam: React.FC = () => {
  const { user } = useAuth();
  const { events } = useProctor();
  const { socket } = useSocket();
  
  // State management
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [showCamera, setShowCamera] = useState(true);
  const [showScreenShare, setShowScreenShare] = useState(true);
  const [showExam, setShowExam] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [proctorEvents, setProctorEvents] = useState<ProctorEvent[]>([]);
  const [warningModal, setWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // --- Add refs for WebRTC peer connections and video elements ---
  const videoRefs = useRef<{ [studentId: string]: HTMLVideoElement | null }>({});
  const peerConnections = useRef<{ [studentId: string]: RTCPeerConnection }>({});

  // --- Merge proctor events for display ---
  const [apiProctorEvents, setApiProctorEvents] = useState<ProctorEvent[]>([]);

  // Real-time Socket.IO event handling
  useEffect(() => {
    if (!socket) return;

    // Join proctor room when exam is selected
    if (selectedExam) {
      socket.emit('join-proctor', selectedExam._id);
      console.log('📡 Joined proctor room for exam:', selectedExam._id);
    }

    // Listen for student starting exam
    const handleStudentStarted = (data: any) => {
      console.log('📡 Student started exam:', data);
      setStudents(prev => {
        // --- Deduplicate students by studentId ---
        if (prev.some(s => s.id === data.studentId)) return prev;

        const newStudent: Student = {
          id: data.studentId,
          name: data.studentName,
          email: data.studentEmail || '',
          examId: data.examId,
          examTitle: selectedExam?.title || '',
          status: 'active',
          progress: 0,
          timeRemaining: selectedExam?.duration ? selectedExam.duration * 60 : 0,
          timeElapsed: 0,
          lastActivity: new Date(),
          alerts: 0,
          suspiciousActivity: 0,
          tabSwitches: 0,
          faceDetected: true,
          multipleFaces: false,
          screenShared: true,
          audioEnabled: true,
          networkStatus: 'stable',
          currentQuestion: 1,
          totalQuestions: selectedExam?.totalQuestions || 0
        };

        return [...prev, newStudent];
      });
    };

    // Listen for student progress updates
    const handleProgressUpdate = (data: any) => {
      console.log('📡 Student progress update:', data);
      setStudents(prev => prev.map(student => 
        // --- Update student progress by studentId ---
        student.id === data.studentId 
          ? {
              ...student,
              progress: data.progress,
              currentQuestion: data.currentQuestion,
              timeRemaining: data.timeRemaining,
              lastActivity: new Date()
            }
          : student
      ));
    };

    // Listen for student activity detection
    const handleActivityDetected = (data: any) => {
      console.log('📡 Student activity detected:', data);
      
      // Add to proctor events
      const newEvent: ProctorEvent = {
        id: `${data.studentId}-${Date.now()}`,
        studentId: data.studentId,
        studentName: data.studentName,
        type: data.type as any,
        severity: data.severity,
        description: data.description,
        timestamp: new Date(data.timestamp),
        resolved: false
      };

      setProctorEvents(prev => [newEvent, ...prev]);

      // Update student alerts
      setStudents(prev => prev.map(student => 
        student.id === data.studentId 
          ? {
              ...student,
              alerts: student.alerts + 1,
              suspiciousActivity: data.type === 'suspicious-activity' ? student.suspiciousActivity + 1 : student.suspiciousActivity,
              tabSwitches: data.type === 'tab-switch' ? student.tabSwitches + 1 : student.tabSwitches,
              lastActivity: new Date()
            }
          : student
      ));
    };

    // Listen for student status changes
    const handleStatusChange = (data: any) => {
      console.log('📡 Student status change:', data);
      setStudents(prev => prev.map(student => 
        student.id === data.studentId 
          ? {
              ...student,
              status: data.status as any,
              lastActivity: new Date()
            }
          : student
      ));
    };

    // Listen for student leaving exam
    const handleStudentLeft = (data: any) => {
      console.log('📡 Student left exam:', data);
      setStudents(prev => prev.filter(student => student.id !== data.studentId));
    };

    // Listen for proctor messages sent
    const handleProctorMessageSent = (data: any) => {
      console.log('📡 Proctor message sent:', data);
      const newMessage: Message = {
        id: Date.now().toString(),
        sender: 'proctor',
        message: data.type === 'warning' ? `⚠️ WARNING: ${data.message}` : data.message,
        timestamp: new Date(data.timestamp),
        read: false
      };
      setMessages(prev => [...prev, newMessage]);
    };

    // Listen for student session termination
    const handleSessionTerminated = (data: any) => {
      console.log('📡 Student session terminated:', data);
      setStudents(prev => prev.map(student => 
        student.id === data.studentId 
          ? { ...student, status: 'disconnected' as const }
          : student
      ));
    };

    // Register event listeners
    socket.on('student-started-exam', handleStudentStarted);
    socket.on('student-progress-update', handleProgressUpdate);
    socket.on('student-activity-detected', handleActivityDetected);
    socket.on('student-status-change', handleStatusChange);
    socket.on('student-left-exam', handleStudentLeft);
    socket.on('proctor-message-sent', handleProctorMessageSent);
    socket.on('student-session-terminated', handleSessionTerminated);

    // Cleanup event listeners
    return () => {
      socket.off('student-started-exam', handleStudentStarted);
      socket.off('student-progress-update', handleProgressUpdate);
      socket.off('student-activity-detected', handleActivityDetected);
      socket.off('student-status-change', handleStatusChange);
      socket.off('student-left-exam', handleStudentLeft);
      socket.off('proctor-message-sent', handleProctorMessageSent);
      socket.off('student-session-terminated', handleSessionTerminated);
    };
  }, [socket, selectedExam]);

  // Listen for student-progress-update:
  useEffect(() => {
    if (!socket) return;
    const handleProgressUpdate = (data: any) => {
      setStudents(prev => prev.map(student =>
        student.id === data.studentId
          ? { ...student, progress: data.progress, currentQuestion: data.currentQuestion, timeRemaining: data.timeRemaining, lastActivity: new Date() }
          : student
      ));
      console.log('[DEBUG] Received student-progress-update', data);
    };
    socket.on('student-progress-update', handleProgressUpdate);
    return () => { socket.off('student-progress-update', handleProgressUpdate); };
  }, [socket]);

  // Listen for student-activity-detected:
  useEffect(() => {
    if (!socket) return;
    const handleActivityDetected = (data: any) => {
      // Add to proctor events and update UI as needed
      setProctorEvents(prev => [{
        id: `${data.studentId}-${Date.now()}`,
        studentId: data.studentId,
        studentName: data.studentName,
        type: data.type,
        severity: data.severity,
        description: data.description,
        timestamp: new Date(data.timestamp),
        resolved: false
      }, ...prev]);
      console.log('[DEBUG] Received student-activity-detected', data);
    };
    socket.on('student-activity-detected', handleActivityDetected);
    return () => { socket.off('student-activity-detected', handleActivityDetected); };
  }, [socket]);

  // Listen for webrtc-offer, respond with webrtc-answer, and attach streams:
  useEffect(() => {
    if (!socket || !selectedExam) return;
    const handleOffer = async ({ examId, studentId, offer }: any) => {
      if (!selectedExam || examId !== selectedExam._id) return;
      const pc = new window.RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      peerConnections.current[studentId] = pc;
      // --- WebRTC: Ensure videoRefs and streams are correct ---
      pc.ontrack = (event) => {
        if (!videoRefs.current[studentId]) return;
        const stream = event.streams[0];
        videoRefs.current[studentId]!.srcObject = stream;
        console.log('[DEBUG] Attached stream to video element for student:', studentId);
      };
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc-ice-candidate', {
            examId,
            studentId,
            candidate: event.candidate,
            target: 'student'
          });
          console.log('[DEBUG] Emitted webrtc-ice-candidate to student', { examId, studentId });
        }
      };
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc-answer', { examId, studentId, answer });
      console.log('[DEBUG] Emitted webrtc-answer', { examId, studentId });
    };
    socket.on('webrtc-offer', handleOffer);
    return () => { socket.off('webrtc-offer', handleOffer); };
  }, [socket, selectedExam]);

  // Load real data from API
  useEffect(() => {
    const loadProctorData = async () => {
      try {
        setLoading(true);
        console.log('🔄 Loading proctor data...');

        // Load exams for proctoring
        const examsResponse = await proctorAPI.getProctorExams();
        if (examsResponse.success) {
          setExams(examsResponse.data);
          console.log('📋 Loaded exams:', examsResponse.data.length);
        }

        setLoading(false);
      } catch (error) {
        console.error('❌ Error loading proctor data:', error);
        setLoading(false);
      }
    };

    loadProctorData();
  }, []);

  // Load students when exam is selected
  useEffect(() => {
    if (!selectedExam) {
      setStudents([]);
      return;
    }

    const loadExamStudents = async () => {
      try {
        console.log('👥 Loading students for exam:', selectedExam._id);
        const response = await proctorAPI.getExamStudents(selectedExam._id);
        
        if (response.success) {
          setStudents(response.data);
          console.log('👥 Loaded students:', response.data.length);
        }
      } catch (error) {
        console.error('❌ Error loading exam students:', error);
      }
    };

    loadExamStudents();
  }, [selectedExam]);

  // Load proctor events when exam is selected
  useEffect(() => {
    if (!selectedExam) {
      setProctorEvents([]);
      return;
    }

    const loadProctorEvents = async () => {
      try {
        console.log('📊 Loading proctor events for exam:', selectedExam._id);
        const response = await proctorAPI.getExamEvents(selectedExam._id);
        
        if (response.success) {
          setApiProctorEvents(response.data);
          console.log('📊 Loaded proctor events:', response.data.length);
        }
      } catch (error) {
        console.error('❌ Error loading proctor events:', error);
      }
    };

    loadProctorEvents();
  }, [selectedExam]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !selectedExam) return;

    const interval = setInterval(async () => {
      try {
        // Refresh student data
        const response = await proctorAPI.getExamStudents(selectedExam._id);
        if (response.success) {
          setStudents(response.data);
        }

        // Refresh proctor events
        const eventsResponse = await proctorAPI.getExamEvents(selectedExam._id);
        if (eventsResponse.success) {
          setApiProctorEvents(eventsResponse.data);
        }
      } catch (error) {
        console.error('❌ Error refreshing data:', error);
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, selectedExam]);

  // --- WebRTC Signaling: Receive student streams ---
  useEffect(() => {
    if (!socket || !selectedExam) return;

    // Handle offer from student
    const handleOffer = async ({ examId, studentId, offer }: any) => {
      if (!selectedExam || examId !== selectedExam._id) return;
      // Create peer connection
      const pc = new window.RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      peerConnections.current[studentId] = pc;
      // When stream received, attach to video element
      pc.ontrack = (event) => {
        if (!videoRefs.current[studentId]) return;
        const stream = event.streams[0];
        videoRefs.current[studentId]!.srcObject = stream;
        console.log('[DEBUG] Attached stream to video element for student:', studentId);
      };
      // ICE candidates to student
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc-ice-candidate', {
            examId,
            studentId,
            candidate: event.candidate,
            target: 'student'
          });
        }
      };
      // Set remote offer and create/send answer
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc-answer', { examId, studentId, answer });
    };
    // ICE candidate from student
    const handleIceCandidate = ({ examId, studentId, candidate, from }: any) => {
      if (!selectedExam || examId !== selectedExam._id) return;
      const pc = peerConnections.current[studentId];
      if (pc && from === 'student') {
        pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };
    socket.on('webrtc-offer', handleOffer);
    socket.on('webrtc-ice-candidate', handleIceCandidate);
    return () => {
      socket.off('webrtc-offer', handleOffer);
      socket.off('webrtc-ice-candidate', handleIceCandidate);
    };
  }, [socket, selectedExam]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hrs > 0 
      ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      : `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'tab-switch': return <ExclamationTriangleIcon className="h-4 w-4" />;
      case 'face-not-detected': return <XCircleIcon className="h-4 w-4" />;
      case 'multiple-faces': return <UserGroupIcon className="h-4 w-4" />;
      case 'screen-share-lost': return <ComputerDesktopIcon className="h-4 w-4" />;
      case 'audio-lost': return <SpeakerXMarkIcon className="h-4 w-4" />;
      case 'network-issue': return <SignalIcon className="h-4 w-4" />;
      case 'suspicious-activity': return <ShieldExclamationIcon className="h-4 w-4" />;
      case 'warning-sent': return <BellIcon className="h-4 w-4" />;
      case 'message-sent': return <ChatBubbleLeftRightIcon className="h-4 w-4" />;
      default: return <EyeIcon className="h-4 w-4" />;
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || student.status === filter;
    const matchesExam = !selectedExam || student.examId === selectedExam._id;
    return matchesSearch && matchesFilter && matchesExam;
  });

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedStudent) return;

    try {
      const response = await proctorAPI.sendMessage({
        resultId: selectedStudent.id,
        message: newMessage,
        type: 'message'
      });

      if (response.success) {
        const message: Message = {
          id: response.data.message.id,
          sender: 'proctor',
          message: response.data.message.message,
          timestamp: new Date(response.data.message.timestamp),
          read: false
        };

        setMessages(prev => [...prev, message]);
        setNewMessage('');

        // Refresh proctor events
        if (selectedExam) {
          const eventsResponse = await proctorAPI.getExamEvents(selectedExam._id);
          if (eventsResponse.success) {
            setProctorEvents(eventsResponse.data);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const handleSendWarning = async () => {
    if (!warningMessage.trim() || !selectedStudent) return;

    try {
      const response = await proctorAPI.sendMessage({
        resultId: selectedStudent.id,
        message: warningMessage,
        type: 'warning'
      });

      if (response.success) {
        const message: Message = {
          id: response.data.message.id,
          sender: 'proctor',
          message: response.data.message.message,
          timestamp: new Date(response.data.message.timestamp),
          read: false
        };

        setMessages(prev => [...prev, message]);
        setWarningModal(false);
        setWarningMessage('');

        // Refresh proctor events
        if (selectedExam) {
          const eventsResponse = await proctorAPI.getExamEvents(selectedExam._id);
          if (eventsResponse.success) {
            setProctorEvents(eventsResponse.data);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error sending warning:', error);
      alert('Failed to send warning. Please try again.');
    }
  };

  const handleTerminateSession = async () => {
    if (!selectedStudent) return;
    
    if (window.confirm(`Are you sure you want to terminate ${selectedStudent.name}'s exam session?`)) {
      try {
        const response = await proctorAPI.terminateSession({
          resultId: selectedStudent.id,
          reason: 'Session terminated by proctor'
        });

        if (response.success) {
          // Update local state
          setStudents(prev => prev.map(student => 
            student.id === selectedStudent.id 
              ? { ...student, status: 'disconnected' as const }
              : student
          ));

          // Refresh proctor events
          if (selectedExam) {
            const eventsResponse = await proctorAPI.getExamEvents(selectedExam._id);
            if (eventsResponse.success) {
              setProctorEvents(eventsResponse.data);
            }
          }

          alert('Session terminated successfully.');
        }
      } catch (error) {
        console.error('❌ Error terminating session:', error);
        alert('Failed to terminate session. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">Loading proctor dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- In the UI, for Proctor Events section ---
  const allEvents: ProctorEvent[] = [...proctorEvents, ...apiProctorEvents].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8 px-2 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Modern Glassy Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-red-500 via-orange-500 to-pink-600 rounded-2xl p-8 mb-8 shadow-xl text-white">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative z-10 flex items-center">
            <div className="p-4 bg-gradient-to-r from-red-500 to-orange-600 rounded-2xl mr-6 shadow-lg">
              <VideoCameraIcon className="h-12 w-12 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-1">Live Proctor Dashboard</h1>
              <p className="text-orange-100 text-lg">Monitor and manage active exam sessions in real-time</p>
            </div>
          </div>
        </div>

        {/* Exam Selection */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Select Exam to Monitor</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  autoRefresh 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-gray-100 text-gray-800 border border-gray-200'
                }`}
              >
                <ArrowPathIcon className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((exam) => (
              <div
                key={exam._id}
                onClick={() => setSelectedExam(exam)}
                className={
                  'relative p-6 rounded-2xl border cursor-pointer transition-transform duration-200 ease-out will-change-transform shadow-xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 border-blue-500 text-white' +
                  (selectedExam?._id === exam._id ? ' scale-105 shadow-2xl' : ' hover:scale-105 hover:shadow-2xl')
                }
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white">{exam.title}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full border
                    ${exam.isActive
                      ? 'bg-green-500/80 text-white border-green-300'
                      : 'bg-gray-500/80 text-white border-gray-300'
                    }`}>
                    {exam.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm mb-3 text-white/80">{exam.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-white/70">Duration:</span>
                    <p className="font-medium text-white">{exam.duration}m</p>
                  </div>
                  <div>
                    <span className="text-white/70">Questions:</span>
                    <p className="font-medium text-white">{exam.totalQuestions}</p>
                  </div>
                  <div>
                    <span className="text-white/70">Enrolled:</span>
                    <p className="font-medium text-white">{exam.enrolledStudents}</p>
                  </div>
                  <div>
                    <span className="text-white/70">Active:</span>
                    <p className="font-medium text-green-200">{exam.activeStudents}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedExam && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Students List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Active Students</h2>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    {filteredStudents.length}
                  </span>
                </div>

                {/* Search and Filter */}
                <div className="mb-4">
                  <div className="relative mb-3">
                    <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search students..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="disconnected">Disconnected</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      onClick={() => setSelectedStudent(student)}
                      className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 ${
                        selectedStudent?.id === student.id
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <UserIcon className="h-5 w-5 text-gray-400" />
                          <span className="font-medium text-gray-900">{student.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {student.alerts > 0 && (
                            <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
                              {student.alerts}
                            </span>
                          )}
                          <span
                            className={`w-2 h-2 rounded-full ${
                              student.status === 'active' ? 'bg-green-500' :
                              student.status === 'paused' ? 'bg-yellow-500' :
                              student.status === 'disconnected' ? 'bg-red-500' :
                              'bg-blue-500'
                            }`}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Progress:</span>
                          <span className="font-medium">{student.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${student.progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Time Left:</span>
                          <span className="font-mono font-medium">{formatTime(student.timeRemaining)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Question:</span>
                          <span className="font-medium">{student.currentQuestion}/{student.totalQuestions}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Student Monitoring */}
            <div className="lg:col-span-3">
              {selectedStudent ? (
                <div className="space-y-6">
                  {/* Student Info Header */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">{selectedStudent.name}</h2>
                        <p className="text-gray-600">{selectedStudent.email}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <StatusBadge status={selectedStudent.status} />
                        <button
                          onClick={() => setWarningModal(true)}
                          className="px-4 py-2 bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-lg hover:bg-yellow-200 transition-colors text-sm font-medium"
                        >
                          <BellIcon className="h-4 w-4 mr-2" />
                          Send Warning
                        </button>
                        <button
                          onClick={handleTerminateSession}
                          className="px-4 py-2 bg-red-100 text-red-800 border border-red-200 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                        >
                          <StopIcon className="h-4 w-4 mr-2" />
                          Terminate
                        </button>
                      </div>
                    </div>
                    
                    {/* Student Details Card */}
                    <div className="flex items-center space-x-4 mb-4">
                      <UserIcon className="h-8 w-8 text-gray-400" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-lg">{selectedStudent.name}</span>
                          <StatusBadge status={selectedStudent.status} />
                        </div>
                        <div className="text-xs text-gray-500">{selectedStudent.email}</div>
                      </div>
                    </div>

                    {/* Timer, Progress, Question, Alerts */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <ClockIcon className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                        <p className="text-xs text-blue-600 font-medium">Time Remaining</p>
                        <p className="text-lg font-bold text-gray-900">
                          {['completed', 'disconnected'].includes(selectedStudent.status)
                            ? (selectedStudent.timeTaken ? formatTime(selectedStudent.timeTaken) : 'Completed')
                            : formatTime(selectedStudent.timeRemaining)}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <ChartBarIcon className="h-6 w-6 text-green-600 mx-auto mb-1" />
                        <p className="text-xs text-green-600 font-medium">Progress</p>
                        <p className="text-lg font-bold text-gray-900">{selectedStudent.progress}%</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <DocumentTextIcon className="h-6 w-6 text-purple-600 mx-auto mb-1" />
                        <p className="text-xs text-purple-600 font-medium">Question</p>
                        <p className="text-lg font-bold text-gray-900">
                          {['completed', 'disconnected'].includes(selectedStudent.status)
                            ? 'Completed'
                            : Math.min(selectedStudent.currentQuestion, selectedStudent.totalQuestions)}
                          /
                          {selectedStudent.totalQuestions}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <ExclamationTriangleIcon className="h-6 w-6 text-orange-600 mx-auto mb-1" />
                        <p className="text-xs text-orange-600 font-medium">Alerts</p>
                        <p className="text-lg font-bold text-gray-900">{selectedStudent.alerts}</p>
                      </div>
                    </div>
                  </div>

                  {/* Live Monitoring Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    {/* Camera Feed */}
                    {showCamera && (
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            <VideoCameraIcon className="h-5 w-5 mr-2" />
                            Live Camera Feed
                          </h3>
                          <div className="flex items-center space-x-2">
                            <span className={`w-2 h-2 rounded-full ${selectedStudent.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <span className="text-xs text-gray-500">
                              {selectedStudent.status === 'active' ? 'Live' : 'Ended'}
                            </span>
                          </div>
                        </div>
                        <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                          <video
                            ref={el => { videoRefs.current[selectedStudent.id] = el; }}
                            autoPlay
                            playsInline
                            muted
                            style={{ width: '100%', height: '100%', background: '#000', borderRadius: '0.5rem' }}
                          />
                        </div>
                      </div>
                    )}
                    {/* Screen Share */}
                    {showScreenShare && (
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            <ComputerDesktopIcon className="h-5 w-5 mr-2" />
                            Screen Share
                          </h3>
                          <div className="flex items-center space-x-2">
                            <span className={`w-2 h-2 rounded-full ${selectedStudent.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <span className="text-xs text-gray-500">
                              {selectedStudent.status === 'active' ? 'Live' : 'Ended'}
                            </span>
                          </div>
                        </div>
                        <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                          <video
                            ref={el => { videoRefs.current[selectedStudent.id] = el; }}
                            autoPlay
                            playsInline
                            muted
                            style={{ width: '100%', height: '100%', background: '#000', borderRadius: '0.5rem' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Student Exam View */}
                  {showExam && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                          <DocumentTextIcon className="h-5 w-5 mr-2" />
                          Student Exam View
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Question {selectedStudent.currentQuestion} of {selectedStudent.totalQuestions}</span>
                        </div>
                      </div>
                      <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                        <div className="text-center">
                          <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600">Live exam view from {selectedStudent.name}</p>
                          <p className="text-sm text-gray-500">See what the student sees</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Communication and Events */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Chat Messages */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
                        Messages
                      </h3>
                      
                      <div className="h-64 overflow-y-auto mb-4 space-y-3">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`p-3 rounded-lg ${
                              message.sender === 'proctor'
                                ? 'bg-blue-100 text-blue-900 ml-8'
                                : 'bg-gray-100 text-gray-900 mr-8'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium">
                                {message.sender === 'proctor' ? 'You' : selectedStudent.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {message.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm">{message.message}</p>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Type your message..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                        <button
                          onClick={handleSendMessage}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <PaperAirplaneIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Proctor Events */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                        Proctor Events
                      </h3>
                      
                      {/* --- In the UI, for Proctor Events section --- */}
                      {/* Display allEvents */}
                      <div className="h-64 overflow-y-auto space-y-3">
                        {allEvents
                          .filter((event: ProctorEvent) => event.studentId === selectedStudent.id)
                          .map((event: ProctorEvent, idx: number) => (
                            <div
                              key={event.id}
                              className={`p-3 rounded-lg border ${getSeverityColor(event.severity)}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  {getEventIcon(event.type)}
                                  <span className="text-sm font-medium">{event.description}</span>
                                </div>
                                <span className="text-xs">
                                  {event.timestamp.toLocaleTimeString()}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12">
                  <div className="text-center">
                    <UserIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Student</h3>
                    <p className="text-gray-600">
                      Choose a student from the list to view their details and monitor their exam session.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Warning Modal */}
        {warningModal && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-yellow-900 flex items-center">
                    <BellIcon className="h-5 w-5 mr-2" />
                    Send Warning
                  </h3>
                  <button
                    onClick={() => setWarningModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XCircleIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="mb-4">
                  <p className="text-gray-700 mb-3">
                    Send a warning message to <strong>{selectedStudent?.name}</strong>:
                  </p>
                  <textarea
                    value={warningMessage}
                    onChange={(e) => setWarningMessage(e.target.value)}
                    placeholder="Enter your warning message..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 resize-none"
                    rows={4}
                  />
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => setWarningModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendWarning}
                    className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    Send Warning
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProctorExam; 