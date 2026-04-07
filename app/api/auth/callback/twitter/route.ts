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
    const config = getConfig('twitter', appUrl)!;
    const verifier = cookieStore.get('oauth_pkce_verifier')?.value;
    const tokens = await exchangeCodeForToken(config, code, verifier);

    const profileRes = await fetch(
      'https://api.twitter.com/2/users/me?user.fields=profile_image_url,name,username',
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    const { data: user } = await profileRes.json();

    connectionsDb.upsert({
      id: uuidv4(),
      platform: 'twitter',
      account_name: `@${user.username}`,
      account_id: user.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      token_expires_at: tokens.expires_in ? Math.floor(Date.now() / 1000) + tokens.expires_in : null,
      avatar_url: user.profile_image_url || null,
    });

    return NextResponse.redirect(new URL('/settings?connected=X+%28Twitter%29', req.url));
  } catch (err) {
    console.error('Twitter callback error:', err);
    return NextResponse.redirect(new URL('/settings?error=twitter_failed', req.url));
  }
}
