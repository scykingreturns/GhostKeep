import { credentialsDb } from '../db';

export type PublishResult = {
  success: boolean;
  platformPostId?: string;
  error?: string;
};

// ─── Ayrshare ────────────────────────────────────────────────────────────────
// Ayrshare is a social media API aggregator. The user connects their LinkedIn,
// X, Threads, etc. accounts inside Ayrshare's own dashboard (1-click OAuth),
// then uses a single API key here to post to all of them at once.
// Docs: https://docs.ayrshare.com

const AYRSHARE_BASE = 'https://app.ayrshare.com/api';

// Map our platform names to Ayrshare's platform identifiers
const AYRSHARE_PLATFORM_MAP: Record<string, string> = {
  linkedin: 'linkedin',
  twitter: 'twitter',
  threads: 'threads',
  substack: 'substack',
};

function getAyrshareKey(): string | null {
  const creds = credentialsDb.get('ayrshare');
  return creds?.client_id || null;
}

export async function publishViaAyrshare(
  platforms: string[],
  content: string,
  mediaUrls: string[],
  title: string | null,
  scheduledAt: number | null
): Promise<Record<string, PublishResult>> {
  const apiKey = getAyrshareKey();
  if (!apiKey) {
    const err = 'Ayrshare API key not configured. Go to Settings to add it.';
    return Object.fromEntries(platforms.map((p) => [p, { success: false, error: err }]));
  }

  const ayrsharePlatforms = platforms
    .map((p) => AYRSHARE_PLATFORM_MAP[p])
    .filter(Boolean);

  if (ayrsharePlatforms.length === 0) {
    return Object.fromEntries(
      platforms.map((p) => [p, { success: false, error: `Platform ${p} not supported` }])
    );
  }

  const body: Record<string, unknown> = {
    post: content,
    platforms: ayrsharePlatforms,
  };

  if (mediaUrls.length > 0) {
    body.mediaUrls = mediaUrls;
  }

  if (scheduledAt) {
    body.scheduleDate = new Date(scheduledAt * 1000).toISOString();
  }

  // Substack needs a title
  if (platforms.includes('substack') && title) {
    body.substackOptions = { title };
  }

  try {
    const res = await fetch(`${AYRSHARE_BASE}/post`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      const errMsg = data.message || data.error || 'Ayrshare API error';
      return Object.fromEntries(platforms.map((p) => [p, { success: false, error: errMsg }]));
    }

    // Ayrshare returns per-platform results
    const results: Record<string, PublishResult> = {};
    for (const platform of platforms) {
      const ayrPlatform = AYRSHARE_PLATFORM_MAP[platform];
      const platformResult = data.postIds?.find(
        (r: { platform: string; id?: string; status: string; errors?: { message: string }[] }) =>
          r.platform === ayrPlatform
      );

      if (!platformResult) {
        results[platform] = { success: false, error: 'No result returned for this platform' };
      } else if (platformResult.errors?.length > 0) {
        results[platform] = {
          success: false,
          error: platformResult.errors[0]?.message || 'Platform-specific error',
        };
      } else {
        results[platform] = {
          success: true,
          platformPostId: platformResult.id,
        };
      }
    }
    return results;
  } catch (err) {
    const errMsg = String(err);
    return Object.fromEntries(platforms.map((p) => [p, { success: false, error: errMsg }]));
  }
}

export async function getAyrshareConnectedPlatforms(): Promise<string[]> {
  const apiKey = getAyrshareKey();
  if (!apiKey) return [];

  try {
    const res = await fetch(`${AYRSHARE_BASE}/user`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    // Ayrshare returns activeSocialAccounts array
    return (data.activeSocialAccounts || []) as string[];
  } catch {
    return [];
  }
}

export async function getAyrshareProfile(): Promise<{
  name?: string;
  email?: string;
  activePlatforms: string[];
} | null> {
  const apiKey = getAyrshareKey();
  if (!apiKey) return null;

  try {
    const res = await fetch(`${AYRSHARE_BASE}/user`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      name: data.displayName || data.title,
      email: data.email,
      activePlatforms: data.activeSocialAccounts || [],
    };
  } catch {
    return null;
  }
}
