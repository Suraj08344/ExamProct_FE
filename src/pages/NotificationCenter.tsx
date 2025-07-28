import React, { useMemo, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { BellIcon, CheckCircleIcon, ExclamationTriangleIcon, ChatBubbleLeftRightIcon, CalendarIcon, MegaphoneIcon, ClockIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

const typeIconMap: Record<string, React.ReactNode> = {
  chat: <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-500" />,
  test: <AcademicCapIcon className="h-5 w-5 text-indigo-500" />,
  warning: <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />,
  reminder: <ClockIcon className="h-5 w-5 text-purple-500" />,
  announcement: <MegaphoneIcon className="h-5 w-5 text-pink-500" />,
  cheating: <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />,
  classroom: <CalendarIcon className="h-5 w-5 text-green-500" />,
  university: <BellIcon className="h-5 w-5 text-gray-500" />,
  exam: <AcademicCapIcon className="h-5 w-5 text-indigo-500" />,
  other: <BellIcon className="h-5 w-5 text-gray-400" />,
};

const typeLabels: Record<string, string> = {
  chat: 'Chat',
  test: 'Test',
  warning: 'Warning',
  reminder: 'Reminder',
  announcement: 'Announcement',
  cheating: 'Cheating',
  classroom: 'Classroom',
  university: 'University',
  exam: 'Exam',
  other: 'Other',
};

const NotificationCenter: React.FC = () => {
  const { notifications, setNotifications } = useSocket();
  const [filter, setFilter] = useState<string>('all');
  const navigate = useNavigate();

  const notificationTypes = useMemo(() => {
    const types = Array.from(new Set(notifications.map(n => n.type)));
    return ['all', ...types];
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (filter === 'all') return notifications;
    return notifications.filter(n => n.type === filter);
  }, [notifications, filter]);

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    // Optionally, send PATCH requests to backend for all unread notifications
    filteredNotifications.forEach(n => {
      if (!n.read && n._id) {
        fetch(`/api/notifications/${n._id}/read`, { method: 'PATCH', credentials: 'include' });
      }
    });
  };

  const handleNotificationClick = (n: any) => {
    if (!n.read && n._id) {
      fetch(`/api/notifications/${n._id}/read`, { method: 'PATCH', credentials: 'include' });
      setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, read: true } : x));
    }
    if (n.link) {
      window.open(n.link, '_blank');
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notification Center</h1>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          onClick={handleMarkAllRead}
        >
          Mark all as read
        </button>
      </div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {notificationTypes.map(type => (
          <button
            key={type}
            className={`px-3 py-1 rounded-full border text-sm font-medium transition-all ${filter === type ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'}`}
            onClick={() => setFilter(type)}
          >
            {type === 'all' ? 'All' : typeLabels[type] || type}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 divide-y">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No notifications found.</div>
        ) : (
          filteredNotifications.map(n => (
            <div
              key={n._id}
              className={`flex items-start gap-4 px-6 py-5 cursor-pointer transition-all ${n.read ? 'bg-white' : 'bg-blue-50'}`}
              onClick={() => handleNotificationClick(n)}
            >
              <div className="mt-1">{typeIconMap[n.type] || typeIconMap.other}</div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 flex items-center gap-2">
                  {typeLabels[n.type] || n.type}
                  {!n.read && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-blue-500"></span>}
                </div>
                <div className="text-gray-700 mt-1">{n.message}</div>
                <div className="text-xs text-gray-400 mt-1">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</div>
              </div>
              {n.read && <CheckCircleIcon className="h-5 w-5 text-emerald-400 mt-1" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationCenter; 