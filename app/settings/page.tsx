'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PlatformIcon from '@/components/PlatformIcon';
import { Platform, PLATFORMS } from '@/lib/platforms/types';

type Connection = {
  id: string;
  platform: string;
  account_name: string;
  account_id: string;
  token_expires_at: number | null;
  avatar_url: string | null;
  connected_at: number;
};

type EnvStatus = {
  linkedin: boolean;
  twitter: boolean;
  threads: boolean;
};

function SettingsContent() {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [envStatus, setEnvStatus] = useState<EnvStatus>({ linkedin: false, twitter: false, threads: false });
  const [substackForm, setSubstackForm] = useState({ subdomain: '', token: '' });
  const [substackLoading, setSubstackLoading] = useState(false);
  const [substackError, setSubstackError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const connectedParam = searchParams.get('connected');
  const errorParam = searchParams.get('error');

  useEffect(() => {
    if (connectedParam) {
      setNotification({ type: 'success', message: `${connectedParam} connected successfully!` });
    } else if (errorParam) {
      const messages: Record<string, string> = {
        invalid_state: 'OAuth state mismatch. Please try again.',
        no_code: 'Authorization was cancelled.',
        linkedin_not_configured: 'LinkedIn OAuth credentials not configured. See setup guide below.',
        twitter_not_configured: 'X/Twitter OAuth credentials not configured. See setup guide below.',
        threads_not_configured: 'Threads OAuth credentials not configured. See setup guide below.',
        linkedin_auth_failed: 'LinkedIn authentication failed. Check your OAuth credentials.',
        twitter_auth_failed: 'X/Twitter authentication failed. Check your OAuth credentials.',
        threads_auth_failed: 'Threads authentication failed. Check your OAuth credentials.',
      };
      setNotification({ type: 'error', message: messages[errorParam] || `Error: ${errorParam}` });
    }
  }, [connectedParam, errorParam]);

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/connections');
      const data = await res.json();
      setConnections(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEnvStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/env-status');
      if (res.ok) setEnvStatus(await res.json());
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    fetchConnections();
    fetchEnvStatus();
  }, [fetchConnections, fetchEnvStatus]);

  const handleDisconnect = async (id: string, platform: string) => {
    if (!confirm(`Disconnect this ${platform} account?`)) return;
    await fetch(`/api/connections/${id}`, { method: 'DELETE' });
    setConnections((prev) => prev.filter((c) => c.id !== id));
    setNotification({ type: 'success', message: `${platform} account disconnected.` });
  };

  const handleSubstackConnect = async () => {
    if (!substackForm.subdomain || !substackForm.token) {
      setSubstackError('Both subdomain and API token are required.');
      return;
    }
    setSubstackLoading(true);
    setSubstackError(null);
    try {
      const res = await fetch('/api/auth/substack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: substackForm.subdomain, token: substackForm.token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Connection failed');
      setSubstackForm({ subdomain: '', token: '' });
      setNotification({ type: 'success', message: 'Substack connected!' });
      fetchConnections();
    } catch (err) {
      setSubstackError(String(err).replace('Error: ', ''));
    } finally {
      setSubstackLoading(false);
    }
  };

  const platformConnections = (platform: string) =>
    connections.filter((c) => c.platform === platform);

  const platformSetupGuide: Record<string, { steps: string[]; docsUrl: string }> = {
    linkedin: {
      steps: [
        'Go to the LinkedIn Developer Portal and create a new app',
        'Add "Sign In with LinkedIn using OpenID Connect" and "Share on LinkedIn" products',
        'Set the authorized redirect URL to: {APP_URL}/api/auth/callback/linkedin',
        'Copy the Client ID and Client Secret',
        'Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in your .env.local',
      ],
      docsUrl: 'https://developer.linkedin.com',
    },
    twitter: {
      steps: [
        'Go to the Twitter Developer Portal and create a project/app',
        'Enable OAuth 2.0 with "Read and Write" permissions',
        'Add the callback URL: {APP_URL}/api/auth/callback/twitter',
        'Copy the Client ID and Client Secret',
        'Set TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET in your .env.local',
      ],
      docsUrl: 'https://developer.twitter.com',
    },
    threads: {
      steps: [
        'Go to the Meta for Developers portal and create a new app',
        'Add the Threads API product',
        'Configure the valid OAuth redirect URI: {APP_URL}/api/auth/callback/threads',
        'Copy the App ID and App Secret',
        'Set THREADS_APP_ID and THREADS_APP_SECRET in your .env.local',
      ],
      docsUrl: 'https://developers.facebook.com/docs/threads',
    },
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <h1 className="text-xl font-bold text-gray-900">Platform Connections</h1>
        <p className="text-sm text-gray-500 mt-0.5">Connect your social media accounts to publish content</p>
      </div>

      <div className="flex-1 overflow-auto p-6 max-w-3xl">
        {/* Notification */}
        {notification && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-center justify-between ${
              notification.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* OAuth Platforms */}
            {(['linkedin', 'twitter', 'threads'] as const).map((platformId) => {
              const platform = PLATFORMS[platformId];
              const conns = platformConnections(platformId);
              const configured = envStatus[platformId];
              const guide = platformSetupGuide[platformId];

              return (
                <div key={platformId} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: platform.color + '15' }}
                      >
                        <PlatformIcon platform={platformId} size={22} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{platform.name}</h3>
                        <p className="text-xs text-gray-500">
                          {conns.length > 0
                            ? `${conns.length} account${conns.length > 1 ? 's' : ''} connected`
                            : 'Not connected'}
                        </p>
                      </div>
                    </div>
                    {configured ? (
                      <a
                        href={`/api/auth/connect?platform=${platformId}`}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                        style={{ backgroundColor: platform.color }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Connect Account
                      </a>
                    ) : (
                      <span className="text-xs bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-lg border border-yellow-200 font-medium">
                        Setup required
                      </span>
                    )}
                  </div>

                  {/* Connected accounts */}
                  {conns.length > 0 && (
                    <div className="border-t border-gray-100 divide-y divide-gray-100">
                      {conns.map((conn) => (
                        <div key={conn.id} className="px-5 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {conn.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={conn.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-bold">
                                {conn.account_name[0]?.toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900">{conn.account_name}</p>
                              {conn.token_expires_at && (
                                <p className="text-xs text-gray-400">
                                  Token expires {new Date(conn.token_expires_at * 1000).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDisconnect(conn.id, platform.name)}
                            className="text-xs text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors font-medium"
                          >
                            Disconnect
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Setup guide */}
                  {!configured && (
                    <div className="border-t border-gray-100 p-5 bg-gray-50">
                      <p className="text-sm font-semibold text-gray-700 mb-3">Setup Instructions</p>
                      <ol className="list-decimal list-inside space-y-1.5">
                        {guide.steps.map((step, i) => (
                          <li key={i} className="text-xs text-gray-600">
                            {step.replace('{APP_URL}', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Substack — API key based */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                    <PlatformIcon platform="substack" size={22} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Substack</h3>
                    <p className="text-xs text-gray-500">
                      {platformConnections('substack').length > 0
                        ? `${platformConnections('substack').length} publication connected`
                        : 'Not connected'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Connected substacks */}
              {platformConnections('substack').length > 0 && (
                <div className="border-t border-gray-100 divide-y divide-gray-100">
                  {platformConnections('substack').map((conn) => (
                    <div key={conn.id} className="px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-sm font-bold">
                          S
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{conn.account_name}.substack.com</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDisconnect(conn.id, 'Substack')}
                        className="text-xs text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors font-medium"
                      >
                        Disconnect
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Substack connection form */}
              <div className="border-t border-gray-100 p-5">
                <p className="text-sm font-semibold text-gray-700 mb-1">Connect a Substack Publication</p>
                <p className="text-xs text-gray-500 mb-4">
                  Enter your Substack subdomain and API token to connect your publication.
                  Find your API token in Substack Settings → API.
                </p>
                <div className="flex gap-3 flex-wrap">
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-xs text-gray-600 mb-1 font-medium">Subdomain</label>
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent">
                      <input
                        type="text"
                        value={substackForm.subdomain}
                        onChange={(e) => setSubstackForm((f) => ({ ...f, subdomain: e.target.value }))}
                        placeholder="yourname"
                        className="flex-1 px-3 py-2 text-sm focus:outline-none"
                      />
                      <span className="px-2 bg-gray-50 border-l border-gray-200 text-xs text-gray-500 py-2">.substack.com</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs text-gray-600 mb-1 font-medium">API Token</label>
                    <input
                      type="password"
                      value={substackForm.token}
                      onChange={(e) => setSubstackForm((f) => ({ ...f, token: e.target.value }))}
                      placeholder="sk_..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleSubstackConnect}
                      disabled={substackLoading}
                      className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                    >
                      {substackLoading ? 'Connecting...' : 'Connect'}
                    </button>
                  </div>
                </div>
                {substackError && (
                  <p className="mt-2 text-xs text-red-600">{substackError}</p>
                )}
              </div>
            </div>

            {/* Environment Variables Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-blue-800 mb-1">Environment Variables</p>
                  <p className="text-xs text-blue-700 mb-3">
                    Add these to your <code className="bg-blue-100 px-1 rounded">.env.local</code> file:
                  </p>
                  <pre className="text-xs text-blue-800 bg-blue-100 rounded-lg p-3 overflow-x-auto leading-relaxed">
{`NEXT_PUBLIC_APP_URL=http://localhost:3000

# LinkedIn
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret

# X / Twitter
TWITTER_CLIENT_ID=your_client_id
TWITTER_CLIENT_SECRET=your_client_secret

# Threads (Meta)
THREADS_APP_ID=your_app_id
THREADS_APP_SECRET=your_app_secret`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
