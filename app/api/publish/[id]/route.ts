import { NextRequest, NextResponse } from 'next/server';
import { postsDb, connectionsDb } from '@/lib/db';
import {
  publishToLinkedIn,
  publishToTwitter,
  publishToThreads,
  publishToSubstack,
  PublishResult,
} from '@/lib/platforms/publisher';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = postsDb.getById(id);
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

  const results: Record<string, PublishResult> = {};
  const platformPostIds: Record<string, string> = { ...post.platform_post_ids };

  for (const platform of post.platforms) {
    const connections = connectionsDb.getByPlatform(platform);
    if (connections.length === 0) {
      results[platform] = { success: false, error: `No ${platform} account connected. Go to Settings.` };
      continue;
    }
    const conn = connections[0];

    let result: PublishResult;
    switch (platform) {
      case 'linkedin':
        result = await publishToLinkedIn(conn.access_token, conn.account_id, post.content);
        break;
      case 'twitter':
        result = await publishToTwitter(conn.access_token, post.content);
        break;
      case 'threads':
        result = await publishToThreads(conn.access_token, conn.account_id, post.content);
        break;
      case 'substack':
        result = await publishToSubstack(conn.access_token, conn.account_id, post.content, post.title);
        break;
      default:
        result = { success: false, error: `Unknown platform: ${platform}` };
    }

    results[platform] = result;
    if (result.success && result.platformPostId) platformPostIds[platform] = result.platformPostId;
  }

  const anySuccess = Object.values(results).some((r) => r.success);
  const allSuccess = Object.values(results).every((r) => r.success);
  const now = Math.floor(Date.now() / 1000);

  const updatedPost = postsDb.update(id, {
    status: anySuccess ? 'published' : 'failed',
    published_at: anySuccess ? now : undefined,
    platform_post_ids: platformPostIds,
  });

  return NextResponse.json({ post: updatedPost, results, allSuccess });
}
