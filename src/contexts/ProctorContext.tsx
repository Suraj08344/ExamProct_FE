import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ExamSession, ProctorEvent, ProctorContextType } from '../types';

const ProctorContext = createContext<ProctorContextType | undefined>(undefined);

export const useProctor = () => {
  const context = useContext(ProctorContext);
  if (context === undefined) {
    throw new Error('useProctor must be used within a ProctorProvider');
  }
  return context;
};

interface ProctorProviderProps {
  children: ReactNode;
}

export const ProctorProvider: React.FC<ProctorProviderProps> = ({ children }) => {
  const [currentSession, setCurrentSession] = useState<ExamSession | null>(null);
  const [events, setEvents] = useState<ProctorEvent[]>([]);

  const startSession = async (examId: string) => {
    const session: ExamSession = {
      id: Date.now().toString(),
      examId,
      studentId: '1', // In real app, this would be the current user's ID
      startTime: new Date(),
      status: 'active',
      answers: []
    };
    
    setCurrentSession(session);
    setEvents([]);
  };

  const endSession = () => {
    if (currentSession) {
      setCurrentSession({
        ...currentSession,
        endTime: new Date(),
        status: 'completed'
      });
    }
  };

  const addProctorEvent = (eventData: Omit<ProctorEvent, 'id' | 'timestamp'>) => {
    const event: ProctorEvent = {
      ...eventData,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    
    setEvents(prev => [...prev, event]);
  };

  const value: ProctorContextType = {
    currentSession,
    startSession,
    endSession,
    addProctorEvent,
    events
  };

  return (
    <ProctorContext.Provider value={value}>
      {children}
    </ProctorContext.Provider>
  );
}; 