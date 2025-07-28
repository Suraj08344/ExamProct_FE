import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/outline';

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
  questions: number;
  totalPoints: number;
  attempts: number;
  averageScore: number;
  completionRate: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

const QuizList: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedQuizzes, setSelectedQuizzes] = useState<string[]>([]);

  // Mock quiz data
  const quizzes: Quiz[] = [
    {
      id: '1',
      title: 'JavaScript Fundamentals Quiz',
      description: 'Test your knowledge of JavaScript basics including variables, functions, and DOM manipulation.',
      category: 'Programming',
      difficulty: 'intermediate',
      timeLimit: 45,
      passingScore: 70,
      maxAttempts: 3,
      isPublic: true,
      isActive: true,
      questions: 15,
      totalPoints: 150,
      attempts: 234,
      averageScore: 78.5,
      completionRate: 92.3,
      tags: ['javascript', 'programming', 'basics'],
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z'
    },
    {
      id: '2',
      title: 'Advanced Mathematics',
      description: 'Comprehensive test covering calculus, linear algebra, and statistics.',
      category: 'Mathematics',
      difficulty: 'advanced',
      timeLimit: 90,
      passingScore: 80,
      maxAttempts: 2,
      isPublic: true,
      isActive: false,
      questions: 25,
      totalPoints: 250,
      attempts: 156,
      averageScore: 72.1,
      completionRate: 88.7,
      tags: ['mathematics', 'calculus', 'algebra'],
      createdAt: '2024-01-10T14:30:00Z',
      updatedAt: '2024-01-12T09:15:00Z'
    },
    {
      id: '3',
      title: 'Web Development Basics',
      description: 'Introduction to HTML, CSS, and basic web development concepts.',
      category: 'Programming',
      difficulty: 'beginner',
      timeLimit: 30,
      passingScore: 60,
      maxAttempts: 5,
      isPublic: true,
      isActive: true,
      questions: 10,
      totalPoints: 100,
      attempts: 445,
      averageScore: 85.2,
      completionRate: 95.1,
      tags: ['web-development', 'html', 'css'],
      createdAt: '2024-01-08T11:20:00Z',
      updatedAt: '2024-01-14T16:45:00Z'
    }
  ];

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quiz.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quiz.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || 
                         (filter === 'active' && quiz.isActive) ||
                         (filter === 'inactive' && !quiz.isActive) ||
                         quiz.difficulty === filter ||
                         quiz.category.toLowerCase() === filter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const handleSelectQuiz = (quizId: string) => {
    setSelectedQuizzes(prev => 
      prev.includes(quizId) 
        ? prev.filter(id => id !== quizId)
        : [...prev, quizId]
    );
  };



  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-secondary-100 text-secondary-800';
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const duplicateQuiz = (quiz: Quiz) => {
    // In a real app, this would create a copy in the backend
    console.log('Duplicating quiz:', quiz.id);
    alert('Quiz duplicated successfully!');
  };

  const deleteQuiz = (quizId: string) => {
    if (window.confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      console.log('Deleting quiz:', quizId);
      alert('Quiz deleted successfully!');
    }
  };

  const toggleQuizStatus = (quiz: Quiz) => {
    console.log('Toggling quiz status:', quiz.id);
    alert(`Quiz ${quiz.isActive ? 'deactivated' : 'activated'} successfully!`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900">Quiz Management</h1>
          <p className="text-secondary-600 mt-2">
            Create, edit, and manage your quizzes and assessments.
          </p>
        </div>
        <div className="flex space-x-2 mt-4 sm:mt-0">
          <button className="btn-secondary inline-flex items-center">
            <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
            Import Quiz
          </button>
          <button 
            onClick={() => navigate('/admin/quiz/new')}
            className="btn-primary inline-flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Quiz
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedQuizzes.length > 0 && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedQuizzes.length} quiz{selectedQuizzes.length !== 1 ? 'zes' : ''} selected
              </span>
              <div className="flex space-x-2">
                <button className="text-sm text-blue-600 hover:text-blue-700">
                  Activate
                </button>
                <button className="text-sm text-blue-600 hover:text-blue-700">
                  Deactivate
                </button>
                <button className="text-sm text-red-600 hover:text-red-700">
                  Delete
                </button>
              </div>
            </div>
            <button
              onClick={() => setSelectedQuizzes([])}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" />
            <input
              type="text"
              placeholder="Search quizzes by title, description, or category..."
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
              <option value="all">All Quizzes</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="Programming">Programming</option>
              <option value="Mathematics">Mathematics</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quizzes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredQuizzes.map((quiz) => (
          <div key={quiz.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="checkbox"
                    checked={selectedQuizzes.includes(quiz.id)}
                    onChange={() => handleSelectQuiz(quiz.id)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                  />
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(quiz.isActive)}`}>
                    {quiz.isActive ? 'Active' : 'Draft'}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(quiz.difficulty)}`}>
                    {quiz.difficulty}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-secondary-900 mb-1">
                  {quiz.title}
                </h3>
                <p className="text-sm text-secondary-600 mb-3 line-clamp-2">
                  {quiz.description}
                </p>
              </div>
            </div>

            {/* Quiz Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="text-center p-2 bg-secondary-50 rounded">
                <div className="text-sm font-medium text-secondary-900">{quiz.questions}</div>
                <div className="text-xs text-secondary-600">Questions</div>
              </div>
              <div className="text-center p-2 bg-secondary-50 rounded">
                <div className="text-sm font-medium text-secondary-900">{quiz.timeLimit}m</div>
                <div className="text-xs text-secondary-600">Duration</div>
              </div>
              <div className="text-center p-2 bg-secondary-50 rounded">
                <div className="text-sm font-medium text-secondary-900">{quiz.attempts}</div>
                <div className="text-xs text-secondary-600">Attempts</div>
              </div>
              <div className="text-center p-2 bg-secondary-50 rounded">
                <div className="text-sm font-medium text-secondary-900">{quiz.averageScore}%</div>
                <div className="text-xs text-secondary-600">Avg Score</div>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-4">
              {quiz.tags.slice(0, 3).map((tag, index) => (
                <span key={index} className="px-2 py-1 text-xs bg-primary-100 text-primary-800 rounded">
                  {tag}
                </span>
              ))}
              {quiz.tags.length > 3 && (
                <span className="px-2 py-1 text-xs bg-secondary-100 text-secondary-600 rounded">
                  +{quiz.tags.length - 3}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-secondary-200">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => navigate(`/admin/quiz/${quiz.id}/edit`)}
                  className="p-1 text-secondary-400 hover:text-secondary-600"
                  title="Edit"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => duplicateQuiz(quiz)}
                  className="p-1 text-secondary-400 hover:text-secondary-600"
                  title="Duplicate"
                >
                  <DocumentDuplicateIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => toggleQuizStatus(quiz)}
                  className="p-1 text-secondary-400 hover:text-secondary-600"
                  title={quiz.isActive ? 'Deactivate' : 'Activate'}
                >
                  {quiz.isActive ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => deleteQuiz(quiz.id)}
                  className="p-1 text-red-400 hover:text-red-600"
                  title="Delete"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="text-xs text-secondary-500">
                Updated {formatDate(quiz.updatedAt)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredQuizzes.length === 0 && (
        <div className="text-center py-12">
          <DocumentDuplicateIcon className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-secondary-900 mb-2">No quizzes found</h3>
          <p className="text-secondary-600">
            {searchTerm || filter !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Create your first quiz to get started.'
            }
          </p>
          {!searchTerm && filter === 'all' && (
            <button
              onClick={() => navigate('/admin/quiz/new')}
              className="btn-primary mt-4 inline-flex items-center"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Your First Quiz
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default QuizList; 