'use client';

import { useState, useCallback } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  startOfDay,
  getHours,
  eachHourOfInterval,
  addDays,
  subDays,
} from 'date-fns';
import { Post } from '@/lib/db';
import { Platform } from '@/lib/platforms/types';
import PlatformBadge from './PlatformBadge';
import PostCard from './PostCard';

type ViewMode = 'month' | 'week' | 'day';

type Props = {
  posts: Post[];
  onDateClick?: (date: Date) => void;
  onPostClick?: (post: Post) => void;
  onPublish?: (id: string) => void;
  onDelete?: (id: string) => void;
};

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: '#0A66C2',
  twitter: '#000000',
  threads: '#1a1a1a',
  substack: '#FF6719',
};

function getPostsForDay(posts: Post[], date: Date): Post[] {
  return posts.filter((post) => {
    if (!post.scheduled_at) return false;
    return isSameDay(new Date(post.scheduled_at * 1000), date);
  });
}

function getPostsForHour(posts: Post[], date: Date, hour: number): Post[] {
  return posts.filter((post) => {
    if (!post.scheduled_at) return false;
    const d = new Date(post.scheduled_at * 1000);
    return isSameDay(d, date) && getHours(d) === hour;
  });
}

export default function Calendar({ posts, onDateClick, onPostClick, onPublish, onDelete }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const navigatePrev = useCallback(() => {
    if (viewMode === 'month') setCurrentDate((d) => subMonths(d, 1));
    else if (viewMode === 'week') setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => subDays(d, 1));
  }, [viewMode]);

  const navigateNext = useCallback(() => {
    if (viewMode === 'month') setCurrentDate((d) => addMonths(d, 1));
    else if (viewMode === 'week') setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addDays(d, 1));
  }, [viewMode]);

  const goToday = useCallback(() => setCurrentDate(new Date()), []);

  const headerTitle = () => {
    if (viewMode === 'month') return format(currentDate, 'MMMM yyyy');
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      if (format(start, 'MMM yyyy') === format(end, 'MMM yyyy')) {
        return `${format(start, 'MMM d')} – ${format(end, 'd, yyyy')}`;
      }
      return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
    }
    return format(currentDate, 'EEEE, MMMM d, yyyy');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            Today
          </button>
          <button
            onClick={navigatePrev}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Previous"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={navigateNext}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Next"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-gray-900 ml-2">{headerTitle()}</h2>
        </div>

        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors capitalize ${
                viewMode === mode
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Body */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'month' && (
          <MonthView
            currentDate={currentDate}
            posts={posts}
            onDateClick={onDateClick}
            onPostClick={(p) => { setSelectedPost(p); onPostClick?.(p); }}
          />
        )}
        {viewMode === 'week' && (
          <WeekView
            currentDate={currentDate}
            posts={posts}
            onDateClick={onDateClick}
            onPostClick={(p) => { setSelectedPost(p); onPostClick?.(p); }}
          />
        )}
        {viewMode === 'day' && (
          <DayView
            currentDate={currentDate}
            posts={posts}
            onDateClick={onDateClick}
            onPostClick={(p) => { setSelectedPost(p); onPostClick?.(p); }}
          />
        )}
      </div>

      {/* Post Detail Drawer */}
      {selectedPost && (
        <div
          className="fixed inset-0 bg-black/40 z-40 flex items-end sm:items-center justify-center p-4"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Post Details</h3>
              <button
                onClick={() => setSelectedPost(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5">
              <PostCard
                post={selectedPost}
                onDelete={(id) => { onDelete?.(id); setSelectedPost(null); }}
                onPublish={(id) => { onPublish?.(id); setSelectedPost(null); }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Month View ──────────────────────────────────────────────────────────────

function MonthView({
  currentDate,
  posts,
  onDateClick,
  onPostClick,
}: {
  currentDate: Date;
  posts: Post[];
  onDateClick?: (date: Date) => void;
  onPostClick?: (post: Post) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  return (
    <div className="h-full flex flex-col">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 grid grid-cols-7" style={{ gridAutoRows: '1fr' }}>
        {days.map((day) => {
          const dayPosts = getPostsForDay(posts, day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={`border-b border-r border-gray-100 p-1.5 min-h-[100px] cursor-pointer hover:bg-gray-50 transition-colors group ${
                !isCurrentMonth ? 'bg-gray-50/60' : ''
              }`}
              onClick={() => onDateClick?.(day)}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                    isCurrentDay
                      ? 'bg-indigo-600 text-white'
                      : isCurrentMonth
                      ? 'text-gray-900 group-hover:bg-gray-200'
                      : 'text-gray-400'
                  }`}
                >
                  {format(day, 'd')}
                </span>
                {dayPosts.length > 0 && (
                  <span className="text-xs text-gray-400 font-medium">{dayPosts.length}</span>
                )}
              </div>
              <div className="space-y-1">
                {dayPosts.slice(0, 3).map((post) => (
                  <PostDot key={post.id} post={post} onClick={(e) => { e.stopPropagation(); onPostClick?.(post); }} />
                ))}
                {dayPosts.length > 3 && (
                  <span className="text-xs text-gray-400 pl-1">+{dayPosts.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PostDot({ post, onClick }: { post: Post; onClick: (e: React.MouseEvent) => void }) {
  const primaryPlatform = post.platforms[0] as Platform | undefined;
  const color = primaryPlatform ? PLATFORM_COLORS[primaryPlatform] : '#6366f1';

  return (
    <div
      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity truncate"
      style={{ backgroundColor: color + '18', borderLeft: `3px solid ${color}` }}
      onClick={onClick}
      title={post.content}
    >
      <span className="truncate text-gray-800" style={{ fontSize: '11px' }}>
        {post.scheduled_at && format(new Date(post.scheduled_at * 1000), 'h:mm a')}{' '}
        {post.title || post.content.slice(0, 30)}
      </span>
    </div>
  );
}

// ─── Week View ───────────────────────────────────────────────────────────────

function WeekView({
  currentDate,
  posts,
  onDateClick,
  onPostClick,
}: {
  currentDate: Date;
  posts: Post[];
  onDateClick?: (date: Date) => void;
  onPostClick?: (post: Post) => void;
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = eachHourOfInterval({ start: startOfDay(weekStart), end: new Date(startOfDay(weekStart).getTime() + 23 * 3600000) });

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header row */}
      <div className="grid grid-cols-8 sticky top-0 bg-white z-10 border-b border-gray-200">
        <div className="py-2 px-2 text-xs text-gray-400 text-right">GMT</div>
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className="py-2 text-center cursor-pointer hover:bg-gray-50"
            onClick={() => onDateClick?.(day)}
          >
            <p className="text-xs font-medium text-gray-500 uppercase">{format(day, 'EEE')}</p>
            <p
              className={`text-lg font-semibold mx-auto w-9 h-9 flex items-center justify-center rounded-full ${
                isToday(day) ? 'bg-indigo-600 text-white' : 'text-gray-900'
              }`}
            >
              {format(day, 'd')}
            </p>
          </div>
        ))}
      </div>

      {/* Time slots */}
      {hours.map((hour) => (
        <div key={hour.toISOString()} className="grid grid-cols-8 border-b border-gray-100 min-h-[60px]">
          <div className="px-2 py-1 text-right text-xs text-gray-400 font-medium pt-0 relative -top-2.5">
            {format(hour, 'h a')}
          </div>
          {weekDays.map((day) => {
            const hourPosts = getPostsForHour(posts, day, getHours(hour));
            return (
              <div
                key={day.toISOString()}
                className="border-l border-gray-100 p-1 cursor-pointer hover:bg-indigo-50/30 transition-colors"
                onClick={() => {
                  const d = new Date(day);
                  d.setHours(getHours(hour));
                  onDateClick?.(d);
                }}
              >
                {hourPosts.map((post) => (
                  <div
                    key={post.id}
                    className="text-xs px-1.5 py-1 rounded mb-1 cursor-pointer hover:opacity-80 truncate"
                    style={{
                      backgroundColor: PLATFORM_COLORS[post.platforms[0]] + '20',
                      borderLeft: `3px solid ${PLATFORM_COLORS[post.platforms[0]] || '#6366f1'}`,
                    }}
                    onClick={(e) => { e.stopPropagation(); onPostClick?.(post); }}
                    title={post.content}
                  >
                    {post.title || post.content.slice(0, 25)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Day View ────────────────────────────────────────────────────────────────

function DayView({
  currentDate,
  posts,
  onDateClick,
  onPostClick,
}: {
  currentDate: Date;
  posts: Post[];
  onDateClick?: (date: Date) => void;
  onPostClick?: (post: Post) => void;
}) {
  const hours = eachHourOfInterval({
    start: startOfDay(currentDate),
    end: new Date(startOfDay(currentDate).getTime() + 23 * 3600000),
  });

  return (
    <div className="overflow-auto h-full">
      {hours.map((hour) => {
        const hourPosts = getPostsForHour(posts, currentDate, getHours(hour));
        return (
          <div
            key={hour.toISOString()}
            className="flex border-b border-gray-100 min-h-[72px] cursor-pointer hover:bg-gray-50 transition-colors group"
            onClick={() => {
              const d = new Date(currentDate);
              d.setHours(getHours(hour), 0, 0, 0);
              onDateClick?.(d);
            }}
          >
            <div className="w-20 shrink-0 py-2 px-3 text-right text-xs text-gray-400 font-medium relative -top-2.5">
              {format(hour, 'h:mm a')}
            </div>
            <div className="flex-1 border-l border-gray-200 p-2 space-y-1.5">
              {hourPosts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-lg p-2.5 cursor-pointer hover:opacity-90 transition-opacity"
                  style={{
                    backgroundColor: PLATFORM_COLORS[post.platforms[0]] + '15',
                    borderLeft: `4px solid ${PLATFORM_COLORS[post.platforms[0]] || '#6366f1'}`,
                  }}
                  onClick={(e) => { e.stopPropagation(); onPostClick?.(post); }}
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {post.platforms.map((p) => (
                      <PlatformBadge key={p} platform={p as Platform} size="sm" />
                    ))}
                    <span className="text-xs text-gray-500">
                      {format(new Date(post.scheduled_at! * 1000), 'h:mm a')}
                    </span>
                  </div>
                  {post.title && <p className="font-medium text-sm text-gray-900 mb-0.5">{post.title}</p>}
                  <p className="text-sm text-gray-700 line-clamp-2">{post.content}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
