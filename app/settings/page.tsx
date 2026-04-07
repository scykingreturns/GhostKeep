'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PlatformIcon from '@/components/PlatformIcon';

// ─── Types ───────────────────────────────────────────────────────────────────

type Platform = 'linkedin' | 'twitter' | 'threads' | 'substack';

type Connection = {
  id: string;
  platform: string;
  account_name: string;
  account_id: string;
  token_expires_at: number | null;
  avatar_url: string | null;
  connected_at: number;
};

type PlatformState = {
  configured: boolean;
  client_id?: string;
  connections: Connection[];
};

// ─── Platform metadata ───────────────────────────────────────────────────────

const PLATFORM_META: Record<
  Platform,
  {
    name: string;
    color: string;
    tagline: string;
    devPortalUrl: string;
    devPortalLabel: string;
    steps: string[];
    clientIdLabel: string;
    clientSecretLabel: string;
  }
> = {
  linkedin: {
    name: 'LinkedIn',
    color: '#0A66C2',
    tagline: 'Share professional updates',
    devPortalUrl: 'https://www.linkedin.com/developers/apps/new',
    devPortalLabel: 'Open LinkedIn Developer Portal',
    clientIdLabel: 'Client ID',
    clientSecretLabel: 'Client Secret',
    steps: [
      'Click the button below to open the LinkedIn Developer Portal.',
      'Sign in and click "Create app". Give it any name (e.g. "My Scheduler") and attach it to a LinkedIn Page (create a dummy one if needed).',
      'Once created, go to the "Auth" tab. Copy the Client ID and Client Secret from there.',
      'Still on "Auth", scroll to "OAuth 2.0 settings" and add this Redirect URL:',
      'Go to the "Products" tab and request access to "Share on LinkedIn" and "Sign In with LinkedIn using OpenID Connect". These are usually approved instantly.',
      'Paste your Client ID and Client Secret below, then click Save.',
    ],
  },
  twitter: {
    name: 'X (Twitter)',
    color: '#000000',
    tagline: 'Post tweets and threads',
    devPortalUrl: 'https://developer.twitter.com/en/portal/apps/new',
    devPortalLabel: 'Open X Developer Portal',
    clientIdLabel: 'Client ID (OAuth 2.0)',
    clientSecretLabel: 'Client Secret (OAuth 2.0)',
    steps: [
      'Click the button below to open the X Developer Portal. You need a free developer account — sign up if you don\'t have one.',
      'Create a new project and app. Give it any name.',
      'In your app settings, find "User authentication settings" and click Set up.',
      'Set App permissions to "Read and Write". Type of App: "Web App". Add this Callback URL:',
      'Go to "Keys and Tokens" tab. Under "OAuth 2.0 Client ID and Client Secret", click "Generate" if needed.',
      'Copy the Client ID and Client Secret and paste them below, then click Save.',
    ],
  },
  threads: {
    name: 'Threads',
    color: '#000000',
    tagline: 'Publish to Meta Threads',
    devPortalUrl: 'https://developers.facebook.com/apps/creation/',
    devPortalLabel: 'Open Meta Developer Portal',
    clientIdLabel: 'App ID',
    clientSecretLabel: 'App Secret',
    steps: [
      'Click the button below to open the Meta Developer Portal. Sign in with your Facebook account.',
      'Click "Create App". Select "Other" for use case, then "Consumer" as the app type.',
      'Once created, click "Add Product" and find "Threads API" — click Set Up.',
      'In Threads API settings, add this as a valid OAuth Redirect URI:',
      'Go to App Settings → Basic. Copy your App ID and App Secret.',
      'Paste the App ID and App Secret below, then click Save.',
    ],
  },
  substack: {
    name: 'Substack',
    color: '#FF6719',
    tagline: 'Publish newsletters',
    devPortalUrl: 'https://substack.com/account/settings',
    devPortalLabel: 'Open Substack Settings',
    clientIdLabel: 'Subdomain (e.g. yourname)',
    clientSecretLabel: 'API Token',
    steps: [
      'Click the button below to open your Substack account settings.',
      'Scroll down to find the "API" or "Publication API" section.',
      'Copy your API token (it starts with sk_...).',
      'Enter your Substack subdomain (the part before .substack.com) and paste your API token below.',
    ],
  },
};

// ─── Setup Wizard Modal ───────────────────────────────────────────────────────

function SetupWizard({
  platform,
  redirectUri,
  existingClientId,
  onClose,
  onSaved,
}: {
  platform: Platform;
  redirectUri: string;
  existingClientId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const meta = PLATFORM_META[platform];
  const isSubstack = platform === 'substack';

  const [clientId, setClientId] = useState(existingClientId || '');
  const [clientSecret, setClientSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState(0);

  const copyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Steps that involve the redirect URI get a special inline component
  const REDIRECT_STEP = isSubstack ? -1 : 3; // step index that shows redirect URI

  const handleSave = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      setError('Both fields are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/credentials/${platform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId.trim(), client_secret: clientSecret.trim() }),
      });
      if (!res.ok) throw new Error('Failed to save');
      onSaved();
    } catch {
      setError('Failed to save credentials. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const steps = meta.steps;
  const isLastStep = step === steps.length - 1;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 flex items-center gap-3 border-b border-gray-100">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: meta.color + '15' }}
          >
            <PlatformIcon platform={platform} size={22} />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-gray-900">Connect {meta.name}</h2>
            <p className="text-xs text-gray-500">One-time setup · takes ~2 minutes</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 -mr-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step progress */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-indigo-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            Step {step + 1} of {steps.length}
          </p>
        </div>

        {/* Step content */}
        <div className="px-6 py-4 min-h-[160px]">
          <p className="text-sm text-gray-700 leading-relaxed mb-4">{steps[step]}</p>

          {/* Redirect URI display — shown on step 3 (or 4 for some) */}
          {step === REDIRECT_STEP && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-2">
              <code className="text-xs text-gray-800 flex-1 break-all">{redirectUri}</code>
              <button
                onClick={copyRedirectUri}
                className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  copied ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          )}

          {/* Credentials form — shown on last step */}
          {isLastStep && (
            <div className="space-y-3 mt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{meta.clientIdLabel}</label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder={isSubstack ? 'yourname' : 'Paste here...'}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  autoFocus
                />
                {isSubstack && (
                  <p className="text-xs text-gray-400 mt-1">Just the subdomain, not the full URL</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{meta.clientSecretLabel}</label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Paste here..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex items-center gap-3">
          {/* Dev portal button — shown on first step */}
          {step === 0 && (
            <a
              href={meta.devPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors"
              style={{ backgroundColor: meta.color }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {meta.devPortalLabel}
            </a>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                Back
              </button>
            )}
            {!isLastStep ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save & Connect
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Platform Card ────────────────────────────────────────────────────────────

function PlatformCard({
  platform,
  state,
  redirectUri,
  onSetupSaved,
  onDisconnect,
  onRemoveCreds,
}: {
  platform: Platform;
  state: PlatformState;
  redirectUri: string;
  onSetupSaved: () => void;
  onDisconnect: (id: string) => void;
  onRemoveCreds: () => void;
}) {
  const meta = PLATFORM_META[platform];
  const [showWizard, setShowWizard] = useState(false);

  const handleWizardSaved = () => {
    setShowWizard(false);
    onSetupSaved();
  };

  return (
    <>
      {showWizard && (
        <SetupWizard
          platform={platform}
          redirectUri={redirectUri}
          existingClientId={state.client_id}
          onClose={() => setShowWizard(false)}
          onSaved={handleWizardSaved}
        />
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-sm transition-shadow">
        {/* Card header */}
        <div className="p-5 flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: meta.color + '12' }}
          >
            <PlatformIcon platform={platform} size={26} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-base">{meta.name}</h3>
              {state.connections.length > 0 && (
                <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  Connected
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{meta.tagline}</p>
          </div>

          {/* Action button */}
          <div className="shrink-0">
            {state.connections.length > 0 ? (
              // Already connected — show an "Add another" option
              platform !== 'substack' ? (
                <a
                  href={`/api/auth/connect?platform=${platform}`}
                  className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  + Add account
                </a>
              ) : (
                <button
                  onClick={() => setShowWizard(true)}
                  className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  + Add publication
                </button>
              )
            ) : state.configured ? (
              // Credentials saved — show big Connect button
              <a
                href={`/api/auth/connect?platform=${platform}`}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-md hover:opacity-90 transition-opacity"
                style={{ backgroundColor: meta.color }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Connect {meta.name}
              </a>
            ) : (
              // Not configured — show setup button
              <button
                onClick={() => setShowWizard(true)}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-md hover:opacity-90 transition-opacity"
                style={{ backgroundColor: meta.color }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Set up {meta.name}
              </button>
            )}
          </div>
        </div>

        {/* Connected accounts list */}
        {state.connections.length > 0 && (
          <div className="border-t border-gray-100 divide-y divide-gray-50">
            {state.connections.map((conn) => (
              <div key={conn.id} className="px-5 py-3 flex items-center gap-3">
                {conn.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={conn.avatar_url} alt="" className="w-8 h-8 rounded-full shrink-0" />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: meta.color }}
                  >
                    {conn.account_name[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{conn.account_name}</p>
                  {conn.token_expires_at && (
                    <p className="text-xs text-gray-400">
                      Token expires {new Date(conn.token_expires_at * 1000).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onDisconnect(conn.id)}
                  className="text-xs text-gray-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors font-medium shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Reconfigure link */}
        {state.configured && state.connections.length === 0 && (
          <div className="border-t border-gray-50 px-5 py-2 flex items-center justify-between">
            <p className="text-xs text-gray-400">App credentials saved</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowWizard(true)}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium"
              >
                Edit credentials
              </button>
              <button
                onClick={onRemoveCreds}
                className="text-xs text-red-400 hover:text-red-600 font-medium"
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function SettingsContent() {
  const searchParams = useSearchParams();
  const [platformStates, setPlatformStates] = useState<Record<Platform, PlatformState>>({
    linkedin: { configured: false, connections: [] },
    twitter: { configured: false, connections: [] },
    threads: { configured: false, connections: [] },
    substack: { configured: false, connections: [] },
  });
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [redirectUri, setRedirectUri] = useState('');

  // Auto-detect the app URL for redirect URIs
  useEffect(() => {
    setRedirectUri(window.location.origin);
  }, []);

  const connectedParam = searchParams.get('connected');
  const errorParam = searchParams.get('error');

  useEffect(() => {
    if (connectedParam) {
      setNotification({ type: 'success', message: `${connectedParam} connected successfully!` });
    } else if (errorParam) {
      const msgs: Record<string, string> = {
        invalid_state: 'Something went wrong — please try connecting again.',
        no_code: 'Authorization was cancelled.',
        linkedin_not_configured: 'LinkedIn not set up yet. Click "Set up LinkedIn" to get started.',
        twitter_not_configured: 'X not set up yet. Click "Set up X" to get started.',
        threads_not_configured: 'Threads not set up yet. Click "Set up Threads" to get started.',
        linkedin_auth_failed: 'LinkedIn authorization failed. Double-check your Client ID and Secret.',
        twitter_auth_failed: 'X authorization failed. Double-check your credentials.',
        threads_auth_failed: 'Threads authorization failed. Double-check your App ID and Secret.',
      };
      setNotification({ type: 'error', message: msgs[errorParam] || `Error: ${errorParam}` });
    }
  }, [connectedParam, errorParam]);

  const loadData = useCallback(async () => {
    try {
      const [connectionsRes, ...credRes] = await Promise.all([
        fetch('/api/connections'),
        fetch('/api/credentials/linkedin'),
        fetch('/api/credentials/twitter'),
        fetch('/api/credentials/threads'),
        fetch('/api/credentials/substack'),
      ]);

      const connections: Connection[] = await connectionsRes.json();
      const [linkedinCreds, twitterCreds, threadsCreds, substackCreds] = await Promise.all(
        credRes.map((r) => r.json())
      );

      const credMap: Record<Platform, { configured: boolean; client_id?: string }> = {
        linkedin: linkedinCreds,
        twitter: twitterCreds,
        threads: threadsCreds,
        substack: substackCreds,
      };

      const newStates = {} as Record<Platform, PlatformState>;
      for (const platform of ['linkedin', 'twitter', 'threads', 'substack'] as Platform[]) {
        newStates[platform] = {
          configured: credMap[platform].configured,
          client_id: credMap[platform].client_id,
          connections: connections.filter((c) => c.platform === platform),
        };
      }
      setPlatformStates(newStates);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDisconnect = async (id: string) => {
    if (!confirm('Remove this account?')) return;
    await fetch(`/api/connections/${id}`, { method: 'DELETE' });
    await loadData();
    setNotification({ type: 'success', message: 'Account removed.' });
  };

  const handleRemoveCreds = async (platform: Platform) => {
    if (!confirm(`Remove ${PLATFORM_META[platform].name} app credentials? You'll need to re-enter them to reconnect.`)) return;
    await fetch(`/api/credentials/${platform}`, { method: 'DELETE' });
    await loadData();
  };

  const getRedirectUri = (platform: Platform) => {
    if (platform === 'substack') return '';
    return `${redirectUri}/api/auth/callback/${platform}`;
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-6 py-5 bg-white border-b border-gray-200 shrink-0">
        <h1 className="text-xl font-bold text-gray-900">Platform Connections</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Connect your accounts to start scheduling posts
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Notification */}
          {notification && (
            <div
              className={`p-4 rounded-xl flex items-center justify-between ${
                notification.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {notification.type === 'success' ? (
                  <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span className="text-sm font-medium">{notification.message}</span>
              </div>
              <button onClick={() => setNotification(null)} className="text-inherit opacity-60 hover:opacity-100 p-1">
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
          ) : (
            <>
              {/* How it works banner — shown if nothing configured yet */}
              {Object.values(platformStates).every((s) => !s.configured && s.connections.length === 0) && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-indigo-900 mb-1">Get started in minutes</p>
                    <p className="text-sm text-indigo-700">
                      Click <strong>Set up</strong> on any platform below. A step-by-step guide will walk you through everything — no technical experience needed. Each platform only needs to be set up once.
                    </p>
                  </div>
                </div>
              )}

              {/* Platform cards */}
              {(['linkedin', 'twitter', 'threads', 'substack'] as Platform[]).map((platform) => (
                <PlatformCard
                  key={platform}
                  platform={platform}
                  state={platformStates[platform]}
                  redirectUri={getRedirectUri(platform)}
                  onSetupSaved={loadData}
                  onDisconnect={handleDisconnect}
                  onRemoveCreds={() => handleRemoveCreds(platform)}
                />
              ))}
            </>
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
