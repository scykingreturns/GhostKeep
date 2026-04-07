import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getConfig, getBaseUrl, exchangeCodeForToken } from '@/lib/platforms/oauth';
import { connectionsDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  if (searchParams.get('error')) return NextResponse.redirect(new URL('/settings?error=auth_cancelled', req.url));

  const cookieStore = await cookies();
  if (!state || state !== cookieStore.get('oauth_state')?.value)
    return NextResponse.redirect(new URL('/settings?error=invalid_state', req.url));
  if (!code) return NextResponse.redirect(new URL('/settings?error=no_code', req.url));

  try {
    const appUrl = getBaseUrl(req);
    const config = getConfig('threads', appUrl)!;
    const tokens = await exchangeCodeForToken(config, code);

    const llRes = await fetch(
      `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${config.clientSecret}&access_token=${tokens.access_token}`
    );
    const ll = await llRes.json();
    const finalToken = ll.access_token || tokens.access_token;

    const profileRes = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url&access_token=${finalToken}`
    );
    const profile = await profileRes.json();

    connectionsDb.upsert({
      id: uuidv4(),
      platform: 'threads',
      account_name: `@${profile.username}`,
      account_id: profile.id,
      access_token: finalToken,
      refresh_token: null,
      token_expires_at: ll.expires_in ? Math.floor(Date.now() / 1000) + ll.expires_in : null,
      avatar_url: profile.threads_profile_picture_url || null,
    });

    return NextResponse.redirect(new URL('/settings?connected=Threads', req.url));
  } catch (err) {
    console.error('Threads callback error:', err);
    return NextResponse.redirect(new URL('/settings?error=threads_failed', req.url));
  }
}
