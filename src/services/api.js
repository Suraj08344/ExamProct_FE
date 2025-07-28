// API Configuration (merged from config/api.js)
// Development URLs
const DEV_HTTP_URL = 'http://localhost:5001/api';
const DEV_HTTPS_URL = 'https://your-ngrok-backend-url.ngrok.io/api'; // Replace with your ngrok URL
const PROD_URL = 'https://examproctor-backend-e6mh.onrender.com/api'; // Updated production URL

const getApiUrl = () => {
  // Always use the deployed backend URL for now
  // This allows you to work from anywhere without running a local backend
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Use production URL by default (deployed backend)
  return PROD_URL;
  
  // Uncomment the lines below if you want to use local backend during development
  // if (process.env.NODE_ENV === 'production') {
  //   return PROD_URL;
  // }
  // if (process.env.REACT_APP_FORCE_HTTPS === 'true') {
  //   return DEV_HTTPS_URL;
  // }
  // if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
  //   return DEV_HTTPS_URL;
  // }
  // return DEV_HTTP_URL;
};

export const API_BASE_URL = getApiUrl();

export const updateApiUrl = (newUrl) => {
  if (typeof window !== 'undefined') {
    window.API_BASE_URL = newUrl;
  }
};

if (typeof window !== 'undefined') {
  console.log('🌐 API Base URL:', API_BASE_URL);
  console.log('🔗 Protocol:', window.location.protocol);
  console.log('🏠 Hostname:', window.location.hostname);
}

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Helper function to set auth token
const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
};

// Helper function to make API requests
const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    credentials: 'include', // Always include credentials for cookies
    ...options,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Authentication API
export const authAPI = {
  // Register user
  register: async (userData) => {
    const response = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    if (response.success && response.data.token) {
      setAuthToken(response.data.token);
    }
    
    return response;
  },

  // Login user
  login: async (credentials) => {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (response.success && response.data.token) {
      setAuthToken(response.data.token);
    }
    
    return response;
  },

  // Get current user
  getCurrentUser: async () => {
    return await apiRequest('/auth/me');
  },

  // Update profile
  updateProfile: async (profileData) => {
    return await apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  // Change password
  changePassword: async (passwordData) => {
    return await apiRequest('/auth/password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
  },

  // Logout
  logout: () => {
    setAuthToken(null);
  },

  // Request password reset
  requestReset: async (email) => {
    const response = await apiRequest('/auth/request-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return response;
  },

  // Verify OTP for password reset
  verifyOTP: async (email, otp) => {
    const response = await apiRequest('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
    return response;
  },

  // Reset password
  resetPassword: async (email, otp, newPassword) => {
    const response = await apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword }),
    });
    return response;
  },
};

// Exams API
export const examsAPI = {
  // Get all exams
  getAllExams: async () => {
    return await apiRequest('/exams');
  },

  // Get single exam
  getExam: async (examId) => {
    return await apiRequest(`/exams/${examId}`);
  },

  // Create exam
  createExam: async (examData) => {
    return await apiRequest('/exams', {
      method: 'POST',
      body: JSON.stringify(examData),
    });
  },

  // Update exam
  updateExam: async (examId, examData) => {
    return await apiRequest(`/exams/${examId}`, {
      method: 'PUT',
      body: JSON.stringify(examData),
    });
  },

  // Delete exam
  deleteExam: async (examId) => {
    return await apiRequest(`/exams/${examId}`, {
      method: 'DELETE',
    });
  },

  // Download question paper as PDF
  downloadQuestionPaper: async (examId) => {
    const token = getAuthToken();
    
    try {
      const response = await fetch(`${API_BASE_URL}/exams/${examId}/download-questions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download question paper');
      }

      // Return the blob directly for PDF downloads
      const blob = await response.blob();
      return {
        success: true,
        data: blob
      };
    } catch (error) {
      console.error('Download question paper error:', error);
      throw error;
    }
  },

  // Download answer key as PDF
  downloadAnswerKey: async (examId) => {
    const token = getAuthToken();
    
    try {
      const response = await fetch(`${API_BASE_URL}/exams/${examId}/download-answers`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download answer key');
      }

      // Return the blob directly for PDF downloads
      const blob = await response.blob();
      return {
        success: true,
        data: blob
      };
    } catch (error) {
      console.error('Download answer key error:', error);
      throw error;
    }
  },

  // Toggle exam status (active/inactive)
  toggleExamStatus: async (examId, isActive) => {
    return await apiRequest(`/exams/${examId}/toggle-status`, {
      method: 'PUT',
      body: JSON.stringify({ isActive }),
    });
  },

  // Start exam session
  startExam: async (examId, testId) => {
    const url = testId ? `/exams/${examId}/start?testId=${testId}` : `/exams/${examId}/start`;
    return await apiRequest(url, { method: 'POST' });
  },

  getProgress: async (examId) => {
    return await apiRequest(`/exams/${examId}/progress`);
  },
  saveProgress: async (examId, progress) => {
    return await apiRequest(`/exams/${examId}/progress`, {
      method: 'POST',
      body: JSON.stringify(progress),
    });
  },
};

// Questions API
export const questionsAPI = {
  // Create question
  createQuestion: async (questionData) => {
    return await apiRequest('/questions', {
      method: 'POST',
      body: JSON.stringify(questionData),
    });
  },

  // Get questions for an exam
  getQuestionsByExam: async (examId) => {
    return await apiRequest(`/questions/exam/${examId}`);
  },

  // Update question
  updateQuestion: async (questionId, questionData) => {
    return await apiRequest(`/questions/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify(questionData),
    });
  },

  // Delete question
  deleteQuestion: async (questionId) => {
    return await apiRequest(`/questions/${questionId}`, {
      method: 'DELETE',
    });
  },
};

// Results API
export const resultsAPI = {
  // Start exam session
  startSession: async (examId) => {
    return await apiRequest('/results/start-session', {
      method: 'POST',
      body: JSON.stringify({ examId }),
    });
  },

  // Update exam progress
  updateProgress: async (sessionId, progressData) => {
    return await apiRequest('/results/update-progress', {
      method: 'PUT',
      body: JSON.stringify({ sessionId, ...progressData }),
    });
  },

  // Report student activity
  reportActivity: async (sessionId, activityData) => {
    return await apiRequest('/results/report-activity', {
      method: 'POST',
      body: JSON.stringify({ sessionId, ...activityData }),
    });
  },

  // Submit exam result
  submitResult: async (resultData) => {
    return await apiRequest('/results', {
      method: 'POST',
      body: JSON.stringify(resultData),
    });
  },

  // Get results for current user
  getUserResults: async () => {
    return await apiRequest('/results/user');
  },

  // Get a specific result for a given exam for the current user
  getUserResultForExam: async (examId) => {
    const res = await apiRequest('/results/user');
    if (res.success && Array.isArray(res.data)) {
      return res.data.find(result => result.examId && result.examId._id === examId);
    }
    return null;
  },

  // Get results for an exam (instructor/admin only)
  getExamResults: async (examId) => {
    return await apiRequest(`/results/exam/${examId}`);
  },

  // Get all exams with summary stats for instructor
  getInstructorResults: async () => {
    return await apiRequest('/results/instructor-exams');
  },

  // Get all student results for a given exam
  getExamStudents: async (examId) => {
    return await apiRequest(`/results/exam/${examId}/students`);
  },

  // Get single student result (for modal)
  getStudentResult: async (resultId) => {
    return await apiRequest(`/results/student/${resultId}`);
  },

  // Export exam results to Excel
  exportExamResults: async (examId) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/results/exam/${examId}/export`, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    
    if (!response.ok) {
      throw new Error('Export failed');
    }
    
    return {
      success: true,
      data: await response.blob()
    };
  },

  releaseResults: async (examId) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://examproctor-backend-e6mh.onrender.com/api'}/results/release/${examId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  },

  // Delete a student's exam result (allows reattempt)
  deleteResult: async (resultId) => {
    return await apiRequest(`/results/${resultId}`, {
      method: 'DELETE',
    });
  },
};

// Users API
export const usersAPI = {
  // Get all users (admin/instructor only)
  getAllUsers: async () => {
    return await apiRequest('/users');
  },

  // Get single user
  getUser: async (userId) => {
    return await apiRequest(`/users/${userId}`);
  },

  // Get current user profile
  getProfile: async () => {
    return await apiRequest('/users/profile');
  },

  // Update current user profile
  updateProfile: async (profileData) => {
    return await apiRequest('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  // Get student progress (for teacher analytics)
  getStudentProgress: async (studentId) => {
    return await apiRequest(`/users/${studentId}/progress`);
  },
};

// Admin API
export const adminAPI = {
  // Get dashboard stats
  getStats: async () => {
    return await apiRequest('/admin/stats');
  },
};

// Proctor API
export const proctorAPI = {
  // Get all exams for proctoring
  getProctorExams: async () => {
    return await apiRequest('/proctor/exams');
  },

  // Get active students for an exam
  getExamStudents: async (examId) => {
    return await apiRequest(`/proctor/exam/${examId}/students`);
  },

  // Get proctor events for an exam
  getExamEvents: async (examId) => {
    return await apiRequest(`/proctor/exam/${examId}/events`);
  },

  // Submit proctor event
  submitEvent: async (eventData) => {
    return await apiRequest('/proctor/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  },

  // Send message to student
  sendMessage: async (messageData) => {
    return await apiRequest('/proctor/message', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  },

  // Terminate student session
  terminateSession: async (terminateData) => {
    return await apiRequest('/proctor/terminate', {
      method: 'POST',
      body: JSON.stringify(terminateData),
    });
  },

  // Get student session details
  getSessionDetails: async (resultId) => {
    return await apiRequest(`/proctor/session/${resultId}`);
  },
};

// Upload API
export const uploadAPI = {
  // Upload a file
  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = getAuthToken();
    
    const config = {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        // Don't set Content-Type for FormData, let browser set it with boundary
      },
      body: formData,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'File upload failed');
      }

      return data;
    } catch (error) {
      console.error('Upload Error:', error);
      throw error;
    }
  },
};

// Message API
export const messageAPI = {
  // Get messages for a classroom
  getClassroomMessages: async (classroomId, page = 1, limit = 50) => {
    return await apiRequest(`/messages/classroom/${classroomId}?page=${page}&limit=${limit}`);
  },

  // Send a message
  sendMessage: async (messageData) => {
    return await apiRequest('/messages', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  },

  // Edit a message
  editMessage: async (messageId, text) => {
    return await apiRequest(`/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ text }),
    });
  },

  // Delete a message
  deleteMessage: async (messageId) => {
    return await apiRequest(`/messages/${messageId}`, {
      method: 'DELETE',
    });
  },
};

// Classroom API
export const classroomAPI = {
  // Get all classrooms (for teachers)
  getTeacherClassrooms: async () => {
    console.log('Fetching teacher classrooms...');
    const response = await apiRequest('/classrooms');
    console.log('Teacher classrooms response:', response);
    return response;
  },

  // Get student's classrooms
  getStudentClassrooms: async () => {
    console.log('Fetching student classrooms...');
    const response = await apiRequest('/classrooms/student');
    console.log('Student classrooms response:', response);
    return response;
  },

  // Get single classroom
  getClassroom: async (classroomId) => {
    console.log('Fetching classroom:', classroomId);
    const response = await apiRequest(`/classrooms/${classroomId}`);
    console.log('Classroom response:', response);
    return response;
  },

  // Create classroom
  createClassroom: async (classroomData) => {
    console.log('Creating classroom with data:', classroomData);
    const response = await apiRequest('/classrooms', {
      method: 'POST',
      body: JSON.stringify(classroomData),
    });
    console.log('Create classroom response:', response);
    return response;
  },

  // Join classroom
  joinClassroom: async (code) => {
    console.log('Joining classroom with code:', code);
    const response = await apiRequest('/classrooms/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    console.log('Join classroom response:', response);
    return response;
  },

  // Add material to classroom
  addMaterial: async (classroomId, materialData) => {
    console.log('Adding material to classroom:', classroomId, materialData);
    const response = await apiRequest(`/classrooms/${classroomId}/materials`, {
      method: 'POST',
      body: JSON.stringify(materialData),
    });
    console.log('Add material response:', response);
    return response;
  },

  // Create test in classroom
  createTest: async (classroomId, testData) => {
    console.log('Creating test in classroom:', classroomId, testData);
    const response = await apiRequest(`/classrooms/${classroomId}/tests`, {
      method: 'POST',
      body: JSON.stringify(testData),
    });
    console.log('Create test response:', response);
    return response;
  },

  // Get tests for a classroom
  getClassroomTests: async (classroomId) => {
    console.log('Fetching tests for classroom:', classroomId);
    const response = await apiRequest(`/classrooms/${classroomId}/tests`);
    console.log('Get classroom tests response:', response);
    return response;
  },

  // Update classroom
  updateClassroom: async (classroomId, classroomData) => {
    console.log('Updating classroom:', classroomId, classroomData);
    const response = await apiRequest(`/classrooms/${classroomId}`, {
      method: 'PUT',
      body: JSON.stringify(classroomData),
    });
    console.log('Update classroom response:', response);
    return response;
  },

  // Remove student from classroom
  removeStudent: async (classroomId, studentId) => {
    console.log('Removing student from classroom:', classroomId, studentId);
    const response = await apiRequest(`/classrooms/${classroomId}/students/${studentId}`, {
      method: 'DELETE',
    });
    console.log('Remove student response:', response);
    return response;
  },

  // Delete classroom
  deleteClassroom: async (classroomId) => {
    console.log('Deleting classroom:', classroomId);
    const response = await apiRequest(`/classrooms/${classroomId}`, {
      method: 'DELETE',
    });
    console.log('Delete classroom response:', response);
    return response;
  },

  // Get all students in teacher's classrooms
  getMyStudents: async () => {
    return await apiRequest('/classrooms/my-students');
  },

  // Get all system classrooms for university
  getSystemClassroomsForUniversity: async () => {
    console.log('Fetching system classrooms for university...');
    const response = await apiRequest('/classrooms/university-system');
    console.log('System classrooms for university response:', response);
    return response;
  },
};

// Tests API
export const testsAPI = {
  // Get tests for a classroom
  getClassroomTests: async (classroomId) => {
    return await apiRequest(`/tests/classroom/${classroomId}`);
  },

  // Get upcoming tests for student
  getUpcomingTests: async () => {
    return await apiRequest('/tests/upcoming');
  },

  // Create test
  createTest: async (testData) => {
    return await apiRequest('/tests', {
      method: 'POST',
      body: JSON.stringify(testData),
    });
  },

  // Update test
  updateTest: async (testId, testData) => {
    return await apiRequest(`/tests/${testId}`, {
      method: 'PUT',
      body: JSON.stringify(testData),
    });
  },

  // Delete test
  deleteTest: async (testId) => {
    return await apiRequest(`/tests/${testId}`, {
      method: 'DELETE',
    });
  },

  getStudentExams: async () => {
    const res = await fetch(`${API_BASE_URL}/tests/student-exams`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    });
    return res.json();
  },
};

// Dashboard API
export const dashboardAPI = {
  // Get dashboard stats for instructor
  getStats: async () => {
    return await apiRequest('/dashboard/stats');
  },

  // Get recent exams for instructor
  getRecentExams: async () => {
    return await apiRequest('/dashboard/recent-exams');
  },

  // Get recent activity for instructor
  getRecentActivity: async () => {
    return await apiRequest('/dashboard/recent-activity');
  },
};

// Health check
export const healthCheck = async () => {
  return await apiRequest('/health');
};

const apiService = {
  auth: authAPI,
  exams: examsAPI,
  questions: questionsAPI,
  results: resultsAPI,
  users: usersAPI,
  admin: adminAPI,
  proctor: proctorAPI,
  classroom: classroomAPI,
  message: messageAPI,
  upload: uploadAPI,
  tests: testsAPI,
  dashboard: dashboardAPI,
  healthCheck,
};

export default apiService; 