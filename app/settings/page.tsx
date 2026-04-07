'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PlatformIcon from '@/components/PlatformIcon';

type AyrshareStatus = {
  configured: boolean;
  valid?: boolean;
  name?: string;
  email?: string;
  activePlatforms?: string[];
};

const AYRSHARE_PLATFORM_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  twitter: 'X (Twitter)',
  threads: 'Threads',
  substack: 'Substack',
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  pinterest: 'Pinterest',
  reddit: 'Reddit',
  telegram: 'Telegram',
};

const SUPPORTED_PLATFORMS = ['linkedin', 'twitter', 'threads', 'substack'];

function PlatformDot({ platform, active }: { platform: string; active: boolean }) {
  const label = AYRSHARE_PLATFORM_LABELS[platform] || platform;
  const icons: Record<string, React.ReactNode> = {
    linkedin: <PlatformIcon platform="linkedin" size={16} />,
    twitter: <PlatformIcon platform="twitter" size={16} />,
    threads: <PlatformIcon platform="threads" size={16} />,
    substack: <PlatformIcon platform="substack" size={16} />,
  };

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
        active
          ? 'bg-green-50 border-green-200 text-green-800'
          : 'bg-gray-50 border-gray-200 text-gray-400'
      }`}
    >
      <span className={active ? '' : 'opacity-30'}>{icons[platform] || null}</span>
      {label}
      {active && <span className="w-1.5 h-1.5 rounded-full bg-green-500 ml-0.5" />}
    </div>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<AyrshareStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(
    searchParams.get('connected')
      ? `${searchParams.get('connected')} connected!`
      : null
  );

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/ayrshare-status');
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ configured: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleSaveKey = async () => {
    if (!apiKey.trim()) { setError('Please paste your API key first.'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/credentials/ayrshare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // We store the key as client_id; client_secret is unused
        body: JSON.stringify({ client_id: apiKey.trim(), client_secret: 'n/a' }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setApiKey('');
      await loadStatus();
      setNotification('API key saved! Your connected platforms should appear below.');
    } catch {
      setError('Failed to save the key. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveKey = async () => {
    if (!confirm('Remove your Ayrshare API key? GhostKeep will no longer be able to post.')) return;
    setRemoving(true);
    await fetch('/api/credentials/ayrshare', { method: 'DELETE' });
    setStatus({ configured: false });
    setRemoving(false);
  };

  const activePlatforms = status?.activePlatforms || [];
  const supportedActive = activePlatforms.filter((p) => SUPPORTED_PLATFORMS.includes(p));

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-6 py-5 bg-white border-b border-gray-200 shrink-0">
        <h1 className="text-xl font-bold text-gray-900">Platform Connections</h1>
        <p className="text-sm text-gray-500 mt-0.5">Connect your social accounts to start scheduling</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-5">

          {notification && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-800 text-sm font-medium">
                <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {notification}
              </div>
              <button onClick={() => setNotification(null)} className="text-green-600 opacity-60 hover:opacity-100 p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !status?.configured ? (
            /* ── Step-by-step setup ── */
            <div className="space-y-4">
              {/* Explainer */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h2 className="font-bold text-gray-900 text-lg mb-1">How connecting works</h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  LinkedIn, X, Threads, and Substack only allow authorized apps to post on your behalf.
                  Rather than making you register a developer app yourself, GhostKeep uses{' '}
                  <strong>Ayrshare</strong> — a service that has already done that for every platform.
                  You connect your accounts inside Ayrshare (which is just clicking a button, no technical
                  knowledge needed), then paste one API key here. That&apos;s it.
                </p>
              </div>

              {/* Step 1 */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                    1
                  </div>
                  <h3 className="font-semibold text-gray-900">Create a free Ayrshare account</h3>
                </div>
                <div className="px-6 py-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Just an email address and password — no credit card required for the free tier.
                  </p>
                  <a
                    href="https://app.ayrshare.com/register"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Sign up for Ayrshare (free)
                  </a>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                    2
                  </div>
                  <h3 className="font-semibold text-gray-900">Connect your social accounts inside Ayrshare</h3>
                </div>
                <div className="px-6 py-4">
                  <p className="text-sm text-gray-600 mb-3">
                    Once you&apos;re signed in to Ayrshare, you&apos;ll see a dashboard with buttons for each
                    platform. Just click the one you want — it opens that platform&apos;s own login/authorize
                    page, you click Allow, and you&apos;re connected. Repeat for each platform.
                  </p>
                  <div className="flex gap-2 flex-wrap mb-4">
                    {SUPPORTED_PLATFORMS.map((p) => (
                      <div key={p} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-600">
                        <PlatformIcon platform={p as 'linkedin' | 'twitter' | 'threads' | 'substack'} size={14} />
                        {AYRSHARE_PLATFORM_LABELS[p]}
                      </div>
                    ))}
                  </div>
                  <a
                    href="https://app.ayrshare.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open Ayrshare Dashboard
                  </a>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                    3
                  </div>
                  <h3 className="font-semibold text-gray-900">Paste your Ayrshare API key here</h3>
                </div>
                <div className="px-6 py-4">
                  <p className="text-sm text-gray-600 mb-1">
                    In Ayrshare, go to{' '}
                    <a
                      href="https://app.ayrshare.com/settings/developer"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 underline hover:text-indigo-800"
                    >
                      Settings → Developer
                    </a>
                    . Copy the <strong>API Key</strong> shown there and paste it below.
                  </p>
                  <p className="text-xs text-gray-400 mb-4">It looks like: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">AY-xxxxxxxxxxxx</code></p>

                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => { setApiKey(e.target.value); setError(null); }}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
                      placeholder="Paste your API key..."
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      autoComplete="off"
                    />
                    <button
                      onClick={handleSaveKey}
                      disabled={saving || !apiKey.trim()}
                      className="px-5 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2 shrink-0"
                    >
                      {saving ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      Save
                    </button>
                  </div>
                  {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                </div>
              </div>
            </div>
          ) : (
            /* ── Connected state ── */
            <div className="space-y-4">
              {/* Status card */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-6 py-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">
                      {status?.valid === false ? 'API key invalid' : 'Ayrshare connected'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {status?.valid === false
                        ? 'The saved API key was rejected. Please update it.'
                        : status?.email
                        ? `Signed in as ${status.email}`
                        : 'GhostKeep can post to your connected platforms'}
                    </p>
                  </div>
                  <a
                    href="https://app.ayrshare.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors shrink-0"
                  >
                    Manage ↗
                  </a>
                </div>

                {/* Connected platforms */}
                {activePlatforms.length > 0 && (
                  <div className="border-t border-gray-100 px-6 py-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Connected platforms
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {SUPPORTED_PLATFORMS.map((p) => (
                        <PlatformDot
                          key={p}
                          platform={p}
                          active={activePlatforms.includes(p)}
                        />
                      ))}
                    </div>
                    {supportedActive.length < SUPPORTED_PLATFORMS.length && (
                      <p className="text-xs text-gray-400 mt-3">
                        Platforms shown as faded are not yet connected.{' '}
                        <a
                          href="https://app.ayrshare.com/dashboard"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-500 underline"
                        >
                          Connect them in Ayrshare
                        </a>{' '}
                        (just click a button for each one).
                      </p>
                    )}
                  </div>
                )}

                {activePlatforms.length === 0 && status?.valid !== false && (
                  <div className="border-t border-gray-100 px-6 py-4 bg-amber-50">
                    <p className="text-sm text-amber-800">
                      <strong>No platforms connected yet.</strong>{' '}
                      <a
                        href="https://app.ayrshare.com/dashboard"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-amber-900"
                      >
                        Open Ayrshare
                      </a>{' '}
                      and click the LinkedIn, X, Threads, or Substack buttons to connect them. It takes one click per platform.
                    </p>
                  </div>
                )}
              </div>

              {/* Update key */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <p className="text-sm font-semibold text-gray-700 mb-1">Update API key</p>
                <p className="text-xs text-gray-400 mb-3">
                  Your key is stored securely. Paste a new one below to replace it.
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => { setApiKey(e.target.value); setError(null); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
                    placeholder="Paste new API key..."
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <button
                    onClick={handleSaveKey}
                    disabled={saving || !apiKey.trim()}
                    className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shrink-0"
                  >
                    {saving ? 'Saving...' : 'Update'}
                  </button>
                </div>
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

                <button
                  onClick={handleRemoveKey}
                  disabled={removing}
                  className="mt-3 text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
                >
                  {removing ? 'Removing...' : 'Remove API key'}
                </button>
              </div>
            </div>
          )}
        </div>
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
