import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getTwitterConfig, exchangeCodeForToken } from '@/lib/platforms/oauth';
import { connectionsDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/settings?error=${error}`, req.url));
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get('oauth_state')?.value;
  const verifier = cookieStore.get('oauth_pkce_verifier')?.value;

  if (!state || state !== savedState) {
    return NextResponse.redirect(new URL('/settings?error=invalid_state', req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/settings?error=no_code', req.url));
  }

  try {
    const config = getTwitterConfig();
    const tokens = await exchangeCodeForToken(config, code, verifier);

    // Fetch user profile
    const profileRes = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,name,username', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();
    const user = profile.data;

    connectionsDb.upsert({
      id: uuidv4(),
      platform: 'twitter',
      account_name: `@${user.username}` || user.name || 'X User',
      account_id: user.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      token_expires_at: tokens.expires_in
        ? Math.floor(Date.now() / 1000) + tokens.expires_in
        : null,
      avatar_url: user.profile_image_url || null,
    });

    return NextResponse.redirect(new URL('/settings?connected=twitter', req.url));
  } catch (err) {
    console.error('Twitter OAuth error:', err);
    return NextResponse.redirect(new URL('/settings?error=twitter_auth_failed', req.url));
  }
}
