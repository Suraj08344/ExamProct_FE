import React, { useState } from 'react';
import { MegaphoneIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

const CreateAnnouncement: React.FC = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState<'all' | 'teachers' | 'students'>('all');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/notifications/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({ title, content, audience }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Announcement created successfully!');
        setTitle('');
        setContent('');
        setAudience('all');
        setTimeout(() => {
          navigate('/dashboard/university');
        }, 1000);
      } else {
        setError(data.error || 'Failed to create announcement');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-6 sm:p-10">
      <div className="w-full max-w-2xl bg-white/80 rounded-2xl shadow-xl border border-white/20 p-8 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-6">
          <MegaphoneIcon className="h-8 w-8 text-pink-500" />
          <h1 className="text-2xl font-bold text-gray-900">Create Announcement</h1>
        </div>
        {success && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">{success}</div>}
        {error && <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/70"
              required
              maxLength={100}
              placeholder="Enter announcement title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/70 min-h-[120px]"
              required
              maxLength={1000}
              placeholder="Write your announcement here..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
            <select
              value={audience}
              onChange={e => setAudience(e.target.value as 'all' | 'teachers' | 'students')}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/70"
            >
              <option value="all">All (Teachers & Students)</option>
              <option value="teachers">Teachers Only</option>
              <option value="students">Students Only</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-60"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Announcement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAnnouncement; 