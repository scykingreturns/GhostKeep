import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getThreadsConfig, exchangeCodeForToken } from '@/lib/platforms/oauth';
import { connectionsDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

function getBaseUrl(req: NextRequest): string {
  const host = req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) return NextResponse.redirect(new URL(`/settings?error=${error}`, req.url));

  const cookieStore = await cookies();
  const savedState = cookieStore.get('oauth_state')?.value;

  if (!state || state !== savedState) {
    return NextResponse.redirect(new URL('/settings?error=invalid_state', req.url));
  }
  if (!code) return NextResponse.redirect(new URL('/settings?error=no_code', req.url));

  try {
    const baseUrl = getBaseUrl(req);
    const config = getThreadsConfig(baseUrl);
    if (!config) throw new Error('Threads not configured');

    const tokens = await exchangeCodeForToken(config, code);

    // Exchange for long-lived token
    const longLivedRes = await fetch(
      `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${config.clientSecret}&access_token=${tokens.access_token}`
    );
    const longLived = await longLivedRes.json();
    const finalToken = longLived.access_token || tokens.access_token;

    const profileRes = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url&access_token=${finalToken}`
    );
    const profile = await profileRes.json();

    connectionsDb.upsert({
      id: uuidv4(),
      platform: 'threads',
      account_name: `@${profile.username}` || profile.name || 'Threads User',
      account_id: profile.id,
      access_token: finalToken,
      refresh_token: null,
      token_expires_at: longLived.expires_in ? Math.floor(Date.now() / 1000) + longLived.expires_in : null,
      avatar_url: profile.threads_profile_picture_url || null,
    });

    return NextResponse.redirect(new URL('/settings?connected=Threads', req.url));
  } catch (err) {
    console.error('Threads OAuth error:', err);
    return NextResponse.redirect(new URL('/settings?error=threads_auth_failed', req.url));
  }
}
