# 🔗 Frontend-Backend Integration Guide

## Overview
This guide explains how to integrate your React frontend with the Node.js backend API.

## 🚀 Quick Setup

### 1. Start the Backend
```bash
cd exam-proctor-backend
npm run dev
```
Backend will run on: `http://localhost:5000`

### 2. Start the Frontend
```bash
cd exam-proctor
npm start
```
Frontend will run on: `http://localhost:3000`

## 📡 API Integration

### Authentication Flow
The frontend now uses real API calls instead of mock data:

```javascript
// Login
const { login } = useAuth();
try {
  await login(email, password);
  // User is automatically logged in
} catch (error) {
  console.error('Login failed:', error.message);
}

// Register
const { register } = useAuth();
try {
  await register(email, password, name, role);
  // User is automatically logged in
} catch (error) {
  console.error('Registration failed:', error.message);
}
```

### API Service Usage
```javascript
import { examsAPI, questionsAPI, resultsAPI } from '../services/api';

// Get all exams
const response = await examsAPI.getAllExams();
const exams = response.data;

// Create an exam
const newExam = await examsAPI.createExam({
  title: 'JavaScript Test',
  description: 'Test your JS knowledge',
  duration: 60,
  totalQuestions: 10,
  passingScore: 70,
  startTime: '2024-01-20T10:00:00',
  endTime: '2024-01-20T11:00:00'
});

// Get questions for an exam
const questions = await questionsAPI.getExamQuestions(examId);
```

## 🔧 Environment Configuration

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### Backend (.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/exam-proctor
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3000
```

## 📊 Database Models

### User
- `id`, `name`, `email`, `role`, `avatar`, `isActive`, `lastLogin`

### Exam
- `id`, `title`, `description`, `duration`, `totalQuestions`, `passingScore`, `startTime`, `endTime`, `isActive`, `createdBy`

### Question
- `id`, `examId`, `type`, `question`, `options`, `correctAnswer`, `points`, `order`

### Result
- `id`, `examId`, `studentId`, `answers`, `totalScore`, `percentage`, `passed`, `timeTaken`

## 🔐 Authentication

### JWT Token Management
- Tokens are automatically stored in localStorage
- API service handles token inclusion in requests
- Automatic token refresh (if implemented)

### Role-Based Access
- **student**: Can take exams, view results
- **instructor**: Can create exams, view results, proctor
- **admin**: Full system access

## 📡 Real-time Features

### Socket.IO Integration
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

// Join exam room
socket.emit('join-exam', examId);

// Listen for proctor events
socket.on('proctor-alert', (data) => {
  console.log('Proctor alert:', data);
});

// Send proctor event
socket.emit('proctor-event', {
  examId: 'exam123',
  type: 'tab-switch',
  description: 'Student switched tabs'
});
```

## 🧪 Testing the Integration

### 1. Health Check
```bash
curl http://localhost:5000/api/health
```

### 2. Register a User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Teacher",
    "email": "teacher@example.com",
    "password": "password123",
    "role": "instructor"
  }'
```

### 3. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "password123"
  }'
```

## 🔄 Migration from Mock Data

### Before (Mock Data)
```javascript
// Old mock authentication
const mockUser = {
  id: '1',
  email: 'teacher@example.com',
  name: 'Test Teacher',
  role: 'instructor'
};
```

### After (Real API)
```javascript
// New real API authentication
const { login } = useAuth();
const user = await login(email, password);
```

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure backend CORS_ORIGIN matches frontend URL
   - Check that backend is running on correct port

2. **Authentication Errors**
   - Verify JWT_SECRET is set in backend
   - Check token storage in localStorage

3. **Database Connection**
   - Ensure MongoDB is running
   - Check MONGODB_URI in backend .env

4. **API Endpoints Not Found**
   - Verify backend routes are properly configured
   - Check API_BASE_URL in frontend

### Debug Steps
1. Check browser console for errors
2. Check backend console for errors
3. Verify API endpoints with Postman/curl
4. Check network tab in browser dev tools

## 📈 Next Steps

1. **Add Error Handling**
   - Implement proper error boundaries
   - Add user-friendly error messages

2. **Add Loading States**
   - Show loading spinners during API calls
   - Implement optimistic updates

3. **Add Real-time Features**
   - Implement live proctoring
   - Add real-time notifications

4. **Add File Upload**
   - Implement image upload for questions
   - Add document upload for exams

5. **Add Analytics**
   - Implement detailed reporting
   - Add performance tracking

## 📚 Additional Resources

- [Backend API Documentation](../exam-proctor-backend/README.md)
- [Frontend Documentation](./README.md)
- [API Service Documentation](./src/services/api.js) 