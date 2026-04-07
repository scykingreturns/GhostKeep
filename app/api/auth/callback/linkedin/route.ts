import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getConfig, getBaseUrl, exchangeCodeForToken } from '@/lib/platforms/oauth';
import { connectionsDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

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
    const config = getConfig('linkedin', appUrl)!;
    const tokens = await exchangeCodeForToken(config, code);

    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();

    connectionsDb.upsert({
      id: uuidv4(),
      platform: 'linkedin',
      account_name: profile.name || profile.email || 'LinkedIn Account',
      account_id: profile.sub,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      token_expires_at: tokens.expires_in ? Math.floor(Date.now() / 1000) + tokens.expires_in : null,
      avatar_url: profile.picture || null,
    });

    return NextResponse.redirect(new URL('/settings?connected=LinkedIn', req.url));
  } catch (err) {
    console.error('LinkedIn callback error:', err);
    return NextResponse.redirect(new URL('/settings?error=linkedin_failed', req.url));
  }
}
