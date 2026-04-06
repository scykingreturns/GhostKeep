import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getLinkedInConfig, exchangeCodeForToken } from '@/lib/platforms/oauth';
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
  if (!state || state !== savedState) {
    return NextResponse.redirect(new URL('/settings?error=invalid_state', req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/settings?error=no_code', req.url));
  }

  try {
    const config = getLinkedInConfig();
    const tokens = await exchangeCodeForToken(config, code);

    // Fetch user profile
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();

    connectionsDb.upsert({
      id: uuidv4(),
      platform: 'linkedin',
      account_name: profile.name || profile.email || 'LinkedIn User',
      account_id: profile.sub,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      token_expires_at: tokens.expires_in
        ? Math.floor(Date.now() / 1000) + tokens.expires_in
        : null,
      avatar_url: profile.picture || null,
    });

    return NextResponse.redirect(new URL('/settings?connected=linkedin', req.url));
  } catch (err) {
    console.error('LinkedIn OAuth error:', err);
    return NextResponse.redirect(new URL('/settings?error=linkedin_auth_failed', req.url));
  }
}
