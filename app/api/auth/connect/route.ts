import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  getLinkedInConfig,
  getTwitterConfig,
  getThreadsConfig,
  buildAuthUrl,
  generateState,
  generatePKCE,
} from '@/lib/platforms/oauth';

function getBaseUrl(req: NextRequest): string {
  const host = req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get('platform');
  if (!platform) return NextResponse.json({ error: 'Missing platform' }, { status: 400 });

  const baseUrl = getBaseUrl(req);
  const state = generateState();
  const cookieStore = await cookies();
  cookieStore.set('oauth_state', state, { httpOnly: true, maxAge: 600, path: '/' });

  let authUrl: string;

  switch (platform) {
    case 'linkedin': {
      const config = getLinkedInConfig(baseUrl);
      if (!config) {
        return NextResponse.redirect(new URL('/settings?error=linkedin_not_configured', req.url));
      }
      authUrl = buildAuthUrl(config, state);
      break;
    }

    case 'twitter': {
      const config = getTwitterConfig(baseUrl);
      if (!config) {
        return NextResponse.redirect(new URL('/settings?error=twitter_not_configured', req.url));
      }
      const { verifier, challenge } = await generatePKCE();
      cookieStore.set('oauth_pkce_verifier', verifier, { httpOnly: true, maxAge: 600, path: '/' });
      authUrl = buildAuthUrl(config, state, challenge);
      break;
    }

    case 'threads': {
      const config = getThreadsConfig(baseUrl);
      if (!config) {
        return NextResponse.redirect(new URL('/settings?error=threads_not_configured', req.url));
      }
      authUrl = buildAuthUrl(config, state);
      break;
    }

    case 'substack':
      return NextResponse.redirect(new URL('/settings?connect=substack', req.url));

    default:
      return NextResponse.json({ error: 'Unknown platform' }, { status: 400 });
  }

  return NextResponse.redirect(authUrl);
}
