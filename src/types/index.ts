export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'instructor' | 'admin' | 'teacher' | 'university';
  avatar?: string;
  enrolledClassrooms?: number;
  // University association
  universityId?: string;
  universityName?: string;
  // First-time login
  isFirstLogin?: boolean;
  // Additional profile fields
  phone?: string;
  department?: string;
  studentId?: string;
  year?: string;
  status?: 'active' | 'inactive' | 'suspended';
  lastLogin?: Date;
  createdAt?: Date;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  totalQuestions: number;
  passingScore: number;
  startTime: Date;
  endTime: Date;
  isActive: boolean;
  createdBy: string;
  questions: Question[];
  settings: ExamSettings;
}

export interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay';
  question: string;
  options?: string[];
  correctAnswer?: string | string[];
  points: number;
  order: number;
}

export interface ExamSettings {
  allowReview: boolean;
  showResults: boolean;
  requireWebcam: boolean;
  requireScreenShare: boolean;
  preventTabSwitch: boolean;
  preventCopyPaste: boolean;
  timeLimit: boolean;
  randomizeQuestions: boolean;
  timePerQuestion: boolean;
}

export interface ExamSession {
  id: string;
  examId: string;
  studentId: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'terminated';
  answers: Answer[];
  score?: number;
  proctorNotes?: string;
}

export interface Answer {
  questionId: string;
  answer: string | string[];
  timestamp: Date;
}

export interface ProctorEvent {
  id: string;
  sessionId: string;
  type: 'tab-switch' | 'copy-paste' | 'face-not-detected' | 'multiple-faces' | 'phone-detected' | 'voice-detected' | 'escape-attempt' | 'fullscreen-exit' | 'unsaved-navigation';
  timestamp: Date;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: User) => void;
  loading: boolean;
}

export interface ProctorContextType {
  currentSession: ExamSession | null;
  startSession: (examId: string) => Promise<void>;
  endSession: () => void;
  addProctorEvent: (event: Omit<ProctorEvent, 'id' | 'timestamp'>) => void;
  events: ProctorEvent[];
} 