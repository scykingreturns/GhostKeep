'use client';

import { Post } from '@/lib/db';
import { Platform } from '@/lib/platforms/types';
import PlatformBadge from './PlatformBadge';
import { format } from 'date-fns';
import Link from 'next/link';

type Props = {
  post: Post;
  onDelete?: (id: string) => void;
  onPublish?: (id: string) => void;
  compact?: boolean;
};

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  published: 'Published',
  failed: 'Failed',
};

export default function PostCard({ post, onDelete, onPublish, compact = false }: Props) {
  const scheduledDate = post.scheduled_at
    ? new Date(post.scheduled_at * 1000)
    : null;

  if (compact) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 hover:border-indigo-300 transition-colors cursor-pointer group">
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_STYLES[post.status]}`}>
            {STATUS_LABELS[post.status]}
          </span>
          {scheduledDate && (
            <span className="text-xs text-gray-400">
              {format(scheduledDate, 'h:mm a')}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-800 line-clamp-2">{post.content}</p>
        <div className="flex gap-1 mt-2 flex-wrap">
          {post.platforms.map((p) => (
            <PlatformBadge key={p} platform={p as Platform} size="sm" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {post.platforms.map((p) => (
            <PlatformBadge key={p} platform={p as Platform} size="sm" />
          ))}
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_STYLES[post.status]}`}>
          {STATUS_LABELS[post.status]}
        </span>
      </div>

      {/* Title */}
      {post.title && (
        <h3 className="font-semibold text-gray-900 mb-1">{post.title}</h3>
      )}

      {/* Content */}
      <p className="text-gray-700 text-sm line-clamp-3 mb-3">{post.content}</p>

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-3">
          {post.tags.map((tag) => (
            <span key={tag} className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          {scheduledDate ? (
            <span>
              <span className="font-medium">Scheduled:</span>{' '}
              {format(scheduledDate, 'MMM d, yyyy h:mm a')}
            </span>
          ) : (
            <span>Created {format(new Date(post.created_at * 1000), 'MMM d, yyyy')}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {post.status === 'draft' || post.status === 'failed' ? (
            <>
              {onPublish && (
                <button
                  onClick={() => onPublish(post.id)}
                  className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 font-medium transition-colors"
                >
                  Publish Now
                </button>
              )}
              <Link
                href={`/compose?edit=${post.id}`}
                className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 font-medium transition-colors"
              >
                Edit
              </Link>
            </>
          ) : null}
          {onDelete && (
            <button
              onClick={() => onDelete(post.id)}
              className="text-xs text-red-500 hover:text-red-700 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
