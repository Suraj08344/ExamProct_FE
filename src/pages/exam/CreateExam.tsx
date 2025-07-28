import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { 
  PlusIcon, 
  TrashIcon, 
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { examsAPI } from '../../services/api';
import axios from 'axios';
import * as XLSX from 'xlsx';

interface Question {
  id: string;
  questionText: string;
  questionType: 'multiple-choice' | 'short-answer' | 'essay' | 'true-false' | 'multiple-correct';
  options?: string[];
  correctAnswer?: string | string[];
  points: number;
  timeLimit?: number;
  order: number;
}

const questionTypes = [
  { value: 'multiple-choice', label: 'Multiple Choice', icon: '📝' },
  { value: 'multiple-correct', label: 'Multiple Correct (Checkbox)', icon: '☑️' },
  { value: 'short-answer', label: 'Short Answer', icon: '✏️' },
  { value: 'essay', label: 'Essay', icon: '📄' },
  { value: 'true-false', label: 'True/False', icon: '✅' }
];

const CreateExam: React.FC = () => {
  const navigate = useNavigate();
  const { examId } = useParams<{ examId?: string }>();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: 60,
    passingScore: 70,
    maxAttempts: 1,
    startTime: '',
    endTime: '',
    allowReview: true,
    showResults: true,
    randomizeQuestions: false,
    timePerQuestion: false,
    requireWebcam: true,
    preventTabSwitch: true,
    preventCopyPaste: true,
    detectHeadMovement: false,
    requireFullscreen: false,
    autoTerminateOnSuspicious: false,
    allowNavigation: true
  });

  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    id: '',
    questionText: '',
    questionType: 'multiple-choice',
    options: ['', '', '', ''],
    correctAnswer: '',
    points: 1,
    timeLimit: 60,
    order: 1
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdExam, setCreatedExam] = useState<any>(null);
  const [allowNavigation, setAllowNavigation] = useState(true);
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false);
  const [bulkUploadResult, setBulkUploadResult] = useState<any>(null);
  const [bulkUploadError, setBulkUploadError] = useState<string | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const startEditQuestion = (question: Question) => {
    setEditingQuestionId(question.id);
    setEditingQuestion({ ...question });
  };

  const cancelEditQuestion = () => {
    setEditingQuestionId(null);
    setEditingQuestion(null);
  };

  const saveEditQuestion = () => {
    if (!editingQuestion) return;
    setQuestions(prev => prev.map(q => q.id === editingQuestion.id ? editingQuestion : q));
    setEditingQuestionId(null);
    setEditingQuestion(null);
  };

  useEffect(() => {
    if (examId) {
      // Editing: fetch exam and pre-fill
      (async () => {
        setLoading(true);
        setError('');
        try {
          const response = await examsAPI.getExam(examId);
          if (response.success && response.data) {
            const exam = response.data;
            setFormData({
              title: exam.title,
              description: exam.description,
              duration: exam.duration,
              passingScore: exam.passingScore,
              maxAttempts: exam.maxAttempts || 1,
              startTime: exam.startTime ? exam.startTime.split('T')[0] + 'T' + exam.startTime.split('T')[1].substring(0, 5) : '',
              endTime: exam.endTime ? exam.endTime.split('T')[0] + 'T' + exam.endTime.split('T')[1].substring(0, 5) : '',
              allowReview: exam.allowReview ?? true,
              showResults: exam.showResults ?? true,
              randomizeQuestions: exam.randomizeQuestions ?? false,
              timePerQuestion: exam.timePerQuestion ?? false,
              requireWebcam: exam.requireWebcam ?? true,
              preventTabSwitch: exam.preventTabSwitch ?? true,
              preventCopyPaste: exam.preventCopyPaste ?? true,
              detectHeadMovement: exam.detectHeadMovement ?? false,
              requireFullscreen: exam.requireFullscreen ?? false,
              autoTerminateOnSuspicious: exam.autoTerminateOnSuspicious ?? false,
              allowNavigation: exam.allowNavigation ?? true
            });
            setQuestions((exam.questions || []).map((q: any, idx: number) => ({
              id: q._id || q.id || String(idx + 1),
              questionText: q.questionText || q.question,
              questionType: q.questionType || q.type,
              options: q.options || [],
              correctAnswer: q.correctAnswer,
              points: q.points,
              timeLimit: q.timeLimit || 60,
              order: q.order || idx + 1
            })));
          } else {
            setError('Failed to load exam for editing');
          }
        } catch (err) {
          setError('Failed to load exam for editing');
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [examId]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleQuestionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setCurrentQuestion(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleOptionChange = (index: number, value: string) => {
    setCurrentQuestion(prev => ({
      ...prev,
      options: prev.options?.map((option, i) => i === index ? value : option)
    }));
  };

  const addOption = () => {
    setCurrentQuestion(prev => ({
      ...prev,
      options: [...(prev.options || []), '']
    }));
  };

  const removeOption = (index: number) => {
    setCurrentQuestion(prev => ({
      ...prev,
      options: prev.options?.filter((_, i) => i !== index)
    }));
  };

  const addQuestion = () => {
    if (currentQuestion.questionText.trim()) {
      const newQuestion: Question = {
        ...currentQuestion,
        id: Date.now().toString(),
        order: questions.length + 1
      };
      setQuestions(prev => [...prev, newQuestion]);
      setCurrentQuestion({
        id: '',
        questionText: '',
        questionType: 'multiple-choice',
        options: ['', '', '', ''],
        correctAnswer: '',
        points: 1,
        timeLimit: 60,
        order: questions.length + 2
      });
    }
  };

  const removeQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setBulkUploadLoading(true);
    setBulkUploadResult(null);
    setBulkUploadError(null);
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    if (examId) formData.append('examId', examId);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/questions/bulk-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
      });
      setBulkUploadResult(res.data);
      if (res.data.success && res.data.rows && res.data.rows.length > 0) {
        if (examId) {
          // If editing, reload from backend
          const response = await examsAPI.getExam(examId);
          if (response.success && response.data) {
            setQuestions((response.data.questions || []).map((q: any, idx: number) => ({
              id: q._id || q.id || String(idx + 1),
              questionText: q.questionText || q.question,
              questionType: q.questionType || q.type,
              options: q.options || [],
              correctAnswer: q.correctAnswer,
              points: q.points,
              timeLimit: q.timeLimit || 60,
              order: q.order || idx + 1
            })));
          }
        } else {
          // For new exam, merge uploaded questions into local state
          setQuestions(prev => ([...prev, ...res.data.rows.map((row: any, idx: number) => ({
            id: Date.now().toString() + idx,
            questionText: row.question,
            questionType: row.type,
            options: row.options || [],
            correctAnswer: row.correctAnswer,
            points: Number(row.points),
            timeLimit: row.timeLimit ? Number(row.timeLimit) : 60,
            order: Number(row.order)
          }))]));
        }
      }
    } catch (err: any) {
      setBulkUploadError(err.response?.data?.error || 'Bulk upload failed');
    } finally {
      setBulkUploadLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (questions.length === 0) {
      setError('Please add at least one question');
      return;
    }

    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (!formData.startTime || !formData.endTime) {
      setError('Please set start and end times');
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      
      if (!question.questionText.trim()) {
        setError(`Question ${i + 1}: Question text is required`);
        return;
      }
      
      if (question.questionType === 'multiple-choice') {
        if (!question.options || question.options.length < 2) {
          setError(`Question ${i + 1}: Multiple choice questions need at least 2 options`);
          return;
        }
        const correctAnswer = Array.isArray(question.correctAnswer) 
          ? question.correctAnswer[0] 
          : question.correctAnswer;
        if (!correctAnswer || !question.options.includes(correctAnswer)) {
          setError(`Question ${i + 1}: Please select a correct answer from the options`);
          return;
        }
      }
      
      if (question.questionType === 'true-false' && !question.correctAnswer) {
        setError(`Question ${i + 1}: Please select True or False as the correct answer`);
        return;
      }
      
      if ((question.questionType === 'short-answer' || question.questionType === 'essay')) {
        const correctAnswer = Array.isArray(question.correctAnswer) 
          ? question.correctAnswer[0] 
          : question.correctAnswer;
        if (!correctAnswer?.trim()) {
          setError(`Question ${i + 1}: Please provide ${question.questionType === 'short-answer' ? 'an expected answer' : 'evaluation criteria'}`);
          return;
        }
      }
      
      if (question.points <= 0) {
        setError(`Question ${i + 1}: Points must be greater than 0`);
        return;
      }
    }

    setLoading(true);
    
    try {
      // Prepare exam data
      // Always reassign sequential order to all questions before submit
      const examPayload = {
        ...formData,
        questions: questions.map((q, idx) => ({
          ...q,
          question: q.questionText, // Ensure backend gets 'question' field
          order: idx + 1
        }))
      };
      let response;
      if (examId) {
        // Update existing exam
        response = await examsAPI.updateExam(examId, examPayload);
      } else {
        // Create new exam
        response = await examsAPI.createExam(examPayload);
      }
      if (response.success) {
        setShowSuccessModal(true);
        setCreatedExam(response.data);
      } else {
        setError('Failed to save exam');
      }
    } catch (err) {
      setError('Failed to save exam');
    } finally {
      setLoading(false);
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

  const renderQuestionForm = () => {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-secondary-900 mb-4">Add Question</h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-secondary-700">Question Type</label>
              <select
                name="questionType"
                value={currentQuestion.questionType}
                onChange={handleQuestionChange}
                className="input-field mt-1 w-full max-w-sm appearance-none"
              >
                {questionTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-secondary-700">Points</label>
              <input
                type="number"
                name="points"
                value={currentQuestion.points}
                onChange={handleQuestionChange}
                className="input-field mt-1 w-full"
                min="1"
                max="100"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-secondary-700">Time Limit (seconds)</label>
              <input
                type="number"
                name="timeLimit"
                min={10}
                max={600}
                value={currentQuestion.timeLimit || 60}
                onChange={e => setCurrentQuestion(prev => ({ ...prev, timeLimit: Number(e.target.value) }))}
                className="input-field mt-1 w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700">Question Text</label>
            <textarea
              name="questionText"
              value={currentQuestion.questionText}
              onChange={handleQuestionChange}
              className="input-field mt-1 w-full"
              rows={3}
              placeholder="Enter your question here..."
            />
          </div>

          {currentQuestion.questionType === 'multiple-choice' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-secondary-700">Options</label>
                <button
                  type="button"
                  onClick={addOption}
                  className="btn-secondary text-sm"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Option
                </button>
              </div>
              {currentQuestion.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    className="input-field flex-1"
                    placeholder={`Option ${index + 1}`}
                  />
                  <input
                    type="radio"
                    name="correctAnswer"
                    value={option}
                    checked={currentQuestion.correctAnswer === option}
                    onChange={handleQuestionChange}
                    className="h-4 w-4 text-primary-600"
                  />
                  <span className="text-sm text-secondary-600">Correct</span>
                  {currentQuestion.options!.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {currentQuestion.questionType === 'multiple-correct' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-secondary-700">Options</label>
                <button
                  type="button"
                  onClick={addOption}
                  className="btn-secondary text-sm"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Option
                </button>
              </div>
              {currentQuestion.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    className="input-field flex-1"
                    placeholder={`Option ${index + 1}`}
                  />
                  <input
                    type="checkbox"
                    checked={Array.isArray(currentQuestion.correctAnswer) && currentQuestion.correctAnswer.includes(option)}
                    onChange={e => {
                      let newCorrect = Array.isArray(currentQuestion.correctAnswer) ? [...currentQuestion.correctAnswer] : [];
                      if (e.target.checked) {
                        newCorrect.push(option);
                      } else {
                        newCorrect = newCorrect.filter(ans => ans !== option);
                      }
                      setCurrentQuestion(q => ({ ...q, correctAnswer: newCorrect }));
                    }}
                    className="h-4 w-4 text-primary-600"
                  />
                  <span className="text-sm text-secondary-600">Correct</span>
                  {currentQuestion.options!.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {currentQuestion.questionType === 'true-false' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-secondary-700">Correct Answer</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="correctAnswer"
                    value="true"
                    checked={currentQuestion.correctAnswer === 'true'}
                    onChange={handleQuestionChange}
                    className="h-4 w-4 text-primary-600"
                  />
                  <span className="ml-2">True</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="correctAnswer"
                    value="false"
                    checked={currentQuestion.correctAnswer === 'false'}
                    onChange={handleQuestionChange}
                    className="h-4 w-4 text-primary-600"
                  />
                  <span className="ml-2">False</span>
                </label>
              </div>
            </div>
          )}

          {(currentQuestion.questionType === 'short-answer' || currentQuestion.questionType === 'essay') && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-secondary-700">
                {currentQuestion.questionType === 'short-answer' ? 'Expected Answer' : 'Evaluation Criteria'}
              </label>
              <textarea
                name="correctAnswer"
                value={currentQuestion.correctAnswer || ''}
                onChange={handleQuestionChange}
                className="input-field mt-1 w-full"
                rows={3}
                placeholder={
                  currentQuestion.questionType === 'short-answer' 
                    ? 'Enter the expected answer or key points...' 
                    : 'Enter evaluation criteria or rubric for grading...'
                }
              />
              <p className="text-sm text-secondary-500">
                {currentQuestion.questionType === 'short-answer' 
                  ? 'This will be used for automatic grading if possible, or as a reference for manual grading.'
                  : 'This will be used as a rubric for manual evaluation of the essay.'
                }
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={addQuestion}
              className="btn-primary"
              disabled={!currentQuestion.questionText.trim()}
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Question
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8 px-2 sm:px-6 lg:px-12 mb-16">
      <div className="max-w-5xl mx-auto">
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-8 mb-8 shadow-xl text-white">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-bold text-white drop-shadow-lg mb-2">{examId ? 'Edit Test' : 'Create New Test'}</h1>
            <p className="text-blue-100 text-lg">Design and configure your exam with questions and settings</p>
          </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Progress Steps */}
        <div className="flex items-center space-x-4 mb-8">
          <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-slate-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              currentStep >= 1 ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
          }`}>
            1
          </div>
          <span className="ml-2 text-sm font-medium">Basic Info</span>
        </div>
          <div className="flex-1 h-0.5 bg-slate-200"></div>
          <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-slate-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              currentStep >= 2 ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
          }`}>
            2
          </div>
          <span className="ml-2 text-sm font-medium">Questions</span>
        </div>
          <div className="flex-1 h-0.5 bg-slate-200"></div>
          <div className={`flex items-center ${currentStep >= 3 ? 'text-blue-600' : 'text-slate-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              currentStep >= 3 ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
          }`}>
            3
          </div>
          <span className="ml-2 text-sm font-medium">Settings</span>
        </div>
      </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="card">
            <h2 className="text-xl font-semibold text-secondary-900 mb-4">Test Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700">Test Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleFormChange}
                  className="input-field mt-1 w-full"
                  placeholder="Enter test title..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700">Duration (minutes)</label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleFormChange}
                  className="input-field mt-1 w-full"
                  min="1"
                  max="480"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-secondary-700">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  className="input-field mt-1 w-full"
                  rows={3}
                  placeholder="Enter test description..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700">Start Time</label>
                <input
                  type="datetime-local"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleFormChange}
                  className="input-field mt-1 w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700">End Time</label>
                <input
                  type="datetime-local"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleFormChange}
                  className="input-field mt-1 w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700">Passing Score (%)</label>
                <input
                  type="number"
                  name="passingScore"
                  value={formData.passingScore}
                  onChange={handleFormChange}
                  className="input-field mt-1 w-full"
                  min="0"
                  max="100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700">Max Attempts</label>
                <input
                  type="number"
                  name="maxAttempts"
                  value={formData.maxAttempts}
                  onChange={handleFormChange}
                  className="input-field mt-1 w-full"
                  min="1"
                  max="10"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="btn-primary"
                disabled={!formData.title || !formData.description}
              >
                Next: Add Questions
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Questions */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {renderQuestionForm()}

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
            {questions.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold text-secondary-900 mb-4">Added Questions ({questions.length})</h3>
                <div className="space-y-4">
                  {questions.map((question, index) => (
                        <div key={question.id} className="border border-slate-200 rounded-lg p-4">
                          {editingQuestionId === question.id ? (
                            <div>
                              {/* Inline edit form for the question */}
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="text-sm font-medium text-secondary-600">Q{index + 1} (Editing)</span>
                                <span className="text-xs bg-slate-100 text-secondary-600 px-2 py-1 rounded">
                                  {questionTypes.find(t => t.value === editingQuestion?.questionType)?.label}
                                </span>
                                <input
                                  type="number"
                                  value={editingQuestion?.points || 1}
                                  min={1}
                                  max={100}
                                  onChange={e => setEditingQuestion(q => q ? { ...q, points: Number(e.target.value) } : q)}
                                  className="input-field w-20 ml-2"
                                />
                                <span className="text-xs text-primary-600">pts</span>
                              </div>
                              <input
                                type="text"
                                value={editingQuestion?.questionText || ''}
                                onChange={e => setEditingQuestion(q => q ? { ...q, questionText: e.target.value } : q)}
                                className="input-field w-full mb-2"
                                placeholder="Edit question text"
                              />
                              {/* Edit options for MCQ */}
                              {editingQuestion?.questionType === 'multiple-choice' && (
                                <div className="space-y-2 mb-2">
                                  {editingQuestion.options?.map((opt, i) => (
                                    <div key={i} className="flex items-center space-x-2">
                                      <input
                                        type="text"
                                        value={opt}
                                        onChange={e => setEditingQuestion(q => {
                                          if (!q) return q;
                                          const newOpts = [...(q.options || [])];
                                          newOpts[i] = e.target.value;
                                          return { ...q, options: newOpts };
                                        })}
                                        className="input-field flex-1"
                                        placeholder={`Option ${i + 1}`}
                                      />
                                      <input
                                        type="radio"
                                        name={`edit-correct-${question.id}`}
                                        checked={editingQuestion.correctAnswer === opt}
                                        onChange={() => setEditingQuestion(q => q ? { ...q, correctAnswer: opt } : q)}
                                        className="h-4 w-4 text-primary-600"
                                      />
                                      <span className="text-sm text-secondary-600">Correct</span>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => setEditingQuestion(q => q ? { ...q, options: [...(q.options || []), ''] } : q)}
                                    className="btn-secondary text-xs mt-1"
                                  >+ Add Option</button>
                                </div>
                              )}
                              {/* Edit correct answer for true/false */}
                              {editingQuestion?.questionType === 'true-false' && (
                                <div className="flex space-x-4 mb-2">
                                  <label className="flex items-center">
                                    <input
                                      type="radio"
                                      name={`edit-correct-tf-${question.id}`}
                                      checked={editingQuestion.correctAnswer === 'true'}
                                      onChange={() => setEditingQuestion(q => q ? { ...q, correctAnswer: 'true' } : q)}
                                      className="h-4 w-4 text-primary-600"
                                    />
                                    <span className="ml-2">True</span>
                                  </label>
                                  <label className="flex items-center">
                                    <input
                                      type="radio"
                                      name={`edit-correct-tf-${question.id}`}
                                      checked={editingQuestion.correctAnswer === 'false'}
                                      onChange={() => setEditingQuestion(q => q ? { ...q, correctAnswer: 'false' } : q)}
                                      className="h-4 w-4 text-primary-600"
                                    />
                                    <span className="ml-2">False</span>
                                  </label>
                                </div>
                              )}
                              {/* Edit correct answer for short-answer/essay */}
                              {(editingQuestion?.questionType === 'short-answer' || editingQuestion?.questionType === 'essay') && (
                                <input
                                  type="text"
                                  value={editingQuestion.correctAnswer || ''}
                                  onChange={e => setEditingQuestion(q => q ? { ...q, correctAnswer: e.target.value } : q)}
                                  className="input-field w-full mb-2"
                                  placeholder={editingQuestion.questionType === 'short-answer' ? 'Expected answer' : 'Evaluation criteria'}
                                />
                              )}
                              {editingQuestion?.questionType === 'multiple-correct' && (
                                <div className="space-y-2 mb-2">
                                  {editingQuestion.options?.map((opt, i) => (
                                    <div key={i} className="flex items-center space-x-2">
                                      <input
                                        type="text"
                                        value={opt}
                                        onChange={e => setEditingQuestion(q => {
                                          if (!q) return q;
                                          const newOpts = [...(q.options || [])];
                                          newOpts[i] = e.target.value;
                                          return { ...q, options: newOpts };
                                        })}
                                        className="input-field flex-1"
                                        placeholder={`Option ${i + 1}`}
                                      />
                                      <input
                                        type="checkbox"
                                        checked={Array.isArray(editingQuestion.correctAnswer) && editingQuestion.correctAnswer.includes(opt)}
                                        onChange={e => setEditingQuestion(q => {
                                          if (!q) return q;
                                          let newCorrect = Array.isArray(q.correctAnswer) ? [...q.correctAnswer] : [];
                                          if (e.target.checked) {
                                            newCorrect.push(opt);
                                          } else {
                                            newCorrect = newCorrect.filter(ans => ans !== opt);
                                          }
                                          return { ...q, correctAnswer: newCorrect };
                                        })}
                                        className="h-4 w-4 text-primary-600"
                                      />
                                      <span className="text-sm text-secondary-600">Correct</span>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => setEditingQuestion(q => q ? { ...q, options: [...(q.options || []), ''] } : q)}
                                    className="btn-secondary text-xs mt-1"
                                  >+ Add Option</button>
                                </div>
                              )}
                              <div className="flex space-x-2 mt-2">
                                <button type="button" className="btn-primary" onClick={saveEditQuestion}>Save</button>
                                <button type="button" className="btn-secondary" onClick={cancelEditQuestion}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm font-medium text-secondary-600">
                              Q{index + 1}
                            </span>
                                  <span className="text-xs bg-slate-100 text-secondary-600 px-2 py-1 rounded">
                              {questionTypes.find(t => t.value === question.questionType)?.label}
                            </span>
                            <span className="text-xs bg-primary-100 text-primary-600 px-2 py-1 rounded">
                              {question.points} pts
                            </span>
                          </div>
                          <p className="text-secondary-900">{question.questionText}</p>
                          {question.questionType === 'multiple-choice' && question.options && (
                            <div className="mt-2 space-y-1">
                              {question.options.map((option, i) => (
                                <div key={i} className="text-sm text-secondary-600">
                                  {String.fromCharCode(65 + i)}. {option}
                                  {option === question.correctAnswer && (
                                    <span className="ml-2 text-green-600 font-medium">✓ Correct</span>
                                  )}
                                </div>
                              ))}
                            </div>
                                )}
                                {question.questionType === 'multiple-correct' && question.options && (
                                  <div className="mt-2 space-y-1">
                                    {question.options.map((option, i) => (
                                      <div key={i} className="text-sm text-secondary-600">
                                        {String.fromCharCode(65 + i)}. {option}
                                        {Array.isArray(question.correctAnswer) && question.correctAnswer.includes(option) && (
                                          <span className="ml-2 text-green-600 font-medium">✓ Correct</span>
                          )}
                        </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col items-end space-y-2 ml-4">
                                <button
                                  type="button"
                                  onClick={() => startEditQuestion(question)}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  Edit
                                </button>
                        <button
                          type="button"
                          onClick={() => removeQuestion(question.id)}
                                  className="text-red-600 hover:text-red-700"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                            </div>
                          )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="btn-secondary"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="btn-primary"
                disabled={questions.length === 0}
              >
                Next: Settings
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Settings */}
        {currentStep === 3 && (
          <div className="card">
            <h2 className="text-xl font-semibold text-secondary-900 mb-4">Test Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <label className="flex items-center space-x-2">
                <input type="checkbox" name="allowReview" checked={formData.allowReview} onChange={handleFormChange} />
                <span>Allow students to review answers</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" name="showResults" checked={formData.showResults} onChange={handleFormChange} />
                <span>Show results immediately after submission</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" name="randomizeQuestions" checked={formData.randomizeQuestions} onChange={handleFormChange} />
                <span>Randomize question order</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" name="timePerQuestion" checked={formData.timePerQuestion} onChange={handleFormChange} />
                <span>Set time limit per question</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" name="allowNavigation" checked={formData.allowNavigation} onChange={handleFormChange} />
                <span>Allow question navigation</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" name="requireWebcam" checked={formData.requireWebcam} onChange={handleFormChange} />
                <span>Require webcam access</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" name="preventTabSwitch" checked={formData.preventTabSwitch} onChange={handleFormChange} />
                <span>Prevent tab switching</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" name="preventCopyPaste" checked={formData.preventCopyPaste} onChange={handleFormChange} />
                <span>Prevent copy/paste</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" name="detectHeadMovement" checked={formData.detectHeadMovement} onChange={handleFormChange} />
                <span>Detect head movement via webcam (AI)</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" name="requireFullscreen" checked={formData.requireFullscreen} onChange={handleFormChange} />
                <span>Enable fullscreen mode</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" name="autoTerminateOnSuspicious" checked={formData.autoTerminateOnSuspicious} onChange={handleFormChange} />
                <span>Auto-terminate exam on suspicious activity</span>
              </label>
            </div>

                <div className="border-t border-slate-200 pt-4">
              <h3 className="text-lg font-medium text-secondary-900 mb-3">Proctoring Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="requireWebcam"
                    checked={formData.requireWebcam}
                    onChange={handleFormChange}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 rounded"
                  />
                  <span className="ml-2 text-sm text-secondary-700">Require webcam</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="preventTabSwitch"
                    checked={formData.preventTabSwitch}
                    onChange={handleFormChange}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 rounded"
                  />
                  <span className="ml-2 text-sm text-secondary-700">Prevent tab switching</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="preventCopyPaste"
                    checked={formData.preventCopyPaste}
                    onChange={handleFormChange}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 rounded"
                  />
                  <span className="ml-2 text-sm text-secondary-700">Prevent copy/paste</span>
                </label>
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="btn-secondary"
              >
                Back
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                className="btn-primary"
                disabled={questions.length === 0 || loading}
              >
                {loading ? 'Creating...' : 'Create Test'}
              </button>
            </div>
          </div>
        )}
      </form>
        </div>

      {/* Success Modal */}
      {showSuccessModal && createdExam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <DocumentTextIcon className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Test Created Successfully!</h3>
              <p className="text-sm text-gray-600 mb-6">
                Your test "{createdExam.title}" has been created with {questions.length} questions.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    navigate('/dashboard/exams');
                  }}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  View All Tests
                </button>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setCurrentStep(1);
                    setFormData({
                      title: '',
                      description: '',
                      duration: 60,
                      passingScore: 70,
                      maxAttempts: 1,
                      startTime: '',
                      endTime: '',
                      allowReview: true,
                      showResults: true,
                      randomizeQuestions: false,
                      timePerQuestion: false,
                      requireWebcam: true,
                      preventTabSwitch: true,
                      preventCopyPaste: true,
                      detectHeadMovement: false,
                      requireFullscreen: false,
                      autoTerminateOnSuspicious: false,
                      allowNavigation: true
                    });
                    setQuestions([]);
                    setCurrentQuestion({
                      id: '',
                      questionText: '',
                      questionType: 'multiple-choice',
                      options: ['', '', '', ''],
                      correctAnswer: '',
                      points: 1,
                      timeLimit: 60,
                      order: 1
                    });
                    setAllowNavigation(true);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Create Another
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

export default CreateExam;