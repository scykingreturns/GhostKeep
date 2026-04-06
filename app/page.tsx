'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Calendar from '@/components/Calendar';
import { Post } from '@/lib/db';
import { format } from 'date-fns';

export default function CalendarPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/posts');
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleDateClick = (date: Date) => {
    const iso = format(date, "yyyy-MM-dd'T'HH:mm");
    router.push(`/compose?date=${encodeURIComponent(iso)}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this post?')) return;
    await fetch(`/api/posts/${id}`, { method: 'DELETE' });
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const handlePublish = async (id: string) => {
    const res = await fetch(`/api/publish/${id}`, { method: 'POST' });
    const data = await res.json();
    if (data.post) {
      setPosts((prev) => prev.map((p) => (p.id === id ? data.post : p)));
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Page header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Content Calendar</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Click any date to schedule a new post
          </p>
        </div>
        <button
          onClick={() => router.push('/compose')}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Post
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading calendar...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden bg-white">
          <Calendar
            posts={posts}
            onDateClick={handleDateClick}
            onDelete={handleDelete}
            onPublish={handlePublish}
          />
        </div>
      )}
    </div>
  );
}
