'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PostComposer from '@/components/PostComposer';
import { parseISO } from 'date-fns';

function ComposeContent() {
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit') || undefined;
  const dateParam = searchParams.get('date');
  const initialDate = dateParam ? parseISO(decodeURIComponent(dateParam)) : undefined;

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <h1 className="text-xl font-bold text-gray-900">
          {editId ? 'Edit Post' : 'New Post'}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {editId ? 'Update your scheduled content' : 'Compose and schedule content across platforms'}
        </p>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <PostComposer editPostId={editId} initialDate={initialDate} />
      </div>
    </div>
  );
}

export default function ComposePage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading...</div>}>
      <ComposeContent />
    </Suspense>
  );
}
