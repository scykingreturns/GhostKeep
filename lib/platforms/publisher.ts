import { PlatformConnection } from '../db';

export type PublishResult = {
  success: boolean;
  platformPostId?: string;
  error?: string;
};

export async function publishToLinkedIn(
  connection: PlatformConnection,
  content: string,
  mediaUrls: string[]
): Promise<PublishResult> {
  try {
    // Get the member's URN first
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${connection.access_token}` },
    });
    if (!profileRes.ok) throw new Error('Failed to get LinkedIn profile');
    const profile = await profileRes.json();
    const authorUrn = `urn:li:person:${profile.sub}`;

    const body: Record<string, unknown> = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content },
          shareMediaCategory: mediaUrls.length > 0 ? 'IMAGE' : 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'LinkedIn post failed');
    }

    const data = await res.json();
    return { success: true, platformPostId: data.id };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function publishToTwitter(
  connection: PlatformConnection,
  content: string,
  _mediaUrls: string[]
): Promise<PublishResult> {
  try {
    const res = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: content }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || err.title || 'Twitter post failed');
    }

    const data = await res.json();
    return { success: true, platformPostId: data.data?.id };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function publishToThreads(
  connection: PlatformConnection,
  content: string,
  mediaUrls: string[]
): Promise<PublishResult> {
  try {
    // Step 1: Create a container
    const containerBody: Record<string, unknown> = {
      media_type: mediaUrls.length > 0 ? 'IMAGE' : 'TEXT',
      text: content,
    };
    if (mediaUrls.length > 0) containerBody.image_url = mediaUrls[0];

    const containerRes = await fetch(
      `https://graph.threads.net/v1.0/${connection.account_id}/threads`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...containerBody,
          access_token: connection.access_token,
        }),
      }
    );

    if (!containerRes.ok) {
      const err = await containerRes.json();
      throw new Error(err.error?.message || 'Threads container creation failed');
    }

    const { id: containerId } = await containerRes.json();

    // Step 2: Publish the container
    const publishRes = await fetch(
      `https://graph.threads.net/v1.0/${connection.account_id}/threads_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: connection.access_token,
        }),
      }
    );

    if (!publishRes.ok) {
      const err = await publishRes.json();
      throw new Error(err.error?.message || 'Threads publish failed');
    }

    const data = await publishRes.json();
    return { success: true, platformPostId: data.id };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function publishToSubstack(
  connection: PlatformConnection,
  content: string,
  title: string | null,
  scheduledAt: number | null
): Promise<PublishResult> {
  try {
    // Substack API requires subdomain-based publishing
    const subdomain = connection.account_id;
    const body: Record<string, unknown> = {
      draft: {
        title: title || 'Untitled Post',
        body_html: `<p>${content.replace(/\n/g, '</p><p>')}</p>`,
        type: 'newsletter',
      },
    };

    if (scheduledAt) {
      body.draft = { ...(body.draft as object), post_date: new Date(scheduledAt * 1000).toISOString() };
    }

    const res = await fetch(`https://${subdomain}.substack.com/api/v1/posts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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
