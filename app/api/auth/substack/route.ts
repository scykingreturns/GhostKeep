import { NextRequest, NextResponse } from 'next/server';
import { connectionsDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const { subdomain, token } = await req.json();

    if (!subdomain || !token) {
      return NextResponse.json({ error: 'subdomain and token are required' }, { status: 400 });
    }

    // Verify the credentials by hitting the Substack API
    const verifyRes = await fetch(`https://${subdomain}.substack.com/api/v1/posts?limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!verifyRes.ok) {
      return NextResponse.json({ error: 'Invalid Substack credentials' }, { status: 401 });
    }

    connectionsDb.upsert({
      id: uuidv4(),
      platform: 'substack',
      account_name: subdomain,
      account_id: subdomain,
      access_token: token,
      refresh_token: null,
      token_expires_at: null,
      avatar_url: null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
