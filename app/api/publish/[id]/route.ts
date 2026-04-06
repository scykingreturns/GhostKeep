import { NextRequest, NextResponse } from 'next/server';
import { postsDb, connectionsDb } from '@/lib/db';
import {
  publishToLinkedIn,
  publishToTwitter,
  publishToThreads,
  publishToSubstack,
} from '@/lib/platforms/publisher';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = postsDb.getById(id);
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

  const results: Record<string, { success: boolean; error?: string; platformPostId?: string }> = {};
  const platformPostIds: Record<string, string> = { ...post.platform_post_ids };

  for (const platform of post.platforms) {
    const connections = connectionsDb.getByPlatform(platform);
    if (connections.length === 0) {
      results[platform] = { success: false, error: `No ${platform} account connected` };
      continue;
    }

    const connection = connections[0];
    let result;

    switch (platform) {
      case 'linkedin':
        result = await publishToLinkedIn(connection, post.content, post.media_urls);
        break;
      case 'twitter':
        result = await publishToTwitter(connection, post.content, post.media_urls);
        break;
      case 'threads':
        result = await publishToThreads(connection, post.content, post.media_urls);
        break;
      case 'substack':
        result = await publishToSubstack(connection, post.content, post.title, post.scheduled_at);
        break;
      default:
        result = { success: false, error: `Unknown platform: ${platform}` };
    }

    results[platform] = result;
    if (result.success && result.platformPostId) {
      platformPostIds[platform] = result.platformPostId;
    }
  }

  const allSuccess = Object.values(results).every((r) => r.success);
  const anySuccess = Object.values(results).some((r) => r.success);

  const status = allSuccess ? 'published' : anySuccess ? 'published' : 'failed';
  const now = Math.floor(Date.now() / 1000);

  const updatedPost = postsDb.update(id, {
    status,
    published_at: anySuccess ? now : undefined,
    platform_post_ids: platformPostIds,
  });

  return NextResponse.json({ post: updatedPost, results });
}
