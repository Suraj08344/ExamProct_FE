import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

// Define the Socket type properly
type SocketType = ReturnType<typeof io>;

interface Notification {
  _id?: string;
  userId?: string;
  role?: string;
  type: string;
  message: string;
  link?: string;
  read?: boolean;
  createdAt?: string;
  meta?: any;
}

interface SocketContextType {
  socket: SocketType | null;
  isConnected: boolean;
  joinClassroom: (classroomId: string) => void;
  leaveClassroom: (classroomId: string) => void;
  sendMessage: (classroomId: string, message: any) => void;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<SocketType | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();
  const socketRef = useRef<SocketType | null>(null);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      setNotifications([]);
      return;
    }

    // Fetch notifications from backend on login/user change
    fetch('https://examproctor-backend-e6mh.onrender.com/api/notifications', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setNotifications(data.data);
        }
      });

    if (!socketRef.current) {
      // Always use the deployed backend for Socket.IO connections
      const socketUrl = process.env.REACT_APP_SOCKET_URL || 'https://examproctor-backend-e6mh.onrender.com';
      const newSocket = io(socketUrl, {
        auth: {
          token: localStorage.getItem('token')
        },
        transports: ['polling', 'websocket'], // Try polling first, then upgrade to websocket
        timeout: 20000, // 20 second timeout
        forceNew: true
      });

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setIsConnected(true);
        // Join user room for notifications
        if (user?.id) {
          newSocket.emit('join-user', user.id);
        }
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error: any) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      // Listen for real-time notifications
      newSocket.on('notification', (notification: Notification) => {
        setNotifications(prev => [notification, ...prev]);
      });

      socketRef.current = newSocket;
      setSocket(newSocket);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      setNotifications([]);
    };
  }, [user]);

  const joinClassroom = (classroomId: string) => {
    if (socket && isConnected) {
      socket.emit('join-classroom', classroomId);
      console.log('Joined classroom room:', classroomId);
    }
  };

  const leaveClassroom = (classroomId: string) => {
    if (socket && isConnected) {
      socket.emit('leave-classroom', classroomId);
      console.log('Left classroom room:', classroomId);
    }
  };

  const sendMessage = (classroomId: string, message: any) => {
    if (socket && isConnected) {
      socket.emit('classroom-message', {
        classroomId,
        ...message
      });
    }
  };

  const value: SocketContextType = {
    socket,
    isConnected,
    joinClassroom,
    leaveClassroom,
    sendMessage,
    notifications,
    setNotifications
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}; 