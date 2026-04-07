import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getConfig, getBaseUrl, buildAuthUrl, generateState, generatePKCE } from '@/lib/platforms/oauth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get('platform');
  if (!platform) return NextResponse.json({ error: 'Missing platform' }, { status: 400 });

  const appUrl = getBaseUrl(req);
  const config = getConfig(platform, appUrl);
  if (!config) {
    return NextResponse.redirect(new URL(`/settings?error=${platform}_not_configured`, req.url));
  }

  const state = generateState();
  const cookieStore = await cookies();
  cookieStore.set('oauth_state', state, { httpOnly: true, maxAge: 600, path: '/' });

  let authUrl: string;
  if (platform === 'twitter') {
    const { verifier, challenge } = await generatePKCE();
    cookieStore.set('oauth_pkce_verifier', verifier, { httpOnly: true, maxAge: 600, path: '/' });
    authUrl = buildAuthUrl(config, state, challenge);
  } else {
    authUrl = buildAuthUrl(config, state);
  }

  return NextResponse.redirect(authUrl);
}
