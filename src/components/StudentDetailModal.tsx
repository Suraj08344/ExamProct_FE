import React from 'react';
import { ExclamationTriangleIcon, InformationCircleIcon, UserCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ProctorEvent {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
}

interface Answer {
  questionId: string;
  questionText: string;
  questionType: string;
  answer: string | string[];
  correctAnswer: string | string[];
  isCorrect: boolean;
  points: number;
  maxPoints: number;
  timeSpent: number;
  options?: string[];
}

interface Exam {
  _id: string;
  title: string;
  description: string;
  duration: number;
  totalQuestions: number;
  maxScore: number;
  passingScore: number;
  allowReview?: boolean;
  showResults?: boolean;
}

interface Student {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface StudentResult {
  _id: string;
  studentId: Student;
  examId: Exam;
  totalScore: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  startTime: string;
  endTime: string;
  timeTaken: number;
  status: 'completed' | 'incomplete' | 'disqualified';
  proctorEvents: ProctorEvent[];
  answers: Answer[];
}

interface StudentDetailModalProps {
  open: boolean;
  onClose: () => void;
  student: StudentResult | null;
  getScoreColor: (percentage: number) => string;
  formatDate: (dateString: string) => string;
  formatDuration: (minutes: number) => string;
  formatTimeTaken: (seconds: number) => string;
  calcSecondsBetween: (start: string | Date, end: string | Date) => number;
  onReleaseResult?: (student: StudentResult) => Promise<void>;
}

const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  open,
  onClose,
  student,
  getScoreColor,
  formatDate,
  formatDuration,
  formatTimeTaken,
  calcSecondsBetween,
  onReleaseResult,
}) => {
  if (!open || !student) return null;

  // Defensive checks
  const name = student.studentId?.name || 'Unknown Student';
  const email = student.studentId?.email || 'No email';
  const avatar = student.studentId?.avatar;
  const examTitle = student.examId?.title || 'Unknown Exam';
  const examDate = student.endTime ? formatDate(student.endTime) : 'N/A';
  const percentage = typeof student.percentage === 'number' ? student.percentage : 0;
  const totalScore = typeof student.totalScore === 'number' ? student.totalScore : 0;
  const maxScore = typeof student.maxScore === 'number' ? student.maxScore : 0;
  const passed = student.passed;
  const passingScore = student.examId?.passingScore ?? 'N/A';
  const duration = student.examId?.duration ?? 0;
  const timeTaken = (student.startTime && student.endTime) ? formatTimeTaken(calcSecondsBetween(student.startTime, student.endTime)) : 'N/A';
  const proctorEvents = Array.isArray(student.proctorEvents) ? student.proctorEvents : [];
  const answers = Array.isArray(student.answers) ? student.answers : [];
  const allowReview = student.examId?.allowReview;
  const showResults = student.examId?.showResults;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl mx-2 sm:mx-0 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-2xl">
          <div className="flex items-center gap-4">
            {avatar ? (
              <img src={avatar} alt={name} className="w-12 h-12 rounded-full object-cover border-2 border-blue-300" />
            ) : (
              <UserCircleIcon className="w-12 h-12 text-blue-300" />
            )}
            <div>
              <div className="font-bold text-lg text-gray-900">{name}</div>
              <div className="text-sm text-gray-500">{email}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label="Close"
          >
            <XMarkIcon className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        {/* Content */}
        <div className="overflow-y-auto px-6 py-6 flex-1">
          {/* Exam Info */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="text-base font-semibold text-gray-700">{examTitle}</div>
              <div className="text-sm text-gray-400">{examDate}</div>
            </div>
            <div className="flex gap-4 mt-2 sm:mt-0">
              <div className="text-center">
                <div className={`text-xl font-bold ${getScoreColor(percentage)}`}>{percentage.toFixed(1)}%</div>
                <div className="text-xs text-gray-500">Score</div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-bold ${passed ? 'text-emerald-600' : 'text-rose-600'}`}>{passed ? 'Passed' : 'Failed'}</div>
                <div className="text-xs text-gray-500">Passing: {passingScore}%</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">{timeTaken}</div>
                <div className="text-xs text-gray-500">of {formatDuration(duration)} allowed</div>
              </div>
            </div>
          </div>
          {/* Release Result Button/Indicator */}
          <div className="mb-6 flex items-center gap-4">
            {allowReview === false && showResults === false ? (
              <button
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                onClick={async () => { if (onReleaseResult) await onReleaseResult(student); }}
              >
                Release Result
              </button>
            ) : (
              <span className="inline-block px-6 py-2 bg-green-100 text-green-800 rounded-lg font-semibold border border-green-300">Result Released</span>
            )}
          </div>

          {/* Suspicious Activities */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
              <span className="font-semibold text-gray-800">Suspicious Activities</span>
              <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{proctorEvents.length}</span>
            </div>
            {proctorEvents.length === 0 ? (
              <div className="text-sm text-emerald-600">No suspicious activities detected.</div>
            ) : (
              <ul className="space-y-2">
                {proctorEvents.map((event, idx) => (
                  <li key={idx} className={`flex items-start gap-3 p-3 rounded-lg border-l-4 ${event.severity === 'high' ? 'border-red-500 bg-red-50' : event.severity === 'medium' ? 'border-amber-400 bg-amber-50' : 'border-blue-400 bg-blue-50'}`}>
                    {event.severity === 'high' ? (
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mt-0.5" />
                    ) : event.severity === 'medium' ? (
                      <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 mt-0.5" />
                    ) : (
                      <InformationCircleIcon className="w-5 h-5 text-blue-400 mt-0.5" />
                    )}
                    <div>
                      <div className="font-semibold text-sm text-gray-800">{event.type}</div>
                      <div className="text-xs text-gray-600 mb-1">{event.description}</div>
                      <div className="text-xs text-gray-400">{formatDate(event.timestamp)} • <span className="capitalize">{event.severity} severity</span></div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Question Breakdown */}
          <div>
            <div className="font-semibold text-gray-800 mb-2">Question Breakdown</div>
            {answers.length === 0 ? (
              <div className="text-sm text-gray-500">No answers available.</div>
            ) : (
              <ul className="space-y-4">
                {answers.map((answer, idx) => (
                  <li key={idx} className={`rounded-xl p-4 border ${answer.isCorrect ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-gray-900">Q{idx + 1}: {answer.questionText || 'Question text not available'}</div>
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${answer.isCorrect ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'}`}>{answer.isCorrect ? 'Correct' : 'Incorrect'}</span>
                    </div>
                    {answer.options && answer.options.length > 0 && (
                      <ul className="flex flex-wrap gap-2 mb-1 mt-1">
                        {answer.options.map((opt: string, i: number) => {
                          const isSelected = Array.isArray(answer.answer) ? answer.answer.includes(opt) : answer.answer === opt;
                          const isCorrect = Array.isArray(answer.correctAnswer) ? answer.correctAnswer.includes(opt) : answer.correctAnswer === opt;
                          return (
                            <li
                              key={i}
                              className={`px-2 py-1 rounded text-xs font-medium border ${isCorrect ? 'bg-green-100 text-green-800 border-green-300' : 'border-gray-200'} ${isSelected ? 'ring-2 ring-blue-400 bg-blue-50 text-blue-800' : ''}`}
                            >
                              {String.fromCharCode(65 + i)}. {opt}
                              {isSelected && <span className="ml-1 text-blue-600">(Selected)</span>}
                              {isCorrect && <span className="ml-1 text-green-600">(Correct)</span>}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    <div className="text-xs text-gray-700 mb-0.5"><span className="font-semibold">Your Answer:</span> {Array.isArray(answer.answer) ? answer.answer.join(', ') : answer.answer || 'N/A'}</div>
                    <div className="text-xs text-gray-700 mb-0.5"><span className="font-semibold">Correct Answer:</span> {Array.isArray(answer.correctAnswer) ? answer.correctAnswer.join(', ') : answer.correctAnswer || 'N/A'}</div>
                    <div className="text-xs text-gray-700 mb-0.5">
                      <span className="font-medium text-gray-700">Points:</span> 
                      <span className="ml-1">
                        {answer.maxPoints > 0
                          ? `${answer.isCorrect ? answer.maxPoints : 0}/${answer.maxPoints}`
                          : '-'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 text-right">Type: {answer.questionType}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetailModal; 