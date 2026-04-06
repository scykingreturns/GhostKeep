import { NextRequest, NextResponse } from 'next/server';
import { postsDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  try {
    let posts;
    if (start && end) {
      posts = postsDb.getByDateRange(Number(start), Number(end));
    } else {
      posts = postsDb.getAll();
    }
    return NextResponse.json(posts);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const post = postsDb.create({
      id: uuidv4(),
      content: body.content || '',
      platforms: body.platforms || [],
      status: body.status || 'draft',
      scheduled_at: body.scheduled_at || null,
      published_at: null,
      media_urls: body.media_urls || [],
      title: body.title || null,
      tags: body.tags || [],
      platform_post_ids: {},
    });
    return NextResponse.json(post, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
