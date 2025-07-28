import React, { useState, useRef, useEffect } from 'react';
import { ChatBubbleLeftIcon, ArrowUturnLeftIcon, DocumentIcon, PhotoIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface Message {
  _id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  senderAvatar?: string;
  createdAt: string;
  isEdited?: boolean;
  messageType?: 'text' | 'file' | 'image' | 'document';
  attachment?: {
    fileName: string;
    fileUrl: string;
    fileSize: number;
    fileType: string;
    originalName: string;
  };
  replyTo?: {
    _id: string;
    text: string;
    senderName: string;
  };
}

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  onReply: (message: Message) => void;
  replyingTo?: Message | null;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isOwnMessage, 
  onReply, 
  replyingTo 
}) => {
  const [showReplyOption, setShowReplyOption] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const messageRef = useRef<HTMLDivElement>(null);

  // Determine if message should be shown on right side (own message or admin message)
  const showOnRight = isOwnMessage || message.senderRole === 'admin';

  const handleMouseDown = () => {
    const timer = setTimeout(() => {
      setShowReplyOption(true);
    }, 2000); // 2 seconds
    setLongPressTimer(timer);
  };

  const handleMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleMouseLeave = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setShowReplyOption(false);
  };

  const handleReply = () => {
    onReply(message);
    setShowReplyOption(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <PhotoIcon className="h-5 w-5" />;
    }
    return <DocumentIcon className="h-5 w-5" />;
  };

  const handleFileDownload = () => {
    if (message.attachment?.fileUrl) {
      const link = document.createElement('a');
      link.href = message.attachment.fileUrl;
      link.download = message.attachment.originalName || message.attachment.fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  useEffect(() => {
    if (showReplyOption) {
      const timer = setTimeout(() => {
        setShowReplyOption(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showReplyOption]);

  return (
    <div
      ref={messageRef}
      className={`flex mb-4 ${showOnRight ? 'justify-end' : 'justify-start'}`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
    >
      {/* Avatar for received messages (left side) */}
      {!showOnRight && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center mr-2 mt-1 shadow-md overflow-hidden">
          {message.senderAvatar ? (
            <img src={message.senderAvatar} alt={message.senderName} className="w-full h-full object-cover rounded-full" />
          ) : (
            <span className="text-base font-bold text-white">{message.senderName.charAt(0).toUpperCase()}</span>
          )}
        </div>
      )}

      {/* Message Container */}
      <div className={`flex flex-col ${showOnRight ? 'items-end' : 'items-start'}`}>
        {/* Sender name and role badge for received messages */}
        {!showOnRight && (
          <div className="flex items-center gap-2 mb-1 ml-1">
            <span className="text-xs text-purple-500 font-semibold">{message.senderName}</span>
            {message.senderRole && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                message.senderRole === 'university' ? 'bg-yellow-200 text-yellow-800' :
                message.senderRole === 'teacher' ? 'bg-blue-200 text-blue-800' :
                message.senderRole === 'student' ? 'bg-green-200 text-green-800' :
                message.senderRole === 'instructor' ? 'bg-indigo-200 text-indigo-800' :
                message.senderRole === 'admin' ? 'bg-red-200 text-red-800' :
                'bg-gray-200 text-gray-700'
              }`}>
                {message.senderRole}
              </span>
            )}
          </div>
        )}

        {/* Reply indicator */}
        {message.replyTo && (
          <div className={`mb-1 px-3 py-2 rounded-lg text-xs max-w-xs ${
            showOnRight 
              ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' 
              : 'bg-purple-100 text-purple-800'
          }`}>
            <div className="flex items-center space-x-1 mb-1">
              <ArrowUturnLeftIcon className="h-3 w-3" />
              <span className="font-medium">{message.replyTo.senderName}</span>
            </div>
            <div className="truncate text-xs opacity-90">{message.replyTo.text}</div>
          </div>
        )}

        <div className="flex items-end">
          {/* Main message bubble */}
          <div
            className={`px-4 py-2 rounded-2xl shadow-xl relative transition-all duration-200 will-change-transform hover:scale-[1.03] ${
              showOnRight
                ? 'bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 text-white'
                : 'bg-white/70 backdrop-blur-xl text-gray-900 border border-white/30'
            }`}
          >
            {/* File attachment */}
            {message.attachment && (
              <div className={`mb-2 p-3 rounded-lg ${
                showOnRight ? 'bg-green-500/80' : 'bg-purple-50'
              }`}>
                <div className="flex items-center space-x-3">
                  {getFileIcon(message.attachment.fileType)}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${
                      showOnRight ? 'text-white' : 'text-purple-900'
                    }`}>
                      {message.attachment.originalName || message.attachment.fileName}
                    </div>
                    <div className={`text-xs ${
                      showOnRight ? 'text-emerald-100' : 'text-purple-500'
                    }`}>
                      {formatFileSize(message.attachment.fileSize)}
                    </div>
                  </div>
                  <button
                    onClick={handleFileDownload}
                    className={`p-1 rounded hover:bg-opacity-80 ${
                      showOnRight ? 'text-white hover:bg-emerald-600' : 'text-purple-600 hover:bg-purple-200'
                    }`}
                    title="Download file"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Message text */}
            <div className="break-words leading-relaxed text-sm">{message.text}</div>

            {/* Timestamp and edit indicator */}
            <div className={`text-xs mt-1 flex items-center justify-end space-x-1 ${
              showOnRight ? 'text-emerald-100' : 'text-purple-400'
            }`}>
              {message.isEdited && (
                <span className="italic">edited</span>
              )}
              <span>
                {new Date(message.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>

          {/* Avatar for own messages and admin messages (right side) */}
          {showOnRight && (
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ml-2 mt-1 shadow-md overflow-hidden ${
              message.senderRole === 'admin' 
                ? 'bg-gradient-to-br from-red-400 to-red-600' 
                : 'bg-gradient-to-br from-green-400 to-emerald-500'
            }`}>
              {message.senderAvatar ? (
                <img src={message.senderAvatar} alt={message.senderName} className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="text-base font-bold text-white">{message.senderName.charAt(0).toUpperCase()}</span>
              )}
            </div>
          )}
        </div>

        {/* Reply option overlay */}
        {showReplyOption && (
          <div className={`absolute -top-12 ${showOnRight ? 'right-0' : 'left-0'} z-10`}>
            <button
              onClick={handleReply}
              className="bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2 hover:bg-gray-700 transition-colors"
            >
              <ChatBubbleLeftIcon className="h-4 w-4" />
              <span>Reply</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;