import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AcademicCapIcon, XMarkIcon, EyeIcon, PencilIcon, TrashIcon, PlusIcon, PaperAirplaneIcon, ChevronRightIcon, ChatBubbleLeftRightIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import MessageBubble from '../../components/MessageBubble';
import FileUpload from '../../components/FileUpload';
import { classroomAPI, messageAPI, examsAPI } from '../../services/api';

const UniversityClassroomChat = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, joinClassroom, leaveClassroom } = useSocket();
  const [classroom, setClassroom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  // Edit form state
  const [editForm, setEditForm] = useState({ name: '', subject: '', description: '', isActive: true });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  // Schedule test form state
  const [testForm, setTestForm] = useState({ title: '', description: '', examId: '', startTime: '', endTime: '' });
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState('');
  const [exams, setExams] = useState<any[]>([]);
  // Delete loading
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Fetch classroom info
  useEffect(() => {
    const fetchClassroom = async () => {
      setLoading(true);
      try {
        const response = await classroomAPI.getClassroom(id);
        if (response.success) setClassroom(response.data);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchClassroom();
  }, [id]);

  // Fetch exams for scheduling test
  useEffect(() => {
    if (showScheduleModal) {
      examsAPI.getAllExams().then(res => {
        if (res.success) setExams(res.data);
      });
    }
  }, [showScheduleModal]);

  // Fetch messages
  const fetchMessages = async (classroomId: any) => {
    try {
      const response = await messageAPI.getClassroomMessages(classroomId);
      if (response.success) setMessages(response.data || []);
    } catch {
      setMessages([]);
    }
  };

  // Join chatroom on mount
  useEffect(() => {
    if (classroom && classroom._id) {
      joinClassroom(classroom._id);
      fetchMessages(classroom._id);
      return () => leaveClassroom(classroom._id);
    }
  }, [classroom && classroom._id]);

  // Listen for real-time messages
  useEffect(() => {
    if (!socket || !classroom || !classroom._id) return;
    const handler = (msg: any) => {
      if (msg.classroomId === classroom._id) {
        setMessages((prev: any[]) => [...prev, msg]);
      }
    };
    socket.on('new-message', handler);
    return () => { socket.off('new-message', handler); };
  }, [socket, classroom && classroom._id]);

  // Send message
  const sendMessage = async () => {
    if (!classroom || (!newMessage.trim() && !selectedFile) || !user) return;
    setSending(true);
    setUploadingFile(!!selectedFile);
    let attachmentData = null;
    try {
      if (selectedFile) {
        const uploadResponse = await import('../../services/api').then(m => m.uploadAPI.uploadFile(selectedFile));
        if (uploadResponse.success) {
          attachmentData = uploadResponse.data;
        } else {
          throw new Error(uploadResponse.error || 'File upload failed');
        }
      }
      const messageData: any = {
        classroomId: classroom._id,
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
      const response = await messageAPI.sendMessage(messageData);
      if (response.success) {
        setMessages(prev => [...prev, {
          ...response.data,
          senderId: user.id,
          senderName: user.name,
        }]);
        if (socket) {
          socket.emit('classroom-message', {
            classroomId: classroom._id,
            ...response.data,
          });
        }
        setNewMessage('');
        setSelectedFile(null);
        setReplyingTo(null);
      }
    } catch (error) {
      // Optionally show error
    } finally {
      setSending(false);
      setUploadingFile(false);
    }
  };

  // Open edit modal and populate form
  const openEditModal = () => {
    setEditForm({
      name: classroom.name || '',
      subject: classroom.subject || '',
      description: classroom.description || '',
      isActive: classroom.isActive !== false,
    });
    setEditError('');
    setShowEditModal(true);
  };
  // Submit edit
  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    try {
      const response = await classroomAPI.updateClassroom(classroom._id, editForm);
      if (response.success) {
        setClassroom(response.data);
        setShowEditModal(false);
      } else {
        setEditError(response.error || 'Failed to update classroom');
      }
    } catch (err: any) {
      setEditError(err.message || 'Failed to update classroom');
    } finally {
      setEditLoading(false);
    }
  };
  // Open delete modal
  const openDeleteModal = () => {
    setDeleteError('');
    setShowDeleteModal(true);
  };
  // Confirm delete
  const confirmDelete = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const response = await classroomAPI.deleteClassroom(classroom._id);
      if (response.success) {
        navigate('/dashboard/university/classrooms');
      } else {
        setDeleteError(response.error || 'Failed to delete classroom');
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete classroom');
    } finally {
      setDeleteLoading(false);
    }
  };
  // Open schedule test modal
  const openScheduleModal = () => {
    setTestForm({ title: '', description: '', examId: '', startTime: '', endTime: '' });
    setTestError('');
    setShowScheduleModal(true);
  };
  // Submit schedule test
  const submitTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestLoading(true);
    setTestError('');
    try {
      const response = await classroomAPI.createTest(classroom._id, testForm);
      if (response.success) {
        // Refetch classroom to get new tests
        const updated = await classroomAPI.getClassroom(classroom._id);
        if (updated.success) setClassroom(updated.data);
        setShowScheduleModal(false);
      } else {
        setTestError(response.error || 'Failed to schedule test');
      }
    } catch (err: any) {
      setTestError(err.message || 'Failed to schedule test');
    } finally {
      setTestLoading(false);
    }
  };

  if (loading || !classroom) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-2xl font-semibold text-gray-600">Loading...</div>
      </div>
    );
  }

  const isStudentClassroom = classroom?.name === 'Student';
  const isTeacherClassroom = classroom?.name === 'Teacher';
  const isUniversityAdmin = user?.role === 'university';
  const isTeacher = user?.role === 'instructor' || user?.role === 'teacher' || user?.role === 'admin';

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-60 overflow-hidden z-50">
      <div className="flex h-full">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 flex-shrink-0 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 text-white hover:bg-purple-600 rounded-full transition-all duration-200"
                  title="Back to classrooms"
                >
                  <ChevronRightIcon className="h-6 w-6 rotate-180" />
                </button>
                <div className="w-12 h-12 bg-yellow-300 rounded-full flex items-center justify-center">
                  <AcademicCapIcon className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{classroom.name}</h2>
                  <p className="text-sm text-yellow-100">{classroom.subject}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-xs font-mono bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full">
                  {classroom.code}
                </span>
                <button
                  onClick={() => navigate(-1)}
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
                      isOwnMessage={String(senderId) === String(user?.id)}
                      onReply={setReplyingTo}
                      replyingTo={replyingTo}
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
                      onClick={() => setReplyingTo(null)}
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
                    disabled={sending}
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
                      onFileSelect={setSelectedFile}
                      onRemoveFile={() => setSelectedFile(null)}
                      selectedFile={selectedFile}
                      isTeacher={isTeacher}
                    />
                  )}
                </div>
                <button
                  onClick={sendMessage}
                  disabled={sending || (!newMessage.trim() && !selectedFile)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full shadow-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
                >
                  {sending ? (
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
            {/* Tests Section: Only show for non-Teacher system classroom */}
            {!(classroom?.name === 'Teacher' && classroom?.isSystem) && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-gray-900 flex items-center">
                    <AcademicCapIcon className="h-6 w-6 mr-2 text-purple-500" />
                    Tests
                  </h4>
                  {(user?.role === 'university' && classroom?.name === 'Student') && (
                    <button
                      onClick={openScheduleModal}
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200"
                    >
                      <PlusIcon className="h-5 w-5 mr-1" />
                      Schedule
                    </button>
                  )}
                </div>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {classroom.tests && classroom.tests.length > 0 ? (
                    classroom.tests.map((test: any) => (
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
                            onClick={() => {/* handleRemoveTest(test._id) */}}
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
                  onClick={() => setShowDetailsModal(true)}
                  className="w-full flex items-center justify-between p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-all duration-200"
                >
                  <div className="flex items-center">
                    <EyeIcon className="h-5 w-5 mr-3 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">View Details</span>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-blue-400" />
                </button>
                <button
                  onClick={openEditModal}
                  className="w-full flex items-center justify-between p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-all duration-200"
                >
                  <div className="flex items-center">
                    <PencilIcon className="h-5 w-5 mr-3 text-purple-600" />
                    <span className="text-sm font-medium text-gray-900">Edit Classroom</span>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-purple-400" />
                </button>
                <button
                  onClick={openDeleteModal}
                  className="w-full flex items-center justify-between p-3 text-left bg-red-50 hover:bg-red-100 rounded-lg transition-all duration-200"
                >
                  <div className="flex items-center">
                    <TrashIcon className="h-5 w-5 mr-3 text-red-600" />
                    <span className="text-sm font-medium text-red-900">Delete Classroom</span>
                  </div>
                  <ChevronRightIcon className="h-5 w-5 text-red-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-0 flex flex-col animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 rounded-t-2xl">
              <h3 className="text-xl font-bold text-gray-900">Edit Classroom</h3>
              <button onClick={() => setShowEditModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200" title="Close">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <form className="px-6 py-6 space-y-5" onSubmit={submitEdit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Classroom Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-purple-300 rounded-full px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-purple-50 transition-all duration-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  value={editForm.subject}
                  onChange={e => setEditForm(f => ({ ...f, subject: e.target.value }))}
                  className="w-full border border-purple-300 rounded-full px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-purple-50 transition-all duration-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-purple-300 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-purple-50 transition-all duration-200"
                  rows={3}
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={e => setEditForm(f => ({ ...f, isActive: e.target.checked }))}
                  className="rounded border-purple-300 text-purple-500 focus:ring-purple-500 mr-2"
                />
                <span className="text-sm text-gray-700">Active</span>
              </div>
              {editError && <div className="text-red-500 text-sm mt-2">{editError}</div>}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-full hover:bg-gray-200 transition-all duration-200"
                >Cancel</button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 disabled:opacity-50"
                  disabled={editLoading}
                >{editLoading ? 'Saving...' : 'Update'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-0 flex flex-col animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 rounded-t-2xl">
              <h3 className="text-xl font-bold text-gray-900">Delete Classroom</h3>
              <button onClick={() => setShowDeleteModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200" title="Close">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="px-6 py-6">
              <p>Are you sure you want to delete this classroom?</p>
              {deleteError && <div className="text-red-500 text-sm mt-2">{deleteError}</div>}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-full hover:bg-gray-200 transition-all duration-200"
                >Cancel</button>
                <button
                  type="button"
                  className="px-6 py-2.5 text-sm font-medium text-white bg-red-500 rounded-full shadow-lg hover:bg-red-600 transition-all duration-200 disabled:opacity-50"
                  onClick={confirmDelete}
                  disabled={deleteLoading}
                >{deleteLoading ? 'Deleting...' : 'Delete'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-0 flex flex-col animate-slide-up overflow-hidden">
            {/* Gradient Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-6 flex items-center gap-4">
              <div className="w-16 h-16 bg-yellow-300 rounded-full flex items-center justify-center">
                <AcademicCapIcon className="h-10 w-10 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-1">{classroom.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="bg-yellow-200 text-yellow-800 text-xs font-semibold rounded-full px-4 py-1">{classroom.code}</span>
                  <span className={`text-xs font-semibold rounded-full px-3 py-1 ml-2 ${classroom.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{classroom.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="p-2 text-white hover:bg-purple-600 hover:bg-opacity-80 rounded-full transition-all duration-200" title="Close">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            {/* Info Cards */}
            <div className="p-8 bg-gradient-to-b from-white to-blue-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow border border-purple-100 p-5 flex flex-col gap-2">
                  <span className="text-xs text-gray-500 font-semibold">Subject</span>
                  <span className="text-base font-bold text-purple-700">{classroom.subject}</span>
                </div>
                <div className="bg-white rounded-xl shadow border border-blue-100 p-5 flex flex-col gap-2">
                  <span className="text-xs text-gray-500 font-semibold">Created By</span>
                  <span className="text-base font-bold text-blue-700">{classroom.createdBy?.name || 'University Admin'}</span>
                </div>
                <div className="bg-white rounded-xl shadow border border-green-100 p-5 flex flex-col gap-2 md:col-span-2">
                  <span className="text-xs text-gray-500 font-semibold">Description</span>
                  <span className="text-base text-gray-700">{classroom.description || 'No description provided.'}</span>
                </div>
              </div>
              <div className="flex justify-end mt-8">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                >Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Schedule Test Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-0 flex flex-col animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 rounded-t-2xl">
              <h3 className="text-xl font-bold text-gray-900">Schedule Test</h3>
              <button onClick={() => setShowScheduleModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200" title="Close">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <form className="px-6 py-6 space-y-5" onSubmit={submitTest}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Test Title</label>
                <input
                  type="text"
                  value={testForm.title}
                  onChange={e => setTestForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-green-300 rounded-full px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-green-50 transition-all duration-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={testForm.description}
                  onChange={e => setTestForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-green-300 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-green-50 transition-all duration-200"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Exam</label>
                <select
                  value={testForm.examId}
                  onChange={e => setTestForm(f => ({ ...f, examId: e.target.value }))}
                  className="w-full border border-green-300 rounded-full px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-green-50 transition-all duration-200"
                  required
                >
                  <option value="">Choose an exam</option>
                  {exams.map((exam: any) => (
                    <option key={exam._id} value={exam._id}>{exam.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                <input
                  type="datetime-local"
                  value={testForm.startTime}
                  onChange={e => setTestForm(f => ({ ...f, startTime: e.target.value }))}
                  className="w-full border border-green-300 rounded-full px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-green-50 transition-all duration-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                <input
                  type="datetime-local"
                  value={testForm.endTime}
                  onChange={e => setTestForm(f => ({ ...f, endTime: e.target.value }))}
                  className="w-full border border-green-300 rounded-full px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-green-50 transition-all duration-200"
                  required
                />
              </div>
              {testError && <div className="text-red-500 text-sm mt-2">{testError}</div>}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-full hover:bg-gray-200 transition-all duration-200"
                >Cancel</button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full shadow-lg hover:from-indigo-600 hover:to-blue-600 transition-all duration-200 disabled:opacity-50"
                  disabled={testLoading}
                >{testLoading ? 'Scheduling...' : 'Schedule'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversityClassroomChat;