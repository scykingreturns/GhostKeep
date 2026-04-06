'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PostCard from '@/components/PostCard';
import { Post } from '@/lib/db';
import { Platform } from '@/lib/platforms/types';
import PlatformIcon from '@/components/PlatformIcon';

type FilterStatus = 'all' | 'draft' | 'scheduled' | 'published' | 'failed';
type FilterPlatform = 'all' | Platform;

export default function PostsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [platformFilter, setPlatformFilter] = useState<FilterPlatform>('all');
  const [search, setSearch] = useState('');

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

  const filtered = posts.filter((post) => {
    if (statusFilter !== 'all' && post.status !== statusFilter) return false;
    if (platformFilter !== 'all' && !post.platforms.includes(platformFilter)) return false;
    if (search && !post.content.toLowerCase().includes(search.toLowerCase()) &&
        !(post.title?.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const counts = {
    all: posts.length,
    draft: posts.filter((p) => p.status === 'draft').length,
    scheduled: posts.filter((p) => p.status === 'scheduled').length,
    published: posts.filter((p) => p.status === 'published').length,
    failed: posts.filter((p) => p.status === 'failed').length,
  };

  const statusTabs: { key: FilterStatus; label: string; color: string }[] = [
    { key: 'all', label: 'All', color: 'text-gray-700' },
    { key: 'scheduled', label: 'Scheduled', color: 'text-blue-700' },
    { key: 'draft', label: 'Drafts', color: 'text-gray-600' },
    { key: 'published', label: 'Published', color: 'text-green-700' },
    { key: 'failed', label: 'Failed', color: 'text-red-700' },
  ];

  const platforms: { key: FilterPlatform; label: string }[] = [
    { key: 'all', label: 'All Platforms' },
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'twitter', label: 'X' },
    { key: 'threads', label: 'Threads' },
    { key: 'substack', label: 'Substack' },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">All Posts</h1>
          <p className="text-sm text-gray-500 mt-0.5">{posts.length} total posts</p>
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

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 space-y-3 shrink-0">
        {/* Status tabs */}
        <div className="flex gap-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                statusFilter === tab.key
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {counts[tab.key] > 0 && (
                <span className="ml-1.5 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Platform + Search row */}
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {platforms.map((p) => (
              <button
                key={p.key}
                onClick={() => setPlatformFilter(p.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                  platformFilter === p.key
                    ? 'bg-gray-800 text-white border-gray-800'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                }`}
              >
                {p.key !== 'all' && (
                  <PlatformIcon
                    platform={p.key as Platform}
                    size={12}
                    className={platformFilter === p.key ? '[&_path]:fill-white text-white' : ''}
                  />
                )}
                {p.label}
              </button>
            ))}
          </div>
          <div className="ml-auto relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search posts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-52"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No posts found</h3>
            <p className="text-gray-500 text-sm mb-6">
              {posts.length === 0
                ? "You haven't created any posts yet."
                : 'No posts match your current filters.'}
            </p>
            {posts.length === 0 && (
              <button
                onClick={() => router.push('/compose')}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Create your first post
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {filtered.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onDelete={handleDelete}
                onPublish={handlePublish}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
