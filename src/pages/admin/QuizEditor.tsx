import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  EyeIcon,
  PlusIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  CogIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { examsAPI } from '../../services/api';
import axios from 'axios';
import * as XLSX from 'xlsx';

interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay' | 'fill-blank' | 'matching' | 'file-upload';
  question?: string;
  questionText?: string;
  description?: string;
  options?: string[];
  correctAnswer?: string | string[];
  points: number;
  timeLimit?: number;
  required: boolean;
  order: number;
  media?: {
    type: 'image' | 'video' | 'audio';
    url: string;
    alt?: string;
  };
  settings?: {
    randomizeOptions: boolean;
    allowPartialCredit: boolean;
    showFeedback: boolean;
    maxAttempts: number;
  };
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  timeLimit: number;
  passingScore: number;
  maxAttempts: number;
  isPublic: boolean;
  isActive: boolean;
  settings: {
    randomizeQuestions: boolean;
    showResults: boolean;
    allowReview: boolean;
    requireWebcam: boolean;
    preventTabSwitch: boolean;
    preventCopyPaste: boolean;
    enableProctoring: boolean;
  };
  questions: Question[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  startTime?: Date | string;
  endTime?: Date | string;
  instructions?: string[];
}

const QuizEditor: React.FC = () => {
  const navigate = useNavigate();
  const { quizId } = useParams<{ quizId: string }>();
  const [activeTab, setActiveTab] = useState('questions');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quiz state
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    id: '',
    type: 'multiple-choice',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    points: 10,
    required: true,
    order: 1,
    settings: {
      randomizeOptions: false,
      allowPartialCredit: false,
      showFeedback: true,
      maxAttempts: 1
    }
  });

  const [bulkUploadLoading, setBulkUploadLoading] = useState(false);
  const [bulkUploadResult, setBulkUploadResult] = useState<any>(null);
  const [bulkUploadError, setBulkUploadError] = useState<string | null>(null);

  // Load quiz if editing
  useEffect(() => {
    if (quizId && quizId !== 'new') {
      setLoading(true);
      examsAPI.getExam(quizId)
        .then((res) => {
          if (res.success && res.data) {
            // Normalize backend data to Quiz shape if needed
            setQuiz({
              ...res.data,
              id: res.data._id || res.data.id || quizId,
              questions: res.data.questions || [],
              settings: res.data.settings || {
                randomizeQuestions: false,
                showResults: true,
                allowReview: true,
                requireWebcam: false,
                preventTabSwitch: false,
                preventCopyPaste: false,
                enableProctoring: false,
              },
              tags: res.data.tags || [],
              createdAt: res.data.createdAt || '',
              updatedAt: res.data.updatedAt || '',
            });
            setError(null);
          } else {
            setError('Failed to load quiz.');
          }
        })
        .catch(() => setError('Failed to load quiz.'))
        .finally(() => setLoading(false));
    } else {
      // New quiz: start with blank
      setQuiz({
        id: 'new',
        title: '',
        description: '',
        category: 'Programming',
        difficulty: 'beginner',
        timeLimit: 30,
        passingScore: 50,
        maxAttempts: 1,
        isPublic: false,
        isActive: false,
        settings: {
          randomizeQuestions: false,
          showResults: true,
          allowReview: true,
          requireWebcam: false,
          preventTabSwitch: false,
          preventCopyPaste: false,
          enableProctoring: false,
        },
        questions: [],
        tags: [],
        createdAt: '',
        updatedAt: '',
      });
      setError(null);
    }
  }, [quizId]);

  // Helper to update quiz state
  const handleQuizChange = (field: keyof Quiz, value: any) => {
    setQuiz(prev => prev ? { ...prev, [field]: value } : prev);
  };

  const handleQuestionChange = (field: keyof Question, value: any) => {
    setCurrentQuestion(prev => ({ ...prev, [field]: value }));
  };

  const addQuestion = () => {
    if (!quiz) return;
    if (currentQuestion.question?.trim() || currentQuestion.questionText?.trim()) {
      const newQuestion: Question = {
        ...currentQuestion,
        id: Date.now().toString(),
        order: quiz.questions.length + 1,
        question: currentQuestion.question || currentQuestion.questionText || '',
      };
      setQuiz(prev => prev ? { ...prev, questions: [...prev.questions, newQuestion] } : prev);
      setCurrentQuestion({
        id: '',
        type: 'multiple-choice',
        question: '',
        options: ['', '', '', ''],
        correctAnswer: '',
        points: 10,
        required: true,
        order: (quiz.questions.length || 0) + 2,
        settings: {
          randomizeOptions: false,
          allowPartialCredit: false,
          showFeedback: true,
          maxAttempts: 1
        }
      });
    }
  };

  const deleteQuestion = (id: string) => {
    setQuiz(prev => prev ? { ...prev, questions: prev.questions.filter(q => q.id !== id) } : prev);
  };

  const duplicateQuestion = (question: Question) => {
    if (!quiz) return;
    const duplicatedQuestion: Question = {
      ...question,
      id: Date.now().toString(),
      order: quiz.questions.length + 1
    };
    setQuiz(prev => prev ? { ...prev, questions: [...prev.questions, duplicatedQuestion] } : prev);
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!quiz || !quiz.id || !e.target.files || e.target.files.length === 0) return;
    setBulkUploadLoading(true);
    setBulkUploadResult(null);
    setBulkUploadError(null);
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    formData.append('examId', quiz.id);
    try {
      const res = await axios.post('/api/questions/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setBulkUploadResult(res.data);
      if (res.data.success && res.data.created > 0) {
        // Optionally reload questions from backend
        examsAPI.getExam(quiz.id).then((r) => {
          if (r.success && r.data) setQuiz((prev) => prev ? { ...prev, questions: r.data.questions } : prev);
        });
      }
    } catch (err: any) {
      setBulkUploadError(err.response?.data?.error || 'Bulk upload failed');
    } finally {
      setBulkUploadLoading(false);
    }
  };

  const handleDownloadSampleFile = () => {
    // Create a more professional and easier-to-understand template
    const sampleData = [
      // Header row with clear column names
      {
        'Question Number': 'Q1',
        'Question Text': 'What is 2 + 2?',
        'Question Type': 'Multiple Choice',
        'Option A': '1',
        'Option B': '2', 
        'Option C': '3',
        'Option D': '4',
        'Correct Answer': 'D',
        'Points': '1',
        'Time Limit (seconds)': '60'
      },
      {
        'Question Number': 'Q2',
        'Question Text': 'Which planet is closest to the Sun?',
        'Question Type': 'Multiple Choice',
        'Option A': 'Earth',
        'Option B': 'Mars',
        'Option C': 'Mercury',
        'Option D': 'Venus',
        'Correct Answer': 'C',
        'Points': '2',
        'Time Limit (seconds)': '45'
      },
      {
        'Question Number': 'Q3',
        'Question Text': 'The Earth is round.',
        'Question Type': 'True/False',
        'Option A': 'True',
        'Option B': 'False',
        'Option C': '',
        'Option D': '',
        'Correct Answer': 'A',
        'Points': '1',
        'Time Limit (seconds)': '30'
      },
      {
        'Question Number': 'Q4',
        'Question Text': 'What is the capital of France?',
        'Question Type': 'Short Answer',
        'Option A': '',
        'Option B': '',
        'Option C': '',
        'Option D': '',
        'Correct Answer': 'Paris',
        'Points': '2',
        'Time Limit (seconds)': '60'
      },
      {
        'Question Number': 'Q5',
        'Question Text': 'Explain the importance of water in our daily life.',
        'Question Type': 'Essay',
        'Option A': '',
        'Option B': '',
        'Option C': '',
        'Option D': '',
        'Correct Answer': 'Open-ended response',
        'Points': '5',
        'Time Limit (seconds)': '300'
      }
    ];

    // Create workbook with multiple sheets
    const workbook = XLSX.utils.book_new();
    
    // Main questions sheet
    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    
    // Set column widths for better readability
    const columnWidths = [
      { wch: 15 }, // Question Number
      { wch: 40 }, // Question Text
      { wch: 15 }, // Question Type
      { wch: 15 }, // Option A
      { wch: 15 }, // Option B
      { wch: 15 }, // Option C
      { wch: 15 }, // Option D
      { wch: 15 }, // Correct Answer
      { wch: 10 }, // Points
      { wch: 20 }  // Time Limit
    ];
    worksheet['!cols'] = columnWidths;
    
    XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");

    // Instructions sheet
    const instructionsData = [
      { 'Column': 'Question Number', 'Description': 'Enter question number (Q1, Q2, Q3, etc.)', 'Required': 'Yes', 'Example': 'Q1' },
      { 'Column': 'Question Text', 'Description': 'Write your question here', 'Required': 'Yes', 'Example': 'What is 2 + 2?' },
      { 'Column': 'Question Type', 'Description': 'Choose from: Multiple Choice, True/False, Short Answer, Essay', 'Required': 'Yes', 'Example': 'Multiple Choice' },
      { 'Column': 'Option A', 'Description': 'First option (leave empty for non-MCQ questions)', 'Required': 'No', 'Example': '1' },
      { 'Column': 'Option B', 'Description': 'Second option (leave empty for non-MCQ questions)', 'Required': 'No', 'Example': '2' },
      { 'Column': 'Option C', 'Description': 'Third option (leave empty for non-MCQ questions)', 'Required': 'No', 'Example': '3' },
      { 'Column': 'Option D', 'Description': 'Fourth option (leave empty for non-MCQ questions)', 'Required': 'No', 'Example': '4' },
      { 'Column': 'Correct Answer', 'Description': 'For MCQ: A, B, C, or D. For others: write the answer', 'Required': 'Yes', 'Example': 'D' },
      { 'Column': 'Points', 'Description': 'Points for this question (1, 2, 5, etc.)', 'Required': 'Yes', 'Example': '1' },
      { 'Column': 'Time Limit (seconds)', 'Description': 'Time limit in seconds (30, 60, 300, etc.)', 'Required': 'No', 'Example': '60' }
    ];
    
    const instructionsSheet = XLSX.utils.json_to_sheet(instructionsData);
    instructionsSheet['!cols'] = [
      { wch: 20 }, // Column
      { wch: 50 }, // Description
      { wch: 10 }, // Required
      { wch: 20 }  // Example
    ];
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

    // Examples sheet
    const examplesData = [
      { 'Question Type': 'Multiple Choice', 'How to Fill': 'Fill all 4 options (A, B, C, D) and put the correct letter in Correct Answer column', 'Example': 'Options: A=1, B=2, C=3, D=4. Correct Answer: D' },
      { 'Question Type': 'True/False', 'How to Fill': 'Fill Option A with "True" and Option B with "False". Put A or B in Correct Answer', 'Example': 'Option A: True, Option B: False, Correct Answer: A' },
      { 'Question Type': 'Short Answer', 'How to Fill': 'Leave options empty. Write the correct answer in Correct Answer column', 'Example': 'Correct Answer: Paris' },
      { 'Question Type': 'Essay', 'How to Fill': 'Leave options empty. Write "Open-ended response" in Correct Answer', 'Example': 'Correct Answer: Open-ended response' }
    ];
    
    const examplesSheet = XLSX.utils.json_to_sheet(examplesData);
    examplesSheet['!cols'] = [
      { wch: 20 }, // Question Type
      { wch: 60 }, // How to Fill
      { wch: 40 }  // Example
    ];
    XLSX.utils.book_append_sheet(workbook, examplesSheet, "Examples");

    // Tips sheet
    const tipsData = [
      { 'Tip': '1', 'Description': 'Always start with Question Number (Q1, Q2, Q3...)', 'Important': 'Yes' },
      { 'Tip': '2', 'Description': 'For Multiple Choice: Fill all 4 options and use A, B, C, or D as correct answer', 'Important': 'Yes' },
      { 'Tip': '3', 'Description': 'For True/False: Use A for True, B for False', 'Important': 'Yes' },
      { 'Tip': '4', 'Description': 'For Short Answer: Write the exact answer students should type', 'Important': 'Yes' },
      { 'Tip': '5', 'Description': 'For Essay: Write "Open-ended response" as correct answer', 'Important': 'Yes' },
      { 'Tip': '6', 'Description': 'Points can be any number (1, 2, 5, 10, etc.)', 'Important': 'No' },
      { 'Tip': '7', 'Description': 'Time Limit is optional. Leave empty for no time limit', 'Important': 'No' },
      { 'Tip': '8', 'Description': 'Save your file as .xlsx format before uploading', 'Important': 'Yes' }
    ];
    
    const tipsSheet = XLSX.utils.json_to_sheet(tipsData);
    tipsSheet['!cols'] = [
      { wch: 5 },  // Tip
      { wch: 60 }, // Description
      { wch: 10 }  // Important
    ];
    XLSX.utils.book_append_sheet(workbook, tipsSheet, "Tips");

    XLSX.writeFile(workbook, "Easy-Question-Template.xlsx");
  };

  // Save or update quiz
  const saveQuiz = async () => {
    if (!quiz) return;
    setLoading(true);
    setError(null);
    try {
      // Map frontend quiz to backend exam schema
      const now = new Date();
      const defaultStart = quiz.startTime ? new Date(quiz.startTime) : now;
      const defaultEnd = quiz.endTime ? new Date(quiz.endTime) : new Date(now.getTime() + (quiz.timeLimit || 30) * 60000);
      const mappedQuiz = {
        title: quiz.title,
        description: quiz.description,
        duration: quiz.timeLimit || 30,
        passingScore: quiz.passingScore || 50,
        startTime: defaultStart,
        endTime: defaultEnd,
        isActive: quiz.isActive,
        requireWebcam: quiz.settings?.requireWebcam ?? false,
        preventTabSwitch: quiz.settings?.preventTabSwitch ?? false,
        preventCopyPaste: quiz.settings?.preventCopyPaste ?? false,
        randomizeQuestions: quiz.settings?.randomizeQuestions ?? false,
        timePerQuestion: false, // Not supported in UI yet
        maxAttempts: quiz.maxAttempts || 1,
        allowNavigation: true, // Not supported in UI yet
        instructions: quiz.instructions || [],
        questions: quiz.questions.map((q, idx) => ({
          type: q.type,
          question: q.question || q.questionText, // Always send 'question' field
          options: q.options || [],
          correctAnswer: typeof q.correctAnswer === 'string' ? q.correctAnswer : Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : '',
          points: q.points || 1,
          timeLimit: q.timeLimit || 60,
          required: q.required !== false,
          order: q.order || idx + 1
        }))
      };
      if (quizId && quizId !== 'new') {
        // Update existing quiz
        const res = await examsAPI.updateExam(quizId, mappedQuiz);
        if (res.success) {
          alert('Quiz updated successfully!');
          setQuiz({ ...quiz, ...res.data });
        } else {
          setError(res.error || 'Failed to update quiz.');
        }
      } else {
        // Create new quiz
        const res = await examsAPI.createExam(mappedQuiz);
        if (res.success) {
          alert('Quiz created successfully!');
          navigate(`/admin/quiz/${res.data._id || res.data.id}/edit`);
        } else {
          setError(res.error || 'Failed to create quiz.');
        }
      }
    } catch (err) {
      setError('Failed to save quiz.');
    } finally {
      setLoading(false);
    }
  };

  const publishQuiz = async () => {
    if (!quiz) return;
    setQuiz(prev => prev ? { ...prev, isActive: true } : prev);
    await saveQuiz();
  };

  const questionTypes = [
    { value: 'multiple-choice', label: 'Multiple Choice', icon: '○', description: 'Choose one correct answer' },
    { value: 'true-false', label: 'True/False', icon: '⊖', description: 'Simple true or false question' },
    { value: 'short-answer', label: 'Short Answer', icon: '▭', description: 'Brief text response' },
    { value: 'essay', label: 'Essay', icon: '▭▭', description: 'Long form written response' },
    { value: 'fill-blank', label: 'Fill in the Blank', icon: '▯▯', description: 'Complete the missing text' },
    { value: 'matching', label: 'Matching', icon: '⇄', description: 'Match items from two columns' },
    { value: 'file-upload', label: 'File Upload', icon: '📎', description: 'Upload a file as answer' }
  ];

  const getQuestionTypeIcon = (type: string) => {
    const questionType = questionTypes.find(qt => qt.value === type);
    return questionType?.icon || '?';
  };

  const getQuestionTypeLabel = (type: string) => {
    const questionType = questionTypes.find(qt => qt.value === type);
    return questionType?.label || 'Unknown';
  };

  // In the render, show loading/error states
  if (loading) return <div className="p-8 text-center text-lg">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!quiz) return null;

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Header */}
      <div className="bg-white border-b border-secondary-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin')}
                className="p-2 text-secondary-400 hover:text-secondary-600"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-secondary-900">
                  {quizId === 'new' ? 'Create New Quiz' : 'Edit Quiz'}
                </h1>
                <p className="text-sm text-secondary-600">
                  {quizId === 'new' ? 'Build your quiz from scratch' : 'Modify quiz settings and questions'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className="btn-secondary inline-flex items-center"
              >
                <EyeIcon className="h-4 w-4 mr-2" />
                Preview
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="btn-secondary inline-flex items-center"
              >
                <CogIcon className="h-4 w-4 mr-2" />
                Settings
              </button>
              <button
                onClick={saveQuiz}
                className="btn-secondary inline-flex items-center"
              >
                Save Draft
              </button>
              <button
                onClick={publishQuiz}
                className="btn-primary inline-flex items-center"
              >
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Publish Quiz
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full p-4 sm:p-6 lg:p-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Quiz Details */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-secondary-900">Quiz Details</h2>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    quiz.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {quiz.isActive ? 'Active' : 'Draft'}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    quiz.isPublic ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {quiz.isPublic ? 'Public' : 'Private'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Quiz Title *
                  </label>
                  <input
                    type="text"
                    value={quiz.title}
                    onChange={(e) => handleQuizChange('title', e.target.value)}
                    className="input-field"
                    placeholder="Enter quiz title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Category
                  </label>
                  <select
                    value={quiz.category}
                    onChange={(e) => handleQuizChange('category', e.target.value)}
                    className="input-field"
                  >
                    <option value="Programming">Programming</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Science">Science</option>
                    <option value="Language">Language</option>
                    <option value="Business">Business</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Difficulty Level
                  </label>
                  <select
                    value={quiz.difficulty}
                    onChange={(e) => handleQuizChange('difficulty', e.target.value)}
                    className="input-field"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Time Limit (minutes)
                  </label>
                  <input
                    type="number"
                    value={quiz.timeLimit}
                    onChange={(e) => handleQuizChange('timeLimit', parseInt(e.target.value))}
                    className="input-field"
                    min="1"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Description
                </label>
                <textarea
                  value={quiz.description}
                  onChange={(e) => handleQuizChange('description', e.target.value)}
                  className="input-field"
                  rows={3}
                  placeholder="Describe what this quiz covers..."
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  value={quiz.tags.join(', ')}
                  onChange={(e) => handleQuizChange('tags', e.target.value.split(',').map(tag => tag.trim()))}
                  className="input-field"
                  placeholder="Enter tags separated by commas"
                />
              </div>
            </div>

            {/* Questions Section */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-secondary-900">
                  Questions ({quiz.questions.length})
                </h2>
                <button
                  onClick={() => setActiveTab('add-question')}
                  className="btn-primary inline-flex items-center"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Question
                </button>
              </div>

              {activeTab === 'add-question' && (
                <div className="mb-6 p-4 border border-secondary-200 rounded-lg bg-secondary-50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-medium text-secondary-900">Add New Question</h3>
                    <button
                      onClick={() => setActiveTab('questions')}
                      className="text-secondary-400 hover:text-secondary-600"
                    >
                      <XCircleIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">
                        Question Type
                      </label>
                      <select
                        value={currentQuestion.type}
                        onChange={(e) => handleQuestionChange('type', e.target.value)}
                        className="input-field"
                      >
                        {questionTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.icon} {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">
                        Points
                      </label>
                      <input
                        type="number"
                        value={currentQuestion.points}
                        onChange={(e) => handleQuestionChange('points', parseInt(e.target.value))}
                        className="input-field"
                        min="1"
                      />
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={currentQuestion.required}
                          onChange={(e) => handleQuestionChange('required', e.target.checked)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                        />
                        <span className="ml-2 text-sm text-secondary-700">Required</span>
                      </label>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Question Text *
                    </label>
                    <textarea
                      value={currentQuestion.question}
                      onChange={(e) => handleQuestionChange('question', e.target.value)}
                      className="input-field"
                      rows={3}
                      placeholder="Enter your question..."
                    />
                  </div>

                  {currentQuestion.type === 'multiple-choice' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Options
                      </label>
                      {currentQuestion.options?.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2 mb-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...(currentQuestion.options || [])];
                              newOptions[index] = e.target.value;
                              handleQuestionChange('options', newOptions);
                            }}
                            className="input-field flex-1"
                            placeholder={`Option ${index + 1}`}
                          />
                          <input
                            type="radio"
                            name="correctAnswer"
                            value={option}
                            checked={currentQuestion.correctAnswer === option}
                            onChange={(e) => handleQuestionChange('correctAnswer', e.target.value)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300"
                          />
                          <button
                            onClick={() => {
                              const newOptions = currentQuestion.options?.filter((_, i) => i !== index);
                              handleQuestionChange('options', newOptions);
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const newOptions = [...(currentQuestion.options || []), ''];
                          handleQuestionChange('options', newOptions);
                        }}
                        className="text-sm text-primary-600 hover:text-primary-700"
                      >
                        + Add Option
                      </button>
                    </div>
                  )}

                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setActiveTab('questions')}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addQuestion}
                      className="btn-primary"
                    >
                      Add Question
                    </button>
                  </div>
                </div>
              )}

              {/* Bulk Upload Section */}
              <div className="card mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-secondary-900">📋 Bulk Upload Questions</h3>
                  <button
                    onClick={() => handleDownloadSampleFile()}
                    className="btn-primary text-sm px-4 py-2"
                  >
                    📥 Download Sample File
                  </button>
                </div>
                
                {/* Step-by-step Guide */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-blue-900 mb-2">📝 How to Create Your Question File:</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p><strong>Step 1:</strong> Download the sample file above</p>
                    <p><strong>Step 2:</strong> Open it in Excel or Google Sheets</p>
                    <p><strong>Step 3:</strong> Replace the sample questions with your own</p>
                    <p><strong>Step 4:</strong> Save as Excel (.xlsx) format</p>
                    <p><strong>Step 5:</strong> Upload your file below</p>
                  </div>
                </div>

                {/* File Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleBulkUpload}
                    disabled={bulkUploadLoading}
                    className="hidden"
                    id="bulk-upload-file"
                  />
                  <label htmlFor="bulk-upload-file" className="cursor-pointer">
                    <div className="text-gray-600">
                      {bulkUploadLoading ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                          <span>Uploading questions...</span>
                        </div>
                      ) : (
                        <>
                          <div className="text-4xl mb-2">📁</div>
                          <p className="text-lg font-medium text-gray-700 mb-1">Click to upload your Excel file</p>
                          <p className="text-sm text-gray-500">or drag and drop here</p>
                          <p className="text-xs text-gray-400 mt-2">Supports .xlsx and .xls files</p>
                        </>
                      )}
                    </div>
                  </label>
                </div>

                {/* Upload Results */}
                {bulkUploadError && (
                  <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-red-500 mr-2">❌</span>
                      <span>{bulkUploadError}</span>
                    </div>
                  </div>
                )}
                
                {bulkUploadResult && (
                  <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                    <div className="flex items-center mb-2">
                      <span className="text-green-500 mr-2">✅</span>
                      <span className="font-semibold">Successfully uploaded {bulkUploadResult.created} out of {bulkUploadResult.total} questions!</span>
                    </div>
                    {bulkUploadResult.errors && bulkUploadResult.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium mb-1">⚠️ Some questions had issues:</p>
                        <ul className="text-sm list-disc list-inside space-y-1">
                          {bulkUploadResult.errors.map((err: string, idx: number) => (
                            <li key={idx} className="text-yellow-700">{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Reference Guide */}
                <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">📋 Quick Reference - Excel Template Columns:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700 mb-2">Required Fields:</p>
                      <ul className="space-y-1 text-gray-600">
                        <li><code className="bg-gray-200 px-1 rounded">Question Number</code> - Q1, Q2, Q3...</li>
                        <li><code className="bg-gray-200 px-1 rounded">Question Text</code> - Your question</li>
                        <li><code className="bg-gray-200 px-1 rounded">Question Type</code> - Multiple Choice, True/False, etc.</li>
                        <li><code className="bg-gray-200 px-1 rounded">Correct Answer</code> - A, B, C, D or text</li>
                        <li><code className="bg-gray-200 px-1 rounded">Points</code> - Points for this question</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700 mb-2">Question Types:</p>
                      <ul className="space-y-1 text-gray-600">
                        <li><code className="bg-gray-200 px-1 rounded">Multiple Choice</code> - Fill A, B, C, D options</li>
                        <li><code className="bg-gray-200 px-1 rounded">True/False</code> - A=True, B=False</li>
                        <li><code className="bg-gray-200 px-1 rounded">Short Answer</code> - Write exact answer</li>
                        <li><code className="bg-gray-200 px-1 rounded">Essay</code> - Write "Open-ended response"</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>🎯 Pro Tip:</strong> Download the sample file above to see exactly how to fill each question type! The template includes 4 sheets: Questions, Instructions, Examples, and Tips.
                    </p>
                  </div>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-3">
                {quiz.questions.map((question, index) => (
                  <div key={question.id} className="border border-secondary-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-medium text-secondary-500">
                            Q{index + 1}
                          </span>
                          <span className="text-sm text-secondary-600">
                            {getQuestionTypeIcon(question.type)} {getQuestionTypeLabel(question.type)}
                          </span>
                          <span className="text-sm text-secondary-600">
                            • {question.points} points
                          </span>
                          {question.required && (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-secondary-900 mb-2">{question.question}</p>
                        {question.type === 'multiple-choice' && question.options && (
                          <div className="text-sm text-secondary-600">
                            {question.options.map((option, optIndex) => (
                              <div key={optIndex} className="flex items-center space-x-2">
                                <span className="w-4 h-4 rounded-full border border-secondary-300 flex items-center justify-center">
                                  {option === question.correctAnswer && (
                                    <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                                  )}
                                </span>
                                <span>{option}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => duplicateQuestion(question)}
                          className="p-1 text-secondary-400 hover:text-secondary-600"
                          title="Duplicate"
                        >
                          <DocumentDuplicateIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteQuestion(question.id)}
                          className="p-1 text-red-400 hover:text-red-600"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quiz Settings */}
            <div className="card">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">Quiz Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Passing Score (%)
                  </label>
                  <input
                    type="number"
                    value={quiz.passingScore}
                    onChange={(e) => handleQuizChange('passingScore', parseInt(e.target.value))}
                    className="input-field"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Max Attempts
                  </label>
                  <input
                    type="number"
                    value={quiz.maxAttempts}
                    onChange={(e) => handleQuizChange('maxAttempts', parseInt(e.target.value))}
                    className="input-field"
                    min="1"
                  />
                </div>
              </div>
            </div>

            {/* Proctoring Settings */}
            <div className="card">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">Proctoring</h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={quiz.settings.requireWebcam}
                    onChange={(e) => handleQuizChange('settings', {
                      ...quiz.settings,
                      requireWebcam: e.target.checked
                    })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                  />
                  <span className="ml-2 text-sm text-secondary-700">Require Webcam</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={quiz.settings.preventTabSwitch}
                    onChange={(e) => handleQuizChange('settings', {
                      ...quiz.settings,
                      preventTabSwitch: e.target.checked
                    })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                  />
                  <span className="ml-2 text-sm text-secondary-700">Prevent Tab Switching</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={quiz.settings.preventCopyPaste}
                    onChange={(e) => handleQuizChange('settings', {
                      ...quiz.settings,
                      preventCopyPaste: e.target.checked
                    })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                  />
                  <span className="ml-2 text-sm text-secondary-700">Prevent Copy/Paste</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={quiz.settings.randomizeQuestions}
                    onChange={(e) => handleQuizChange('settings', {
                      ...quiz.settings,
                      randomizeQuestions: e.target.checked
                    })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                  />
                  <span className="ml-2 text-sm text-secondary-700">Randomize Questions</span>
                </label>
              </div>
            </div>

            {/* Quiz Stats */}
            <div className="card">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">Quiz Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-secondary-600">Total Questions</span>
                  <span className="text-sm font-medium text-secondary-900">{quiz.questions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-secondary-600">Total Points</span>
                  <span className="text-sm font-medium text-secondary-900">
                    {quiz.questions.reduce((sum, q) => sum + q.points, 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-secondary-600">Time Limit</span>
                  <span className="text-sm font-medium text-secondary-900">{quiz.timeLimit} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-secondary-600">Difficulty</span>
                  <span className="text-sm font-medium text-secondary-900 capitalize">{quiz.difficulty}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizEditor; 