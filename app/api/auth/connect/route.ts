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

export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get('platform');
  if (!platform) return NextResponse.json({ error: 'Missing platform' }, { status: 400 });

  const state = generateState();
  const cookieStore = await cookies();
  cookieStore.set('oauth_state', state, { httpOnly: true, maxAge: 600, path: '/' });

  let authUrl: string;

  switch (platform) {
    case 'linkedin': {
      const config = getLinkedInConfig();
      if (!config.clientId) {
        return NextResponse.redirect(
          new URL('/settings?error=linkedin_not_configured', req.url)
        );
      }
      authUrl = buildAuthUrl(config, state);
      break;
    }

    case 'twitter': {
      const config = getTwitterConfig();
      if (!config.clientId) {
        return NextResponse.redirect(
          new URL('/settings?error=twitter_not_configured', req.url)
        );
      }
      const { verifier, challenge } = await generatePKCE();
      cookieStore.set('oauth_pkce_verifier', verifier, { httpOnly: true, maxAge: 600, path: '/' });
      authUrl = buildAuthUrl(config, state, challenge);
      break;
    }

    case 'threads': {
      const config = getThreadsConfig();
      if (!config.clientId) {
        return NextResponse.redirect(
          new URL('/settings?error=threads_not_configured', req.url)
        );
      }
      authUrl = buildAuthUrl(config, state);
      break;
    }

    case 'substack': {
      // Substack uses API key authentication instead of OAuth
      return NextResponse.redirect(new URL('/settings?connect=substack', req.url));
    }

    default:
      return NextResponse.json({ error: 'Unknown platform' }, { status: 400 });
  }

  return NextResponse.redirect(authUrl);
}
