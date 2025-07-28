import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import apiService from '../services/api';
import MessageBubble from '../components/MessageBubble';
import FileUpload from '../components/FileUpload';
import {
  PlusIcon,
  UserGroupIcon,
  AcademicCapIcon,
  PaperClipIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XCircleIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

interface ClassroomData {
  _id: string;
  name: string;
  description: string;
  subject: string;
  code: string;
  createdBy: string;
  students: string[];
  materials: Material[];
  tests: Test[];
  isActive: boolean;
  createdAt: string;
  isSystem?: boolean;
}

interface Material {
  _id: string;
  title: string;
  description: string;
  type: 'document' | 'video' | 'link' | 'image';
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

interface Test {
  _id: string;
  title: string;
  description: string;
  examId: {
    _id: string;
    title: string;
    description: string;
    duration: number;
  };
  classroomId: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdBy: {
    _id: string;
    name: string;
  };
  submissions: TestSubmission[];
  createdAt: string;
  updatedAt: string;
}

interface TestSubmission {
  _id: string;
  studentId: string;
  studentName: string;
  submittedAt: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'missed';
  score?: number;
  startTime?: string;
  endTime?: string;
}

interface Student {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

const Classroom: React.FC = () => {
  const { user } = useAuth();
  const { socket, joinClassroom: joinSocketRoom, leaveClassroom: leaveSocketRoom } = useSocket();
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState<ClassroomData[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedClassroom, setSelectedClassroom] = useState<ClassroomData | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [newlyCreatedClassroom, setNewlyCreatedClassroom] = useState<ClassroomData | null>(null);
  const [newClassroom, setNewClassroom] = useState({
    name: '',
    description: '',
    subject: ''
  });
  const [newMaterial, setNewMaterial] = useState({
    title: '',
    description: '',
    type: 'document' as const,
    url: ''
  });
  const [newTest, setNewTest] = useState({
    title: '',
    description: '',
    examId: '',
    startTime: '',
    endTime: ''
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<ClassroomData | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingClassroom, setDeletingClassroom] = useState<ClassroomData | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showStudentList, setShowStudentList] = useState(false);
  const [classroomStudents, setClassroomStudents] = useState<Student[]>([]);
  const [joiningClassroom, setJoiningClassroom] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (user?.role === 'student') {
        const response = await apiService.classroom.getStudentClassrooms();
        setClassrooms(response.data || []);
      } else if (user?.role === 'university') {
        const response = await apiService.classroom.getSystemClassroomsForUniversity();
        setClassrooms(response.data || []);
      } else {
        const response = await apiService.classroom.getTeacherClassrooms();
        setClassrooms(response.data || []);
      }
      if (user?.role === 'instructor' || user?.role === 'teacher' || user?.role === 'admin') {
        const examsRes = await apiService.exams.getAllExams();
        setExams(examsRes.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'university') {
      navigate('/dashboard/university/classrooms', { replace: true });
      return;
    }
    fetchData();
    const urlParams = new URLSearchParams(window.location.search);
    const joinCode = urlParams.get('join');
    if (joinCode && user?.role === 'student') {
      setJoinCode(joinCode);
      setShowJoinModal(true);
    }
  }, [user?.role]);

  useEffect(() => {
    if (!socket) return;
    socket.on('new-message', (message: any) => {
      setMessages(prev => [...prev, message]);
    });
    return () => {
      socket.off('new-message');
    };
  }, [socket]);

  useEffect(() => {
    const chatContainer = document.querySelector('.chat-messages');
    if (chatContainer) {
      setTimeout(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }, 100);
    }
  }, [messages]);

  const createClassroom = async () => {
    if (!newClassroom.name.trim() || !newClassroom.subject.trim()) {
      alert('Please fill in all required fields (Name and Subject)');
      return;
    }
    if (!user || (user.role !== 'instructor' && user.role !== 'teacher' && user.role !== 'admin')) {
      alert('Only instructors and admins can create classrooms.');
      return;
    }
    try {
      const response = await apiService.classroom.createClassroom({
        name: newClassroom.name,
        description: newClassroom.description,
        subject: newClassroom.subject
      });
      if (response.success) {
        setShowCreateModal(false);
        setNewClassroom({ name: '', description: '', subject: '' });
        setNewlyCreatedClassroom(response.data);
        fetchData();
      } else {
        alert('Failed to create classroom: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating classroom:', error);
      alert('Error creating classroom.');
    }
  };

  const joinClassroom = async () => {
    if (!joinCode.trim() || joinCode.length < 6) {
      alert('Please enter a valid classroom code');
      return;
    }
    try {
      setJoiningClassroom(true);
      const response = await apiService.classroom.joinClassroom(joinCode);
      if (response.success) {
        alert('Successfully joined classroom!');
        setShowJoinModal(false);
        setJoinCode('');
        fetchData();
      } else {
        alert('Failed to join classroom: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error joining classroom:', error);
      alert('Error joining classroom.');
    } finally {
      setJoiningClassroom(false);
    }
  };

  const addMaterial = async () => {
    if (!selectedClassroom || !newMaterial.title.trim() || !newMaterial.url.trim()) {
      alert('Please fill in all required fields (Title and URL)');
      return;
    }
    try {
      new URL(newMaterial.url);
    } catch {
      alert('Please enter a valid URL');
      return;
    }
    try {
      const response = await apiService.classroom.addMaterial(selectedClassroom._id, newMaterial);
      if (response.success) {
        setShowMaterialModal(false);
        setNewMaterial({ title: '', description: '', type: 'document', url: '' });
        setSelectedClassroom({
          ...selectedClassroom,
          materials: [...selectedClassroom.materials, response.data.materials[response.data.materials.length - 1]]
        });
        fetchData();
        alert('Material added successfully!');
      } else {
        alert('Failed to add material: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error adding material:', error);
      alert('Error adding material.');
    }
  };

  const createTest = async () => {
    if (!selectedClassroom || !newTest.title.trim() || !newTest.examId || !newTest.startTime || !newTest.endTime) {
      alert('Please fill in all required fields.');
      return;
    }
    const start = new Date(newTest.startTime);
    const end = new Date(newTest.endTime);
    const now = new Date();
    if (start < now) {
      alert('Start time must be in the future.');
      return;
    }
    if (end <= start) {
      alert('End time must be after the start time.');
      return;
    }
    try {
      const response = await apiService.classroom.createTest(selectedClassroom._id, newTest);
      if (response.success) {
        setShowTestModal(false);
        setNewTest({ title: '', description: '', examId: '', startTime: '', endTime: '' });
        setSelectedClassroom({
          ...selectedClassroom,
          tests: [...(selectedClassroom.tests || []), response.data]
        });
        fetchData();
        alert('Test scheduled successfully!');
      } else {
        alert('Failed to schedule test: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error scheduling test:', error);
      alert('Error scheduling test.');
    }
  };

  const editClassroom = async () => {
    if (!editingClassroom) return;
    try {
      const response = await apiService.classroom.updateClassroom(editingClassroom._id, editingClassroom);
      if (response.success) {
        setShowEditModal(false);
        setEditingClassroom(null);
        fetchData();
      }
    } catch (error) {
      console.error('Error updating classroom:', error);
      alert('Error updating classroom.');
    }
  };

  const deleteClassroom = async () => {
    if (!deletingClassroom) return;
    try {
      const response = await apiService.classroom.deleteClassroom(deletingClassroom._id);
      if (response.success) {
        setShowDeleteConfirm(false);
        setDeletingClassroom(null);
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting classroom:', error);
      alert('Error deleting classroom.');
    }
  };

  const sendMessage = async () => {
    if (!selectedClassroom || (!newMessage.trim() && !selectedFile) || !user) return;
    try {
      setSendingMessage(true);
      setUploadingFile(true);
      let attachmentData = null;
      if (selectedFile) {
        const uploadResponse = await apiService.upload.uploadFile(selectedFile);
        if (uploadResponse.success) {
          attachmentData = uploadResponse.data;
        } else {
          throw new Error(uploadResponse.error || 'File upload failed');
        }
      }
      const messageData: any = {
        classroomId: selectedClassroom._id,
        text: newMessage.trim() || `Sent ${selectedFile?.name || 'file'}`,
        messageType: selectedFile ? 'file' : 'text'
      };
      if (attachmentData) {
        messageData.attachment = attachmentData;
      }
      if (replyingTo) {
        messageData.replyTo = {
          messageId: replyingTo._id,
          text: replyingTo.text,
          senderName: replyingTo.senderName
        };
      }
      const response = await apiService.message.sendMessage(messageData);
      if (response.success) {
        // Optimistically add the message to the chat for the sender
        setMessages(prev => [...prev, {
          ...response.data,
          senderId: user.id,
          senderName: user.name,
        }]);
        // Emit the message via socket for real-time delivery to others
        if (socket) {
          socket.emit('classroom-message', {
            classroomId: selectedClassroom._id,
            ...response.data,
          });
        }
        setNewMessage('');
        setSelectedFile(null);
        setReplyingTo(null);
      } else {
        alert('Failed to send message: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message.');
    } finally {
      setSendingMessage(false);
      setUploadingFile(false);
    }
  };

  const handleReply = (message: any) => {
    setReplyingTo(message);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const fetchMessages = async (classroomId: string) => {
    try {
      const response = await apiService.message.getClassroomMessages(classroomId);
      if (response.success) {
        setMessages(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const openClassroomDetail = async (classroom: ClassroomData) => {
    setSelectedClassroom(classroom);
    setShowChat(true);
    joinSocketRoom(classroom._id);
    await fetchMessages(classroom._id);
  };

  const showClassroomSummary = async (classroom: ClassroomData) => {
    try {
      const response = await apiService.classroom.getClassroom(classroom._id);
      if (response.success) {
        setSelectedClassroom(response.data);
        setClassroomStudents(response.data.students || []);
        setShowStudentList(true);
      }
    } catch (error) {
      console.error('Error fetching classroom details:', error);
      alert('Error loading classroom details');
    }
  };

  const handleRemoveTest = async (testId: string) => {
    if (!window.confirm('Are you sure you want to remove this scheduled exam?')) return;
    try {
      await apiService.tests.deleteTest(testId);
      if (selectedClassroom) {
        setSelectedClassroom({
          ...selectedClassroom,
          tests: selectedClassroom.tests.filter((t) => t._id !== testId)
        });
      }
      setClassrooms((prev) =>
        prev.map((c) =>
          c._id === selectedClassroom?._id
            ? { ...c, tests: c.tests.filter((t) => t._id !== testId) }
            : c
        )
      );
    } catch (error) {
      alert('Failed to remove scheduled exam.');
      console.error(error);
    }
  };

  const uniqueClassrooms = Array.from(new Map(classrooms.map(c => [c._id, c])).values());
  const filteredClassrooms = uniqueClassrooms.filter(classroom => {
    const matchesSearch = classroom.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         classroom.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || classroom.isActive === (filter === 'active');
    return matchesSearch && matchesFilter;
  });

  const isTeacher = user?.role === 'instructor' || user?.role === 'teacher' || user?.role === 'admin';

  function isSystemClassroom(classroom: ClassroomData) {
    return classroom.isSystem || (classroom.name === 'Teacher' && user?.role !== 'student') || (classroom.name === 'Student' && user?.role === 'student');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-100 to-purple-100">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Glasy Gradient Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-8 mb-10 shadow-xl text-white">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center mb-2">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl mr-4 shadow-lg inline-block">
              <AcademicCapIcon className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white drop-shadow-lg">Your Classrooms</h1>
          </div>
          <p className="text-blue-100 text-lg font-medium drop-shadow">{isTeacher ? 'Create fun learning spaces!' : 'Join exciting classes and learn new things!'}</p>
          {user?.role !== 'university' && (
            <div className="flex items-center space-x-4 mt-6 md:mt-0">
              {isTeacher ? (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 hover:scale-105"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  New Classroom
                </button>
              ) : (
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 hover:scale-105"
                >
                  <UserGroupIcon className="h-5 w-5 mr-2" />
                  Join Class
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filters - glassy card */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-10">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-purple-400" />
            <input
              type="text"
              placeholder="Search for fun classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-3 w-full border border-purple-300 rounded-full focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-purple-50 text-gray-700 placeholder-gray-400 transition-all duration-300"
            />
          </div>
          <div className="flex items-center space-x-3">
            <FunnelIcon className="h-6 w-6 text-purple-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-purple-300 rounded-full px-4 py-3 bg-purple-50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-700 transition-all duration-300"
            >
              <option value="all">All Classes</option>
              <option value="active">Active Classes</option>
              <option value="inactive">Inactive Classes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Classrooms Grid - glassy, vibrant cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredClassrooms.map((classroom) => (
          <div
            key={classroom._id}
            className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 hover:shadow-2xl transform hover:scale-105 transition-transform transition-shadow duration-150 ease-out overflow-hidden cursor-pointer group will-change-transform"
            onClick={() => openClassroomDetail(classroom)}
          >
            {/* Classroom Header - glassy gradient */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white group-hover:text-yellow-200 transition-colors duration-200">
                  {classroom.name}
                  {isSystemClassroom(classroom) && (
                    <span className="ml-2 px-2 py-1 text-xs rounded-full bg-yellow-300 text-yellow-800 font-semibold">University Class</span>
                  )}
                </h3>
                <p className="text-sm text-yellow-100 mt-1">{classroom.subject}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium shadow-lg ${
                classroom.isActive
                  ? 'bg-green-200 text-green-800'
                  : 'bg-gray-200 text-gray-800'
              }`}>
                {classroom.isActive ? 'Active' : 'Inactive'}
              </div>
            </div>

            {/* Classroom Content */}
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{classroom.description || 'Join to explore!'}</p>
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <UserGroupIcon className="h-5 w-5 text-purple-500" />
                    <span>{classroom.students.length} students</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <AcademicCapIcon className="h-5 w-5 text-pink-500" />
                    <span>{classroom.tests?.length || 0} tests</span>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(classroom.createdAt).toLocaleDateString()}
                </div>
              </div>
              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                    {classroom.code}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {isTeacher && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingClassroom(classroom);
                          setShowEditModal(true);
                        }}
                        className="p-2 text-purple-500 hover:text-purple-700 hover:bg-purple-100 rounded-full shadow transition-all duration-200"
                        title="Edit classroom"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingClassroom(classroom);
                          setShowDeleteConfirm(true);
                        }}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full shadow transition-all duration-200"
                        title="Delete classroom"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      showClassroomSummary(classroom);
                    }}
                    className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-full shadow transition-all duration-200"
                    title="View details"
                  >
                    <EyeIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

        {/* Empty State */}
        {filteredClassrooms.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 text-purple-300 mb-4 animate-bounce">
              <AcademicCapIcon className="h-full w-full" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {searchTerm || filter !== 'all' ? 'No classes found' : 'No classes yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || filter !== 'all'
                ? 'Try a different search or filter!'
                : isTeacher
                  ? 'Create a fun classroom to start!'
                  : 'Join a class with a code to begin!'
              }
            </p>
            {isTeacher && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-lg hover:from-blue-600 hover:to-indigo-700 transform hover:scale-105 transition-all duration-300"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Classroom
              </button>
            )}
          </div>
        )}

      {/* Create Classroom Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-60 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-full max-w-md shadow-2xl rounded-2xl bg-white animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Create a New Classroom</h3>
                <p className="text-sm text-gray-600 mt-1">Make a fun space for learning!</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-all duration-200"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Classroom Name *</label>
                <input
                  type="text"
                  value={newClassroom.name}
                  onChange={(e) => setNewClassroom({...newClassroom, name: e.target.value})}
                  className="w-full border border-purple-300 rounded-full px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-purple-50 transition-all duration-200"
                  placeholder="e.g., Super Math Adventure"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                <input
                  type="text"
                  value={newClassroom.subject}
                  onChange={(e) => setNewClassroom({...newClassroom, subject: e.target.value})}
                  className="w-full border border-purple-300 rounded-full px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-purple-50 transition-all duration-200"
                  placeholder="e.g., Mathematics"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={newClassroom.description}
                  onChange={(e) => setNewClassroom({...newClassroom, description: e.target.value})}
                  className="w-full border border-purple-300 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-purple-50 transition-all duration-200"
                  rows={3}
                  placeholder="What's this class about?"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-full hover:bg-gray-200 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={createClassroom}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200"
                >
                  Create Classroom
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Join Classroom Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-60 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border w-full max-w-md shadow-2xl rounded-2xl bg-white animate-slide-up">
            <div className="mt-3">
              <h3 className="text-xl font-bold text-gray-900">Join a Fun Class!</h3>
              <form onSubmit={(e) => { e.preventDefault(); joinClassroom(); }}>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Classroom Code</label>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      className="w-full border border-green-300 rounded-full px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-green-50 transition-all duration-200"
                      placeholder="Enter your class code"
                      autoFocus
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowJoinModal(false)}
                      className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-full hover:bg-gray-200 transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={joiningClassroom}
                      className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-teal-500 rounded-full shadow-lg hover:from-green-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {joiningClassroom ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white mr-2"></div>
                          Joining...
                        </div>
                      ) : (
                        'Join Now'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Classroom Detail Modal */}
      {showChat && selectedClassroom && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-60 overflow-hidden z-50">
          <div className="flex h-full">
            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-white">
              {/* Chat Header */}
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 flex-shrink-0 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => {
                        setShowChat(false);
                        setSelectedClassroom(null);
                        setMessages([]);
                        setNewMessage('');
                        setReplyingTo(null);
                        setSelectedFile(null);
                        if (selectedClassroom) {
                          leaveSocketRoom(selectedClassroom._id);
                        }
                      }}
                      className="p-2 text-white hover:bg-purple-600 rounded-full transition-all duration-200"
                      title="Back to classrooms"
                    >
                      <ChevronRightIcon className="h-6 w-6 rotate-180" />
                    </button>
                    <div className="w-12 h-12 bg-yellow-300 rounded-full flex items-center justify-center">
                      <AcademicCapIcon className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{selectedClassroom.name}</h2>
                      <p className="text-sm text-yellow-100">{selectedClassroom.subject}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full">
                      {selectedClassroom.code}
                    </span>
                    <button
                      onClick={() => {
                        setShowChat(false);
                        setSelectedClassroom(null);
                        setMessages([]);
                        setNewMessage('');
                        setReplyingTo(null);
                        setSelectedFile(null);
                        if (selectedClassroom) {
                          leaveSocketRoom(selectedClassroom._id);
                        }
                      }}
                      className="p-2 text-white hover:bg-purple-600 rounded-full transition-all duration-200"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 flex flex-col min-h-0 relative bg-gradient-to-b from-blue-50 to-purple-50">
                <div className="flex-1 overflow-y-auto p-6 pb-32 space-y-4 chat-messages" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="mx-auto h-20 w-20 text-purple-300 mb-4 animate-pulse">
                        <ChatBubbleLeftRightIcon className="h-full w-full" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">No messages yet</h3>
                      <p className="text-gray-600">Start the chat with something fun!</p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const senderId = typeof message.senderId === 'object' && message.senderId?._id
                        ? message.senderId._id
                        : message.senderId;
                      return (
                        <MessageBubble
                          key={message._id}
                          message={message}
                          isOwnMessage={senderId === user?.id}
                          onReply={handleReply}
                        />
                      );
                    })
                  )}
                </div>

                {/* Scroll to bottom button */}
                {messages.length > 0 && (
                  <button
                    onClick={() => {
                      const chatContainer = document.querySelector('.chat-messages');
                      if (chatContainer) {
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                      }
                    }}
                    className="absolute bottom-32 right-6 p-3 bg-purple-500 text-white rounded-full shadow-lg hover:bg-purple-600 transition-all duration-200 z-10"
                    title="Scroll to bottom"
                  >
                    <ChevronRightIcon className="h-6 w-6 rotate-90" />
                  </button>
                )}

                {/* Message Input */}
                <div className="border-t border-gray-200 p-4 bg-white flex-shrink-0">
                  {replyingTo && (
                    <div className="mb-3 p-3 bg-purple-100 border border-purple-200 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-xs text-purple-600 font-medium">Replying to {replyingTo.senderName}</p>
                          <p className="text-sm text-purple-800 truncate">{replyingTo.text}</p>
                        </div>
                        <button
                          onClick={cancelReply}
                          className="text-purple-400 hover:text-purple-600"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex items-end gap-3 w-full">
                    <div className="flex-1 flex items-center gap-2">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Send a message..."
                        rows={1}
                        disabled={sendingMessage}
                        className="w-full border border-purple-300 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-purple-50 resize-none transition-all duration-200"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                      />
                      {isTeacher && (
                        <FileUpload
                          onFileSelect={handleFileSelect}
                          onRemoveFile={handleRemoveFile}
                          selectedFile={selectedFile}
                          isTeacher={isTeacher}
                        />
                      )}
                    </div>
                    <button
                      onClick={sendMessage}
                      disabled={sendingMessage || (!newMessage.trim() && !selectedFile)}
                      className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full shadow-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
                    >
                      {sendingMessage ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                          <span>{uploadingFile ? 'Uploading...' : 'Sending...'}</span>
                        </>
                      ) : (
                        <>
                          <PaperAirplaneIcon className="h-5 w-5" />
                          <span>Send</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-96 min-w-[24rem] max-w-md bg-gradient-to-b from-blue-50 to-purple-50 border-l border-gray-200 overflow-y-auto flex-shrink-0 flex-grow-0">
              <div className="p-6 space-y-6">
                {/* Tests Section: Only show for non-system Teacher classroom */}
                {selectedClassroom && !(selectedClassroom.name === 'Teacher' && selectedClassroom.isSystem) && (
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-gray-900 flex items-center">
                        <AcademicCapIcon className="h-6 w-6 mr-2 text-purple-500" />
                        Tests
                      </h4>
                      {isTeacher && (
                        <button
                          onClick={() => setShowTestModal(true)}
                          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200"
                        >
                          <PlusIcon className="h-5 w-5 mr-1" />
                          Schedule
                        </button>
                      )}
                    </div>
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {selectedClassroom?.tests && selectedClassroom.tests.length > 0 ? (
                        selectedClassroom.tests.map((test: any) => (
                          <div key={test._id} className="p-3 bg-purple-50 rounded-lg border border-purple-200 flex items-center justify-between">
                            <div>
                              <h5 className="text-sm font-medium text-gray-900 mb-1">{test.title}</h5>
                              <p className="text-xs text-gray-600 mb-2 line-clamp-2">{test.description}</p>
                              <div className="flex items-center text-xs text-gray-500 gap-2">
                                <span>{test.startTime ? new Date(test.startTime).toLocaleString() : ''}</span>
                                <span>-</span>
                                <span>{test.endTime ? new Date(test.endTime).toLocaleString() : ''}</span>
                              </div>
                            </div>
                            {isTeacher && (
                              <button
                                onClick={() => handleRemoveTest(test._id)}
                                className="ml-2 p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-all duration-200"
                                title="Remove scheduled exam"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-600">No tests scheduled yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <Cog6ToothIcon className="h-6 w-6 mr-2 text-gray-600" />
                    Quick Actions
                  </h4>
                  <div className="space-y-3">
                    <button
                      onClick={() => showClassroomSummary(selectedClassroom)}
                      className="w-full flex items-center justify-between p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-all duration-200"
                    >
                      <div className="flex items-center">
                        <EyeIcon className="h-5 w-5 mr-3 text-blue-600" />
                        <span className="text-sm font-medium text-gray-900">View Details</span>
                      </div>
                      <ChevronRightIcon className="h-5 w-5 text-blue-400" />
                    </button>
                    {isTeacher && (
                      <>
                        <button
                          onClick={() => {
                            setEditingClassroom(selectedClassroom);
                            setShowEditModal(true);
                          }}
                          className="w-full flex items-center justify-between p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-all duration-200"
                        >
                          <div className="flex items-center">
                            <PencilIcon className="h-5 w-5 mr-3 text-purple-600" />
                            <span className="text-sm font-medium text-gray-900">Edit Classroom</span>
                          </div>
                          <ChevronRightIcon className="h-5 w-5 text-purple-400" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingClassroom(selectedClassroom);
                            setShowDeleteConfirm(true);
                          }}
                          className="w-full flex items-center justify-between p-3 text-left bg-red-50 hover:bg-red-100 rounded-lg transition-all duration-200"
                        >
                          <div className="flex items-center">
                            <TrashIcon className="h-5 w-5 mr-3 text-red-600" />
                            <span className="text-sm font-medium text-red-900">Delete Classroom</span>
                          </div>
                          <ChevronRightIcon className="h-5 w-5 text-red-400" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Material Modal */}
      {showMaterialModal && selectedClassroom && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-60 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border w-full max-w-md shadow-2xl rounded-2xl bg-white animate-slide-up">
            <div className="mt-3">
              <h3 className="text-xl font-bold text-gray-900">Add Cool Study Material</h3>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={newMaterial.title}
                    onChange={(e) => setNewMaterial({...newMaterial, title: e.target.value})}
                    className="w-full border border-purple-300 rounded-full px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-purple-50 transition-all duration-200"
                    placeholder="Material title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    value={newMaterial.type}
                    onChange={(e) => setNewMaterial({...newMaterial, type: e.target.value as any})}
                    className="w-full border border-purple-300 rounded-full px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-purple-50 transition-all duration-200"
                  >
                    <option value="document">Document</option>
                    <option value="video">Video</option>
                    <option value="link">Link</option>
                    <option value="image">Image</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">URL/Link</label>
                  <input
                    type="url"
                    value={newMaterial.url}
                    onChange={(e) => setNewMaterial({...newMaterial, url: e.target.value})}
                    className="w-full border border-purple-300 rounded-full px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-purple-50 transition-all duration-200"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newMaterial.description}
                    onChange={(e) => setNewMaterial({...newMaterial, description: e.target.value})}
                    className="w-full border border-purple-300 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-purple-50 transition-all duration-200"
                    rows={3}
                    placeholder="What's this material about?"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowMaterialModal(false)}
                    className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-full hover:bg-gray-200 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addMaterial}
                    className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                  >
                    Add Material
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Test Modal */}
      {showTestModal && selectedClassroom && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-60 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-full max-w-md shadow-2xl rounded-2xl bg-white animate-slide-up">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Schedule a Test</h3>
                  <p className="text-sm text-gray-600 mt-1">Plan an exciting exam!</p>
                </div>
                <button
                  onClick={() => setShowTestModal(false)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-all duration-200"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Test Title *</label>
                  <input
                    type="text"
                    value={newTest.title}
                    onChange={(e) => setNewTest({...newTest, title: e.target.value})}
                    className="w-full border border-green-300 rounded-full px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-green-50 transition-all duration-200"
                    placeholder="e.g., Super Quiz Time"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newTest.description}
                    onChange={(e) => setNewTest({...newTest, description: e.target.value})}
                    className="w-full border border-green-300 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-green-50 transition-all duration-200"
                    rows={3}
                    placeholder="Test instructions..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Exam *</label>
                  <select
                    value={newTest.examId}
                    onChange={(e) => setNewTest({...newTest, examId: e.target.value})}
                    className="w-full border border-green-300 rounded-full px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-green-50 transition-all duration-200"
                  >
                    <option value="">Choose an exam</option>
                    {exams.map((exam) => (
                      <option key={exam._id} value={exam._id}>{exam.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Time *</label>
                  <input
                    type="datetime-local"
                    value={newTest.startTime}
                    onChange={(e) => setNewTest({...newTest, startTime: e.target.value})}
                    className="w-full border border-green-300 rounded-full px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-green-50 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Time *</label>
                  <input
                    type="datetime-local"
                    value={newTest.endTime}
                    onChange={(e) => setNewTest({...newTest, endTime: e.target.value})}
                    className="w-full border border-green-300 rounded-full px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-green-50 transition-all duration-200"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowTestModal(false)}
                    className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-full hover:bg-gray-200 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createTest}
                    className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-teal-500 rounded-full shadow-lg hover:from-green-600 hover:to-teal-600 transition-all duration-200"
                  >
                    Schedule Test
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Newly Created Classroom Modal */}
      {newlyCreatedClassroom && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-60 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border w-full max-w-md shadow-2xl rounded-2xl bg-white animate-slide-up">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Classroom Created!</h3>
                <button
                  onClick={() => setNewlyCreatedClassroom(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="bg-green-100 border border-green-200 rounded-2xl p-4">
                  <h4 className="font-semibold text-green-800 mb-2">{newlyCreatedClassroom.name}</h4>
                  <p className="text-sm text-green-700">{newlyCreatedClassroom.description}</p>
                </div>
                <div className="bg-purple-100 border border-purple-200 rounded-2xl p-4">
                  <h5 className="font-medium text-purple-800 mb-2">Classroom Code</h5>
                  <div className="flex items-center space-x-2">
                    <code className="bg-white px-3 py-2 rounded-full border font-mono text-lg font-bold text-purple-600">
                      {newlyCreatedClassroom.code}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(newlyCreatedClassroom.code)}
                      className="text-purple-600 hover:text-purple-700"
                      title="Copy code"
                    >
                      <PaperClipIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="text-xs text-purple-600 mt-2">Share this code with your friends!</p>
                </div>
                <div className="bg-blue-100 border border-blue-200 rounded-2xl p-4">
                  <h5 className="font-medium text-blue-800 mb-2">Join Link</h5>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={`${window.location.origin}/dashboard/classrooms?join=${newlyCreatedClassroom.code}`}
                      readOnly
                      className="flex-1 bg-white px-3 py-2 rounded-full border text-sm font-mono text-blue-600"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(`${window.location.origin}/dashboard/classrooms?join=${newlyCreatedClassroom.code}`)}
                      className="text-blue-600 hover:text-blue-700"
                      title="Copy link"
                    >
                      <PaperClipIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">Share this link for easy access!</p>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setNewlyCreatedClassroom(null)}
                    className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-full hover:bg-gray-200 transition-all duration-200"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setNewlyCreatedClassroom(null);
                      setSelectedClassroom(newlyCreatedClassroom);
                    }}
                    className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                  >
                    View Classroom
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Classroom Modal */}
      {showEditModal && editingClassroom && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-60 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border w-full max-w-md shadow-2xl rounded-2xl bg-white animate-slide-up">
            <div className="mt-3">
              <h3 className="text-xl font-bold text-gray-900">Edit Classroom</h3>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Classroom Name</label>
                  <input
                    type="text"
                    value={editingClassroom.name}
                    onChange={(e) => setEditingClassroom({...editingClassroom!, name: e.target.value})}
                    className="w-full border border-purple-300 rounded-full px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-purple-50 transition-all duration-200"
                    placeholder="e.g., Super Math Adventure"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <input
                    type="text"
                    value={editingClassroom.subject}
                    onChange={(e) => setEditingClassroom({...editingClassroom!, subject: e.target.value})}
                    className="w-full border border-purple-300 rounded-full px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-purple-50 transition-all duration-200"
                    placeholder="e.g., Mathematics"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={editingClassroom.description}
                    onChange={(e) => setEditingClassroom({...editingClassroom!, description: e.target.value})}
                    className="w-full border border-purple-300 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-purple-50 transition-all duration-200"
                    rows={3}
                    placeholder="What's this class about?"
                  />
                </div>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingClassroom.isActive}
                      onChange={(e) => setEditingClassroom({...editingClassroom!, isActive: e.target.checked})}
                      className="rounded border-purple-300 text-purple-500 focus:ring-purple-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Active</span>
                  </label>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingClassroom(null);
                    }}
                    className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-full hover:bg-gray-200 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editClassroom}
                    className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingClassroom && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-60 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border w-full max-w-md shadow-2xl rounded-2xl bg-white animate-slide-up">
            <div className="mt-3">
              <h3 className="text-xl font-bold text-gray-900">Delete Classroom</h3>
              <p className="text-gray-600 mt-2 mb-6">
                Are you sure you want to delete "{deletingClassroom.name}"? This can't be undone!
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletingClassroom(null);
                  }}
                  className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-full hover:bg-gray-200 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteClassroom}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-red-500 rounded-full shadow-lg hover:bg-red-600 transition-all duration-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student List and File Summary Modal */}
      {showStudentList && selectedClassroom && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-60 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-11/12 max-w-4xl shadow-2xl rounded-2xl bg-white animate-slide-up">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedClassroom.name} - Overview</h3>
                  <p className="text-sm text-gray-600">{selectedClassroom.subject}</p>
                </div>
                <button
                  onClick={() => setShowStudentList(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Students List */}
                <div className="bg-purple-50 rounded-2xl p-4">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Classmates ({classroomStudents.length})</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {classroomStudents.length > 0 ? (
                      classroomStudents.map((student) => (
                        <div key={student._id} className="flex items-center space-x-3 p-3 bg-white rounded-lg border">
                          <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-purple-600">
                              {student.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900">{student.name}</h5>
                            <p className="text-sm text-gray-600">{student.email}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-600 text-center py-4">No classmates yet!</p>
                    )}
                  </div>
                </div>

                {/* File Summary */}
                <div className="bg-blue-50 rounded-2xl p-4">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Files & Materials</h4>
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Tests ({selectedClassroom.tests?.length || 0})</h5>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {selectedClassroom.tests && selectedClassroom.tests.length > 0 ? (
                          selectedClassroom.tests.map((test) => (
                            <div key={test._id} className="p-2 bg-white rounded-lg border">
                              <h6 className="text-sm font-medium text-gray-900">{test.title}</h6>
                              <p className="text-xs text-gray-600 mb-1">{test.description}</p>
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>{test.startTime ? new Date(test.startTime).toLocaleDateString() : ''}</span>
                                <span>{test.endTime ? new Date(test.endTime).toLocaleDateString() : ''}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-600 text-sm">No tests scheduled</p>
                        )}
                      </div>
                    </div>
                    <div className="bg-purple-100 border border-purple-200 rounded-2xl p-3">
                      <h5 className="font-medium text-purple-800 mb-2">Quick Stats</h5>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Total Students:</span>
                          <span className="font-medium ml-1">{classroomStudents.length}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Materials:</span>
                          <span className="font-medium ml-1">{selectedClassroom.materials.length}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Active Tests:</span>
                          <span className="font-medium ml-1">
                            {selectedClassroom.tests?.filter(t => t.isActive).length || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Classroom Code:</span>
                          <span className="font-medium ml-1 font-mono">{selectedClassroom.code}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowStudentList(false)}
                  className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-full hover:bg-gray-200 transition-all duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classroom;