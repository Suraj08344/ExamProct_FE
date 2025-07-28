import React, { useEffect, useState } from 'react';
import { AcademicCapIcon, UsersIcon, XMarkIcon, PencilIcon, EyeIcon, UserGroupIcon, AcademicCapIcon as CapIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import MessageBubble from '../../components/MessageBubble';

const UniversityClassrooms: React.FC = () => {
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatClassroom, setChatClassroom] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', subject: '', description: '', isActive: true });
  const [editLoading, setEditLoading] = useState(false);
  const { user } = useAuth();
  const { socket, joinClassroom, leaveClassroom } = useSocket();
  const navigate = useNavigate();
  // State for all university teachers
  const [universityTeachers, setUniversityTeachers] = useState<any[]>([]);
  // State for all university students
  const [universityStudents, setUniversityStudents] = useState<any[]>([]);
  // State for schedule modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Add state for details modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsClassroom, setDetailsClassroom] = useState<any>(null);

  // Function to open details modal
  const openDetailsModal = (classroom: any) => {
    setDetailsClassroom(classroom);
    setDetailsModalOpen(true);
  };
  // Function to close details modal
  const closeDetailsModal = () => {
    setDetailsModalOpen(false);
    setDetailsClassroom(null);
  };

  // Fetch classrooms
  const fetchClassrooms = async () => {
    setRefreshing(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/classrooms/university-system', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) setClassrooms(data.data);
      else setError(data.error || 'Failed to fetch classrooms');
    } catch {
      setError('Failed to fetch classrooms');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchClassrooms(); }, []);

  // Fetch all teachers in the university
  useEffect(() => {
    const fetchTeachers = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch('/api/university/users', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
        });
        const data = await res.json();
        if (data.success) {
          setUniversityTeachers(data.data.filter((u: any) => u.role === 'teacher' || u.role === 'instructor'));
          setUniversityStudents(data.data.filter((u: any) => u.role === 'student'));
        }
      } catch {}
    };
    fetchTeachers();
  }, []);

  // Fetch messages for chat modal
  const fetchMessages = async (classroomId: string) => {
    try {
      const res = await import('../../services/api');
      const response = await res.messageAPI.getClassroomMessages(classroomId);
      if (response.success) setMessages(response.data || []);
    } catch (err) {
      setMessages([]);
    }
  };

  // Open chat modal
  const openChat = async (classroom: any) => {
    setChatClassroom(classroom);
    setChatOpen(true);
    joinClassroom(classroom._id);
    await fetchMessages(classroom._id);
  };
  // Close chat modal
  const closeChat = () => {
    if (chatClassroom) leaveClassroom(chatClassroom._id);
    setChatOpen(false);
    setChatClassroom(null);
    setMessages([]);
    setNewMessage('');
    setReplyingTo(null);
  };
  // Send message
  const sendMessage = async () => {
    if (!chatClassroom || !newMessage.trim() || !user) return;
    setSending(true);
    try {
      const res = await import('../../services/api');
      const messageData: any = {
        classroomId: chatClassroom._id,
        text: newMessage.trim(),
        messageType: 'text',
      };
      if (replyingTo) {
        messageData.replyTo = {
          messageId: replyingTo._id,
          text: replyingTo.text,
          senderName: replyingTo.senderName,
        };
      }
      const response = await res.messageAPI.sendMessage(messageData);
      if (response.success) {
        setMessages(prev => [...prev, {
          ...response.data,
          senderId: user.id,
          senderName: user.name,
        }]);
        if (socket) {
          socket.emit('classroom-message', {
            classroomId: chatClassroom._id,
            ...response.data,
          });
        }
        setNewMessage('');
        setReplyingTo(null);
      }
    } finally {
      setSending(false);
    }
  };
  // Listen for real-time messages
  useEffect(() => {
    if (!socket || !chatClassroom) return;
    const handler = (msg: any) => {
      if (msg.classroomId === chatClassroom._id) {
        setMessages(prev => [...prev, msg]);
      }
    };
    socket.on('new-message', handler);
    return () => { socket.off('new-message', handler); };
  }, [socket, chatClassroom]);

  // Open edit modal
  const openEditModal = (classroom: any) => {
    setEditingClassroom(classroom);
    setEditForm({
      name: classroom.name || '',
      subject: classroom.subject || '',
      description: classroom.description || '',
      isActive: classroom.isActive !== false,
    });
    setEditModalOpen(true);
  };
  // Close edit modal
  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingClassroom(null);
    setEditForm({ name: '', subject: '', description: '', isActive: true });
    setEditLoading(false);
  };
  // Handle edit form change
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setEditForm(f => ({ ...f, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setEditForm(f => ({ ...f, [name]: value }));
    }
  };
  // Submit edit
  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClassroom) return;
    setEditLoading(true);
    try {
      const res = await import('../../services/api');
      const response = await res.classroomAPI.updateClassroom(editingClassroom._id, editForm);
      if (response.success) {
        await fetchClassrooms();
        closeEditModal();
      } else {
        alert(response.error || 'Failed to update classroom');
      }
    } catch (err) {
      alert('Failed to update classroom');
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (error) return <div className="flex items-center justify-center min-h-screen text-red-500">{error}</div>;

  const isUniversityAdmin = user?.role === 'university';
  const teacherClassroom = classrooms.find(c => c.name === 'Teacher');
  const studentClassroom = classrooms.find(c => c.name === 'Student');

  // Modern Welcome Header
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Card component for classroom
  const ClassroomCard = (props: { classroom: any; type: 'teacher' | 'student' }) => {
    const { classroom, type } = props;
    // Card colors and icons
    const gradient = type === 'teacher'
      ? 'bg-gradient-to-r from-blue-500 to-purple-500'
      : 'bg-gradient-to-r from-emerald-500 to-blue-500';
    const Icon = type === 'teacher' ? AcademicCapIcon : UsersIcon;
    // Card click handler (except icons)
    const handleCardClick = (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('.card-action')) return;
      if (classroom?._id) {
        navigate(`/dashboard/university/classrooms/${classroom._id}`);
      }
    };
    // Count teachers and students
    const totalTeachers = Array.isArray(classroom?.students)
      ? classroom.students.filter((u: any) => u.role === 'teacher' || u.role === 'instructor').length
      : 0;
    const totalStudents = Array.isArray(classroom?.students)
      ? classroom.students.filter((u: any) => u.role === 'student').length
      : 0;
    return (
      <div
        className="rounded-3xl shadow-xl bg-white flex flex-col overflow-hidden group transition-all duration-200 hover:shadow-2xl hover:scale-[1.02] cursor-pointer"
        onClick={handleCardClick}
      >
        {/* Gradient Header */}
        <div className={`relative p-6 ${gradient} flex items-center rounded-t-3xl`}> 
          <Icon className="h-8 w-8 text-white mr-3" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-white">{type === 'teacher' ? 'Teacher' : 'Student'}</h2>
              <span className="bg-yellow-300 text-yellow-900 text-xs font-semibold rounded-full px-3 py-1 ml-1">University Class</span>
            </div>
            <div className="text-white/80 text-lg font-medium mt-1">{classroom?.subject || 'General'}</div>
          </div>
          <span className="ml-auto bg-green-200 text-green-800 text-sm font-semibold rounded-full px-4 py-1">{classroom?.isActive ? 'Active' : 'Inactive'}</span>
        </div>
        {/* Card Body */}
        <div className="flex-1 flex flex-col px-6 pt-6 pb-4 bg-white">
          <div className="text-gray-700 text-base mb-4">{classroom?.description || (type === 'teacher' ? 'All university teachers' : 'All university students')}</div>
          {/* Schedule Exam button for university admin in Student classroom */}
          <div className="flex items-center gap-8 mb-4">
            {/* Only show teacher count for Teacher classroom */}
            {type === 'teacher' && (
              <div className="flex items-center gap-1 text-purple-500 text-base">
                <UserGroupIcon className="h-5 w-5" />
                <span>{universityTeachers.length} teachers</span>
              </div>
            )}
            {/* Only show students count for Student classroom */}
            {type === 'student' && (
              <>
                <div className="flex items-center gap-1 text-emerald-600 text-base">
                  <UsersIcon className="h-5 w-5" />
                  <span>{universityStudents.length} students</span>
                </div>
                <div className="flex items-center gap-1 text-pink-500 text-base">
                  <CapIcon className="h-5 w-5" />
                  <span>{classroom?.tests?.length || 0} tests</span>
                </div>
              </>
            )}
            <div className="ml-auto text-gray-400 text-base">{classroom?.createdAt ? new Date(classroom.createdAt).toLocaleDateString() : ''}</div>
          </div>
          <hr className="my-2 border-gray-100" />
          <div className="flex items-center justify-between mt-2">
            <span className="bg-purple-100 text-purple-700 font-semibold rounded-full px-5 py-2 text-base">{classroom?.code}</span>
            <div className="flex items-center gap-2">
              {isUniversityAdmin && (
                <>
                  <button className="card-action bg-white shadow p-2 rounded-full hover:bg-purple-50 transition" title="Edit" onClick={e => { e.stopPropagation(); openEditModal(classroom); }}>
                    <PencilIcon className="h-5 w-5 text-purple-500" />
                  </button>
                  {/* Show Schedule Exam for Student classroom */}
                  {type === 'student' && (
                    <button className="card-action bg-white shadow p-2 rounded-full hover:bg-green-50 transition" title="Schedule Exam" onClick={e => { e.stopPropagation(); setChatClassroom(classroom); setShowScheduleModal(true); }}>
                      <CapIcon className="h-5 w-5 text-green-500" />
                    </button>
                  )}
                  <button className="card-action bg-white shadow p-2 rounded-full hover:bg-blue-50 transition" title="View Details" onClick={e => { e.stopPropagation(); openDetailsModal(classroom); }}>
                    <EyeIcon className="h-5 w-5 text-blue-500" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="w-full p-4 sm:p-6 lg:p-8 py-8">
        {/* Modern Welcome Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-8 mb-8 shadow-xl text-white">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center mb-2">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl mr-4 shadow-lg inline-block">
                <AcademicCapIcon className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white drop-shadow-lg">University Admin Classrooms</h1>
                <p className="text-blue-100 text-lg">
                  {getGreeting()}, {user?.name}! Here are your system classrooms.
                </p>
              </div>
            </div>
            <div className="mt-6 md:mt-0 flex flex-col sm:flex-row gap-4">
              <button
                onClick={fetchClassrooms}
                disabled={refreshing}
                className="inline-flex items-center px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg transition-all duration-200 flex items-center transform hover:scale-105 focus:scale-105"
              >
                <ArrowPathIcon className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
        {/* Classroom Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <ClassroomCard classroom={teacherClassroom} type="teacher" />
          <ClassroomCard classroom={studentClassroom} type="student" />
        </div>
        {/* Chat Modal */}
        {chatOpen && chatClassroom && (
          <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-0 flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold text-xl">
                    {chatClassroom.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{chatClassroom.name}</h2>
                    <p className="text-xs text-blue-100">{chatClassroom.subject}</p>
                  </div>
                </div>
                <button onClick={closeChat} className="p-2 text-white hover:bg-purple-600 rounded-full transition-all duration-200" title="Close chat">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 bg-gradient-to-br from-blue-50 to-purple-50">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-400">No messages yet. Start the conversation!</div>
                ) : (
                  messages.map((msg, idx) => (
                    <MessageBubble
                      key={msg._id || idx}
                      message={msg}
                      isOwnMessage={String(msg.senderId) === String(user?.id)}
                      onReply={setReplyingTo}
                      replyingTo={replyingTo}
                    />
                  ))
                )}
              </div>
              {/* Reply preview */}
              {replyingTo && (
                <div className="px-6 py-2 bg-purple-100 flex items-center gap-2 border-t border-purple-200">
                  <span className="text-xs text-purple-700 font-semibold">Replying to {replyingTo.senderName}:</span>
                  <span className="text-xs text-purple-900 truncate">{replyingTo.text}</span>
                  <button onClick={() => setReplyingTo(null)} className="ml-auto text-purple-500 hover:text-purple-700">
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
              {/* Input */}
              <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-200 bg-white rounded-b-2xl">
                <input
                  type="text"
                  className="flex-1 px-4 py-2 rounded-full border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/70"
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
                  disabled={sending}
                />
                <button
                  onClick={sendMessage}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full font-bold hover:from-blue-600 hover:to-purple-700 disabled:opacity-50"
                  disabled={sending || !newMessage.trim()}
                >Send</button>
              </div>
            </div>
          </div>
        )}
        {/* Edit Classroom Modal */}
        {editModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-0 flex flex-col animate-slide-up">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 rounded-t-2xl">
                <h3 className="text-xl font-bold text-gray-900">Edit Classroom</h3>
                <button onClick={closeEditModal} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200" title="Close">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={submitEdit} className="px-6 py-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Classroom Name</label>
                  <input
                    type="text"
                    name="name"
                    value={editForm.name}
                    onChange={handleEditChange}
                    className="w-full border border-purple-300 rounded-full px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-purple-50 transition-all duration-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <input
                    type="text"
                    name="subject"
                    value={editForm.subject}
                    onChange={handleEditChange}
                    className="w-full border border-purple-300 rounded-full px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-purple-50 transition-all duration-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    name="description"
                    value={editForm.description}
                    onChange={handleEditChange}
                    className="w-full border border-purple-300 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-purple-50 transition-all duration-200"
                    rows={3}
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={editForm.isActive}
                    onChange={handleEditChange}
                    className="rounded border-purple-300 text-purple-500 focus:ring-purple-500 mr-2"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-full hover:bg-gray-200 transition-all duration-200"
                  >Cancel</button>
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 disabled:opacity-50"
                  >{editLoading ? 'Saving...' : 'Update'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Details Modal */}
        {detailsModalOpen && detailsClassroom && (
          <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-0 flex flex-col animate-slide-up overflow-hidden">
              {/* Gradient Header */}
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-6 flex items-center gap-4">
                <div className="w-16 h-16 bg-yellow-300 rounded-full flex items-center justify-center">
                  <AcademicCapIcon className="h-10 w-10 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-1">{detailsClassroom.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="bg-yellow-200 text-yellow-800 text-xs font-semibold rounded-full px-4 py-1">{detailsClassroom.code}</span>
                    <span className={`text-xs font-semibold rounded-full px-3 py-1 ml-2 ${detailsClassroom.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{detailsClassroom.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
                <button onClick={closeDetailsModal} className="p-2 text-white hover:bg-purple-600 hover:bg-opacity-80 rounded-full transition-all duration-200" title="Close">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              {/* Info Cards */}
              <div className="p-8 bg-gradient-to-b from-white to-blue-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow border border-purple-100 p-5 flex flex-col gap-2">
                    <span className="text-xs text-gray-500 font-semibold">Subject</span>
                    <span className="text-base font-bold text-purple-700">{detailsClassroom.subject}</span>
                  </div>
                  <div className="bg-white rounded-xl shadow border border-blue-100 p-5 flex flex-col gap-2">
                    <span className="text-xs text-gray-500 font-semibold">Created By</span>
                    <span className="text-base font-bold text-blue-700">{detailsClassroom.createdBy?.name || 'University Admin'}</span>
                  </div>
                  <div className="bg-white rounded-xl shadow border border-green-100 p-5 flex flex-col gap-2 md:col-span-2">
                    <span className="text-xs text-gray-500 font-semibold">Description</span>
                    <span className="text-base text-gray-700">{detailsClassroom.description || 'No description provided.'}</span>
                  </div>
                  {/* Only show teacher count for Teacher classroom, student count for Student classroom */}
                  {detailsClassroom.name === 'Teacher' && (
                    <div className="bg-white rounded-xl shadow border border-emerald-100 p-5 flex flex-col gap-2 md:col-span-2">
                      <span className="text-xs text-gray-500 font-semibold">Total Teachers</span>
                      <span className="text-base font-bold text-emerald-700">{Array.isArray(detailsClassroom.students) ? detailsClassroom.students.filter((u: any) => u.role === 'teacher' || u.role === 'instructor').length : 0}</span>
                    </div>
                  )}
                  {detailsClassroom.name === 'Student' && (
                    <div className="bg-white rounded-xl shadow border border-blue-100 p-5 flex flex-col gap-2 md:col-span-2">
                      <span className="text-xs text-gray-500 font-semibold">Total Students</span>
                      <span className="text-base font-bold text-blue-700">{Array.isArray(detailsClassroom.students) ? detailsClassroom.students.filter((u: any) => u.role === 'student').length : 0}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-end mt-8">
                  <button
                    onClick={closeDetailsModal}
                    className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                  >Close</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UniversityClassrooms; 