'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Platform, PLATFORMS, PLATFORM_LIST } from '@/lib/platforms/types';
import PlatformIcon from './PlatformIcon';
import { format } from 'date-fns';

type Props = {
  editPostId?: string;
  initialDate?: Date;
};

type FormState = {
  title: string;
  content: string;
  platforms: Platform[];
  status: 'draft' | 'scheduled';
  scheduled_at: string;
  tags: string;
};

export default function PostComposer({ editPostId, initialDate }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activePreview, setActivePreview] = useState<Platform | null>(null);

  const defaultDate = initialDate
    ? format(initialDate, "yyyy-MM-dd'T'HH:mm")
    : format(new Date(Date.now() + 3600000), "yyyy-MM-dd'T'HH:mm");

  const [form, setForm] = useState<FormState>({
    title: '',
    content: '',
    platforms: [],
    status: 'draft',
    scheduled_at: defaultDate,
    tags: '',
  });

  // Load existing post if editing
  useEffect(() => {
    if (!editPostId) return;
    fetch(`/api/posts/${editPostId}`)
      .then((r) => r.json())
      .then((post) => {
        setForm({
          title: post.title || '',
          content: post.content || '',
          platforms: post.platforms || [],
          status: post.status === 'published' ? 'draft' : post.status,
          scheduled_at: post.scheduled_at
            ? format(new Date(post.scheduled_at * 1000), "yyyy-MM-dd'T'HH:mm")
            : defaultDate,
          tags: (post.tags || []).join(', '),
        });
      })
      .catch(() => setError('Failed to load post'));
  }, [editPostId]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlatform = (platform: Platform) => {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(platform)
        ? f.platforms.filter((p) => p !== platform)
        : [...f.platforms, platform],
    }));
  };

  const charCount = form.content.length;
  const activeLimit = form.platforms.length > 0
    ? Math.min(...form.platforms.map((p) => PLATFORMS[p].maxChars))
    : null;
  const isOverLimit = activeLimit !== null && charCount > activeLimit;

  const buildPayload = (status: 'draft' | 'scheduled') => ({
    title: form.title || null,
    content: form.content,
    platforms: form.platforms,
    status,
    scheduled_at: form.scheduled_at
      ? Math.floor(new Date(form.scheduled_at).getTime() / 1000)
      : null,
    tags: form.tags
      ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [],
    media_urls: [],
  });

  const handleSave = async (status: 'draft' | 'scheduled') => {
    if (!form.content.trim()) { setError('Content is required'); return; }
    if (form.platforms.length === 0) { setError('Select at least one platform'); return; }
    setError(null);
    setSaving(true);

    try {
      const payload = buildPayload(status);
      const url = editPostId ? `/api/posts/${editPostId}` : '/api/posts';
      const method = editPostId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save post');
      setSuccess(status === 'scheduled' ? 'Post scheduled!' : 'Draft saved!');
      setTimeout(() => router.push('/posts'), 1200);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handlePublishNow = async () => {
    if (!form.content.trim()) { setError('Content is required'); return; }
    if (form.platforms.length === 0) { setError('Select at least one platform'); return; }
    setError(null);
    setPublishing(true);

    try {
      // First save/update the post
      const payload = { ...buildPayload('draft'), status: 'draft' };
      const url = editPostId ? `/api/posts/${editPostId}` : '/api/posts';
      const method = editPostId ? 'PATCH' : 'POST';
      const saveRes = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!saveRes.ok) throw new Error('Failed to save post');
      const savedPost = await saveRes.json();

      // Then publish
      const pubRes = await fetch(`/api/publish/${savedPost.id}`, { method: 'POST' });
      const pubData = await pubRes.json();

      const failedPlatforms = Object.entries(pubData.results || {})
        .filter(([, r]) => !(r as { success: boolean }).success)
        .map(([p]) => p);

      if (failedPlatforms.length > 0) {
        setError(`Failed to publish to: ${failedPlatforms.join(', ')}. Check your connections in Settings.`);
      } else {
        setSuccess('Published successfully!');
        setTimeout(() => router.push('/posts'), 1200);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Platform selector */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">Publish to</label>
        <div className="flex gap-3 flex-wrap">
          {PLATFORM_LIST.map((platform) => {
            const selected = form.platforms.includes(platform.id);
            return (
              <button
                key={platform.id}
                type="button"
                onClick={() => togglePlatform(platform.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-medium text-sm transition-all ${
                  selected
                    ? 'border-transparent text-white shadow-md'
                    : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
                }`}
                style={selected ? { backgroundColor: platform.color } : {}}
              >
                <PlatformIcon
                  platform={platform.id}
                  size={18}
                  className={selected ? '[&_path]:fill-white text-white' : ''}
                />
                {platform.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Title (optional, mainly for Substack) */}
      {form.platforms.includes('substack') && (
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Title <span className="text-gray-400 font-normal">(Substack)</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Post title..."
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
          />
        </div>
      )}

      {/* Content */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-semibold text-gray-700">Content</label>
          {activeLimit !== null && (
            <span className={`text-xs font-medium ${isOverLimit ? 'text-red-500' : 'text-gray-400'}`}>
              {charCount} / {activeLimit}
            </span>
          )}
        </div>
        <textarea
          value={form.content}
          onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          placeholder="What do you want to share?"
          rows={8}
          className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 resize-none font-sans ${
            isOverLimit ? 'border-red-400' : 'border-gray-300'
          }`}
        />
      </div>

      {/* Per-platform character count */}
      {form.platforms.length > 0 && (
        <div className="flex gap-3 mb-4 flex-wrap">
          {form.platforms.map((p) => {
            const limit = PLATFORMS[p].maxChars;
            const pct = Math.min(100, (charCount / limit) * 100);
            const over = charCount > limit;
            return (
              <div key={p} className="flex items-center gap-1.5 text-xs text-gray-500">
                <PlatformIcon platform={p} size={13} />
                <span className={over ? 'text-red-500 font-semibold' : ''}>
                  {charCount}/{limit}
                </span>
                <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${over ? 'bg-red-400' : pct > 80 ? 'bg-yellow-400' : 'bg-green-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tags */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Tags <span className="text-gray-400 font-normal">(comma separated)</span>
        </label>
        <input
          type="text"
          value={form.tags}
          onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
          placeholder="marketing, product, announcement"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
        />
      </div>

      {/* Schedule */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Schedule Date & Time</label>
        <input
          type="datetime-local"
          value={form.scheduled_at}
          onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
          className="px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
        />
      </div>

      {/* Preview toggle */}
      {form.platforms.length > 0 && form.content && (
        <div className="mb-6 border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex border-b border-gray-200 bg-gray-50">
            <span className="px-4 py-2 text-sm font-semibold text-gray-600">Preview</span>
            {form.platforms.map((p) => (
              <button
                key={p}
                onClick={() => setActivePreview(activePreview === p ? null : p)}
                className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  activePreview === p ? 'bg-white border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <PlatformIcon platform={p} size={13} />
                {PLATFORMS[p].name}
              </button>
            ))}
          </div>
          {activePreview && (
            <PostPreview platform={activePreview} title={form.title} content={form.content} />
          )}
        </div>
      )}

      {/* Feedback */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => handleSave('draft')}
          disabled={saving || publishing}
          className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Draft'}
        </button>
        <button
          onClick={() => handleSave('scheduled')}
          disabled={saving || publishing}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Schedule
        </button>
        <button
          onClick={handlePublishNow}
          disabled={saving || publishing}
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          {publishing ? 'Publishing...' : 'Publish Now'}
        </button>
        <button
          onClick={() => router.back()}
          className="ml-auto text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function PostPreview({ platform, title, content }: { platform: Platform; title: string; content: string }) {
  const config = PLATFORMS[platform];

  if (platform === 'linkedin') {
    return (
      <div className="p-4 bg-white">
        <div className="max-w-md mx-auto border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gray-200" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Your Name</p>
                <p className="text-xs text-gray-500">Now · 🌐</p>
              </div>
            </div>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{content}</p>
          </div>
          <div className="px-4 py-2 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
            <span>👍 Like</span><span>💬 Comment</span><span>🔁 Repost</span><span>✉️ Send</span>
          </div>
        </div>
      </div>
    );
  }

  if (platform === 'twitter') {
    const over = content.length > config.maxChars;
    return (
      <div className="p-4 bg-white">
        <div className="max-w-md mx-auto border border-gray-200 rounded-xl p-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-1 mb-1">
                <span className="font-bold text-sm text-gray-900">Your Name</span>
                <span className="text-gray-500 text-sm">@handle · now</span>
              </div>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{content}</p>
              {over && (
                <p className="text-xs text-red-500 mt-1">
                  ⚠ Exceeds {config.maxChars} character limit by {content.length - config.maxChars} chars
                </p>
              )}
              <div className="flex gap-6 mt-3 text-gray-500 text-xs">
                <span>💬 Reply</span><span>🔁 Repost</span><span>❤️ Like</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (platform === 'threads') {
    return (
      <div className="p-4 bg-white">
        <div className="max-w-md mx-auto border border-gray-200 rounded-xl p-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm text-gray-900 mb-1">yourhandle</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{content}</p>
              <div className="flex gap-4 mt-3 text-gray-500 text-xs">
                <span>♡</span><span>↩</span><span>✈</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (platform === 'substack') {
    return (
      <div className="p-4 bg-white">
        <div className="max-w-md mx-auto border border-gray-200 rounded-xl p-6">
          {title && <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>}
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{content}</p>
          <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
            Published via Substack
          </div>
        </div>
      </div>
    );
  }

  return null;
}
