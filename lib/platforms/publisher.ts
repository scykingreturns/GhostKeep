import { credentialsDb } from '../db';

export type PublishResult = {
  success: boolean;
  platformPostId?: string;
  error?: string;
};

function getToken(platform: string): string | null {
  const creds = credentialsDb.get(platform);
  return creds?.client_secret || null; // access token stored in client_secret field for connections
}

// ─── LinkedIn ─────────────────────────────────────────────────────────────────

export async function publishToLinkedIn(
  accessToken: string,
  accountId: string,
  content: string,
): Promise<PublishResult> {
  try {
    const authorUrn = `urn:li:person:${accountId}`;
    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: content },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'LinkedIn post failed');
    }
    const data = await res.json();
    return { success: true, platformPostId: data.id };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ─── Twitter / X ─────────────────────────────────────────────────────────────

export async function publishToTwitter(
  accessToken: string,
  content: string,
): Promise<PublishResult> {
  try {
    const res = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: content }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.title || 'Twitter post failed');
    }
    const data = await res.json();
    return { success: true, platformPostId: data.data?.id };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ─── Threads ─────────────────────────────────────────────────────────────────

export async function publishToThreads(
  accessToken: string,
  accountId: string,
  content: string,
): Promise<PublishResult> {
  try {
    const containerRes = await fetch(
      `https://graph.threads.net/v1.0/${accountId}/threads`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_type: 'TEXT', text: content, access_token: accessToken }),
      }
    );
    if (!containerRes.ok) {
      const err = await containerRes.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Threads container creation failed');
    }
    const { id: containerId } = await containerRes.json();

    const publishRes = await fetch(
      `https://graph.threads.net/v1.0/${accountId}/threads_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: containerId, access_token: accessToken }),
      }
    );
    if (!publishRes.ok) {
      const err = await publishRes.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Threads publish failed');
    }
    const data = await publishRes.json();
    return { success: true, platformPostId: data.id };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ─── Substack ─────────────────────────────────────────────────────────────────
// Substack does not have an official public posting API.
// This uses their internal API which may change without notice.

export async function publishToSubstack(
  accessToken: string,
  subdomain: string,
  content: string,
  title: string | null,
): Promise<PublishResult> {
  try {
    const res = await fetch(`https://${subdomain}.substack.com/api/v1/posts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        draft: {
          title: title || 'Untitled',
          body_html: `<p>${content.replace(/\n/g, '</p><p>')}</p>`,
          type: 'newsletter',
        },
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Substack post failed');
    }
    const data = await res.json();
    return { success: true, platformPostId: String(data.id) };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// Suppress unused warning — getToken kept for future use
void getToken;
