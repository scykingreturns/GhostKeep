import { NextRequest, NextResponse } from 'next/server';
import { postsDb } from '@/lib/db';
import { publishViaAyrshare } from '@/lib/platforms/publisher';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = postsDb.getById(id);
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

  const results = await publishViaAyrshare(
    post.platforms,
    post.content,
    post.media_urls,
    post.title,
    post.scheduled_at
  );

  const platformPostIds: Record<string, string> = { ...post.platform_post_ids };
  for (const [platform, result] of Object.entries(results)) {
    if (result.success && result.platformPostId) {
      platformPostIds[platform] = result.platformPostId;
    }
  }

  const allSuccess = Object.values(results).every((r) => r.success);
  const anySuccess = Object.values(results).some((r) => r.success);
  const status = anySuccess ? 'published' : 'failed';
  const now = Math.floor(Date.now() / 1000);

  const updatedPost = postsDb.update(id, {
    status,
    published_at: anySuccess ? now : undefined,
    platform_post_ids: platformPostIds,
  });

  return NextResponse.json({ post: updatedPost, results, allSuccess });
}
