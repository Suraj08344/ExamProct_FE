import React, { useState, useEffect, useRef } from 'react';
import {
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserGroupIcon,
  VideoCameraIcon,
  MicrophoneIcon,
  ComputerDesktopIcon,
  SignalIcon,
  ChatBubbleLeftRightIcon,
  DocumentMagnifyingGlassIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  BellIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { useSocket } from '../../contexts/SocketContext';
import apiService, { proctorAPI } from '../../services/api';

interface ProctoringSession {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  examId: string;
  examTitle: string;
  startTime: string;
  currentTime: string;
  duration: number; // in minutes
  status: 'active' | 'paused' | 'completed' | 'terminated';
  alerts: ProctorAlert[];
  videoStatus: 'connected' | 'disconnected' | 'blocked';
  audioStatus: 'connected' | 'disconnected' | 'blocked';
  screenStatus: 'shared' | 'not_shared' | 'blocked';
  networkStatus: 'stable' | 'unstable' | 'disconnected';
  lastActivity: string;
  tabSwitches: number;
  suspiciousActivity: number;
  chatMessages: ChatMessage[];
}

interface ProctorAlert {
  id: string;
  type: 'tab_switch' | 'face_not_detected' | 'multiple_faces' | 'audio_disruption' | 'screen_share_stopped' | 'network_issue' | 'suspicious_behavior';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  resolved: boolean;
  actionTaken?: string;
}

interface ChatMessage {
  id: string;
  sender: 'student' | 'proctor';
  message: string;
  timestamp: string;
  read: boolean;
}

// --- ProctorWebRTC Component ---
type ProctorWebRTCProps = {
  examId: string;
  studentId: string;
  labeled?: boolean;
};
const ProctorWebRTC: React.FC<ProctorWebRTCProps> = ({ examId, studentId, labeled }) => {
  const { socket } = useSocket();
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [streams, setStreams] = useState<MediaStream[]>([]);

  useEffect(() => {
    if (!socket || !examId || !studentId) return;
    let pc: RTCPeerConnection | null = null;
    // Listen for offer from student
    const handleOffer = async ({ offer, studentId: incomingId }: { offer: RTCSessionDescriptionInit, studentId: string }) => {
      if (incomingId !== studentId) return;
      pc = new window.RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      pcRef.current = pc;
      // ICE
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
      // Remote streams
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setStreams(prev => {
            if (prev.find(s => s.id === event.streams[0].id)) return prev;
            return [...prev, event.streams[0]];
          });
        }
      };
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc-answer', { examId, studentId, answer });
    };
    // ICE from student
    const handleIce = ({ candidate, from, studentId: incomingId }: { candidate: RTCIceCandidateInit, from: string, studentId: string }) => {
      if (from === 'student' && incomingId === studentId && pcRef.current) {
        pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };
    socket.on('webrtc-offer', handleOffer);
    socket.on('webrtc-ice-candidate', handleIce);
    return () => {
      socket.off('webrtc-offer', handleOffer);
      socket.off('webrtc-ice-candidate', handleIce);
      pcRef.current?.close();
    };
  }, [socket, examId, studentId]);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {streams.map((stream, idx) => (
        <div key={stream.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <video
            ref={video => { if (video) video.srcObject = stream; }}
            autoPlay
            playsInline
            controls={false}
            style={{ width: 320, height: 180, margin: 8 }}
          />
          {labeled && (
            <span className="text-xs text-secondary-700 mt-1">
              {streams.length === 2 ? (idx === 0 ? 'Webcam' : 'Screen') : 'Stream'}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

const Proctoring: React.FC = () => {
  const { socket } = useSocket();
  const [sessions, setSessions] = useState<ProctoringSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ProctoringSession | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);

  // Fetch all proctorable exams and their active students on mount
  useEffect(() => {
    let isMounted = true;
    const fetchSessions = async () => {
      setLoading(true);
      try {
        const examsRes = await proctorAPI.getProctorExams();
        if (!examsRes.success || !Array.isArray(examsRes.data)) return;
        let allSessions: ProctoringSession[] = [];
        for (const exam of examsRes.data) {
          const studentsRes = await proctorAPI.getExamStudents(exam._id);
          if (studentsRes.success && Array.isArray(studentsRes.data)) {
            allSessions = allSessions.concat(studentsRes.data.map((s: any) => ({ ...s, examTitle: exam.title })));
          }
        }
        if (isMounted) setSessions(allSessions);
      } catch (err) {
        // Optionally handle error
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchSessions();
    return () => { isMounted = false; };
  }, []);

  // Listen for real-time socket events
  useEffect(() => {
    if (!socket) return;
    // Add new session when student starts exam
    const handleStudentStarted = (data: any) => {
      setSessions(prev => {
        // Avoid duplicates
        if (prev.find(s => s.studentId === data.studentId && s.examId === data.examId)) return prev;
        return [
    {
            id: data.studentId + '-' + data.examId,
            studentId: data.studentId,
            studentName: data.studentName,
            studentEmail: data.studentEmail || '',
            examId: data.examId,
            examTitle: data.examTitle || '',
            startTime: data.timestamp,
            currentTime: data.timestamp,
            duration: data.duration || 60,
            status: data.status || 'active',
      alerts: [],
      videoStatus: 'connected',
      audioStatus: 'connected',
      screenStatus: 'shared',
      networkStatus: 'stable',
            lastActivity: data.timestamp,
      tabSwitches: 0,
      suspiciousActivity: 0,
      chatMessages: []
    },
          ...prev
        ];
      });
    };
    // Remove session when student leaves or is terminated
    const handleStudentLeft = (data: any) => {
      setSessions(prev => prev.filter(s => !(s.studentId === data.studentId && s.examId === data.examId)));
    };
    const handleSessionTerminated = (data: any) => {
      setSessions(prev => prev.filter(s => !(s.studentId === data.studentId && s.examId === data.examId)));
    };
    socket.on('student-started-exam', handleStudentStarted);
    socket.on('student-left-exam', handleStudentLeft);
    socket.on('student-session-terminated', handleSessionTerminated);
    return () => {
      socket.off('student-started-exam', handleStudentStarted);
      socket.off('student-left-exam', handleStudentLeft);
      socket.off('student-session-terminated', handleSessionTerminated);
    };
  }, [socket]);

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.studentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.examTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || session.status === filter;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'terminated': return 'bg-red-100 text-red-800';
      default: return 'bg-secondary-100 text-secondary-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-secondary-100 text-secondary-800';
    }
  };

  const getConnectionStatus = (status: string) => {
    switch (status) {
      case 'connected':
      case 'shared':
      case 'stable': return 'text-green-600';
      case 'disconnected':
      case 'not_shared': return 'text-red-600';
      case 'blocked':
      case 'unstable': return 'text-yellow-600';
      default: return 'text-secondary-600';
    }
  };

  const formatDuration = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleSessionAction = (sessionId: string, action: string) => {
    setSessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        switch (action) {
          case 'pause':
            return { ...session, status: 'paused' as const };
          case 'resume':
            return { ...session, status: 'active' as const };
          case 'terminate':
            return { ...session, status: 'terminated' as const };
          default:
            return session;
        }
      }
      return session;
    }));
  };

  const sendChatMessage = () => {
    if (!chatMessage.trim() || !selectedSession) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'proctor',
      message: chatMessage,
      timestamp: new Date().toISOString(),
      read: false
    };

    setSessions(prev => prev.map(session => {
      if (session.id === selectedSession.id) {
        return {
          ...session,
          chatMessages: [...session.chatMessages, newMessage]
        };
      }
      return session;
    }));

    setChatMessage('');
  };

  const resolveAlert = (sessionId: string, alertId: string) => {
    setSessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        return {
          ...session,
          alerts: session.alerts.map(alert => 
            alert.id === alertId ? { ...alert, resolved: true, actionTaken: 'Resolved by proctor' } : alert
          )
        };
      }
      return session;
    }));
  };

  const totalActiveSessions = sessions.filter(s => s.status === 'active').length;
  const totalAlerts = sessions.reduce((sum, s) => sum + s.alerts.filter(a => !a.resolved).length, 0);
  const criticalAlerts = sessions.reduce((sum, s) => sum + s.alerts.filter(a => !a.resolved && a.severity === 'critical').length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900">Live Proctoring</h1>
          <p className="text-secondary-600 mt-2">
            Real-time monitoring and management of active exam sessions.
          </p>
        </div>
        <div className="flex space-x-2 mt-4 sm:mt-0">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`btn-secondary inline-flex items-center ${autoRefresh ? 'bg-green-100 text-green-800' : ''}`}
          >
            {autoRefresh ? (
              <>
                <PlayIcon className="h-4 w-4 mr-2" />
                Auto-refresh ON
              </>
            ) : (
              <>
                <PauseIcon className="h-4 w-4 mr-2" />
                Auto-refresh OFF
              </>
            )}
          </button>
          <button className="btn-primary inline-flex items-center">
            <DocumentMagnifyingGlassIcon className="h-4 w-4 mr-2" />
            Generate Report
          </button>
        </div>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-600">Active Sessions</p>
              <p className="text-2xl font-semibold text-secondary-900">{totalActiveSessions}</p>
            </div>
            <div className="p-3 bg-green-500 rounded-lg">
              <EyeIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-600">Total Alerts</p>
              <p className="text-2xl font-semibold text-secondary-900">{totalAlerts}</p>
            </div>
            <div className="p-3 bg-yellow-500 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-600">Critical Alerts</p>
              <p className="text-2xl font-semibold text-secondary-900">{criticalAlerts}</p>
            </div>
            <div className="p-3 bg-red-500 rounded-lg">
              <BellIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-600">System Status</p>
              <p className="text-2xl font-semibold text-green-600">Online</p>
            </div>
            <div className="p-3 bg-blue-500 rounded-lg">
              <ShieldCheckIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" />
            <input
              type="text"
              placeholder="Search by student name, email, or exam title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-secondary-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">All Sessions</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredSessions.map((session) => (
          <div key={session.id} className="card hover:shadow-lg transition-shadow">
            {/* Session Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-secondary-900">{session.studentName}</h3>
                <p className="text-sm text-secondary-600">{session.examTitle}</p>
              </div>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(session.status)}`}>
                {session.status}
              </span>
            </div>

            {/* Connection Status */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex items-center space-x-2">
                <VideoCameraIcon className={`h-4 w-4 ${getConnectionStatus(session.videoStatus)}`} />
                <span className="text-xs text-secondary-600">Video</span>
              </div>
              <div className="flex items-center space-x-2">
                <MicrophoneIcon className={`h-4 w-4 ${getConnectionStatus(session.audioStatus)}`} />
                <span className="text-xs text-secondary-600">Audio</span>
              </div>
              <div className="flex items-center space-x-2">
                <ComputerDesktopIcon className={`h-4 w-4 ${getConnectionStatus(session.screenStatus)}`} />
                <span className="text-xs text-secondary-600">Screen</span>
              </div>
              <div className="flex items-center space-x-2">
                <SignalIcon className={`h-4 w-4 ${getConnectionStatus(session.networkStatus)}`} />
                <span className="text-xs text-secondary-600">Network</span>
              </div>
            </div>

            {/* Session Info */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-secondary-600">Duration:</span>
                <span className="font-medium">{formatDuration(session.duration)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-secondary-600">Tab Switches:</span>
                <span className="font-medium">{session.tabSwitches}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-secondary-600">Last Activity:</span>
                <span className="font-medium">{formatDate(session.lastActivity)}</span>
              </div>
            </div>

            {/* Alerts */}
            {session.alerts.filter(a => !a.resolved).length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-secondary-900 mb-2">Active Alerts</h4>
                <div className="space-y-2">
                  {session.alerts.filter(a => !a.resolved).map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
                          <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(alert.severity)}`}>
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-xs text-secondary-700 mt-1">{alert.message}</p>
                      </div>
                      <button
                        onClick={() => resolveAlert(session.id, alert.id)}
                        className="text-xs text-green-600 hover:text-green-800"
                      >
                        Resolve
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedSession(session)}
                className="btn-secondary flex-1 text-sm"
              >
                <EyeIcon className="h-4 w-4 mr-1" />
                Monitor
              </button>
              {session.status === 'active' ? (
                <button
                  onClick={() => handleSessionAction(session.id, 'pause')}
                  className="btn-secondary text-sm"
                >
                  <PauseIcon className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => handleSessionAction(session.id, 'resume')}
                  className="btn-secondary text-sm"
                >
                  <PlayIcon className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => handleSessionAction(session.id, 'terminate')}
                className="btn-danger text-sm"
              >
                <StopIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredSessions.length === 0 && (
        <div className="text-center py-12">
          <EyeIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-secondary-900 mb-2">No active sessions</h3>
          <p className="text-secondary-600">
            {searchTerm || filter !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'No exam sessions are currently active.'
            }
          </p>
        </div>
      )}

      {/* Session Monitor Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-secondary-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-secondary-900">
                  Monitoring: {selectedSession.studentName}
                </h2>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="text-secondary-400 hover:text-secondary-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
              {/* Real-Time Clock and Exam Time Left */}
              <MonitorTimes startTime={selectedSession.startTime} duration={selectedSession.duration} />
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Video Feed */}
                <div className="lg:col-span-2">
                  <div className="bg-secondary-100 rounded-lg h-64 flex items-center justify-center">
                    <ProctorWebRTC examId={selectedSession.examId} studentId={selectedSession.studentId} labeled />
                  </div>
                </div>

                {/* Session Details */}
                <div className="space-y-4">
                  <div className="card">
                    <h3 className="font-medium text-secondary-900 mb-3">Session Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-secondary-600">Student:</span>
                        <span className="font-medium">{selectedSession.studentName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary-600">Exam:</span>
                        <span className="font-medium">{selectedSession.examTitle}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary-600">Duration:</span>
                        <span className="font-medium">{formatDuration(selectedSession.duration)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary-600">Status:</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedSession.status)}`}>
                          {selectedSession.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Connection Status */}
                  <div className="card">
                    <h3 className="font-medium text-secondary-900 mb-3">Connection Status</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-secondary-600">Video:</span>
                        <span className={`flex items-center space-x-1 ${getConnectionStatus(selectedSession.videoStatus)}`}>
                          <VideoCameraIcon className="h-4 w-4" />
                          <span className="capitalize">{selectedSession.videoStatus}</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-secondary-600">Audio:</span>
                        <span className={`flex items-center space-x-1 ${getConnectionStatus(selectedSession.audioStatus)}`}>
                          <MicrophoneIcon className="h-4 w-4" />
                          <span className="capitalize">{selectedSession.audioStatus}</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-secondary-600">Screen:</span>
                        <span className={`flex items-center space-x-1 ${getConnectionStatus(selectedSession.screenStatus)}`}>
                          <ComputerDesktopIcon className="h-4 w-4" />
                          <span className="capitalize">{selectedSession.screenStatus.replace('_', ' ')}</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-secondary-600">Network:</span>
                        <span className={`flex items-center space-x-1 ${getConnectionStatus(selectedSession.networkStatus)}`}>
                          <SignalIcon className="h-4 w-4" />
                          <span className="capitalize">{selectedSession.networkStatus}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Chat */}
                  <div className="card">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-secondary-900">Chat</h3>
                      <button
                        onClick={() => setShowChat(!showChat)}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        <ChatBubbleLeftRightIcon className="h-4 w-4" />
                      </button>
                    </div>
                    
                    {showChat && (
                      <div className="space-y-3">
                        <div className="h-32 overflow-y-auto space-y-2">
                          {selectedSession.chatMessages.map((message) => (
                            <div key={message.id} className={`text-sm p-2 rounded ${
                              message.sender === 'proctor' 
                                ? 'bg-primary-100 text-primary-800 ml-4' 
                                : 'bg-secondary-100 text-secondary-800 mr-4'
                            }`}>
                              <p>{message.message}</p>
                              <p className="text-xs opacity-75 mt-1">{formatDate(message.timestamp)}</p>
                            </div>
                          ))}
                        </div>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={chatMessage}
                            onChange={(e) => setChatMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="input-field flex-1 text-sm"
                            onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                          />
                          <button
                            onClick={sendChatMessage}
                            className="btn-primary text-sm"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Proctoring; 

// Add MonitorTimes component at the bottom of the file
// --- MonitorTimes: Shows real-time clock and exam time left ---
type MonitorTimesProps = { startTime: string; duration: number };
const MonitorTimes: React.FC<MonitorTimesProps> = ({ startTime, duration }) => {
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  // Calculate exam end time
  const start = new Date(startTime);
  const end = new Date(start.getTime() + duration * 60 * 1000);
  const timeLeftMs = end.getTime() - now.getTime();
  const timeLeft = Math.max(0, Math.floor(timeLeftMs / 1000));
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };
  return (
    <div className="flex gap-8 mt-4">
      <div className="flex items-center gap-2 text-lg">
        <ClockIcon className="h-5 w-5 text-primary-600" />
        <span>Real Time:</span>
        <span className="font-mono">{now.toLocaleTimeString()}</span>
      </div>
      <div className="flex items-center gap-2 text-lg">
        <ClockIcon className="h-5 w-5 text-green-600" />
        <span>Exam Time Left:</span>
        <span className="font-mono">{formatTime(timeLeft)}</span>
      </div>
    </div>
  );
}; 