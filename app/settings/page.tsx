'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PlatformIcon from '@/components/PlatformIcon';

type Platform = 'linkedin' | 'twitter' | 'threads' | 'substack';
type Connection = {
  id: string; platform: string; account_name: string;
  token_expires_at: number | null; avatar_url: string | null;
};

// ─── Per-platform wizard step definitions ────────────────────────────────────
// Each step has: text shown to user, optional action button, optional
// redirect URI display, optional credential form (last step only).

type Step = {
  heading: string;
  body: React.ReactNode;
  actionLabel?: string;
  actionUrl?: string;
  showRedirectUri?: boolean;
  isCredentialStep?: boolean;
};

function useSteps(platform: Platform, redirectUri: string): Step[] {
  switch (platform) {

    // ── LinkedIn ─────────────────────────────────────────────────────────────
    case 'linkedin': return [
      {
        heading: 'First, create a free LinkedIn Company Page',
        body: <>
          LinkedIn requires every app to be attached to a Company Page. It doesn&apos;t have to be a real
          company — you can make a placeholder with any name (e.g. <strong>"My Scheduler"</strong>).
          Click the button below to open the form. It takes about 30 seconds.
        </>,
        actionLabel: 'Create a Company Page →',
        actionUrl: 'https://www.linkedin.com/company/setup/new/',
      },
      {
        heading: 'Fill in the Company Page form',
        body: <>
          On the page that opened, fill in these fields:
          <ul className="mt-3 space-y-2 text-sm">
            <li><span className="font-semibold text-gray-800">Company name:</span> Type anything, e.g. <code className="bg-gray-100 px-1.5 py-0.5 rounded">My Scheduler</code></li>
            <li><span className="font-semibold text-gray-800">Company type:</span> Select any option from the dropdown</li>
            <li><span className="font-semibold text-gray-800">Company size:</span> Select any option</li>
            <li><span className="font-semibold text-gray-800">Industry:</span> Select any option</li>
          </ul>
          <p className="mt-3">Then click the <strong>"Create page"</strong> button. Done!</p>
        </>,
      },
      {
        heading: 'Now create a Developer App',
        body: <>
          Click the button below to open the LinkedIn app creation form.
          <ul className="mt-3 space-y-2 text-sm">
            <li><span className="font-semibold text-gray-800">App name:</span> Type anything, e.g. <code className="bg-gray-100 px-1.5 py-0.5 rounded">My Scheduler</code></li>
            <li><span className="font-semibold text-gray-800">LinkedIn Page:</span> Click the field and select the Company Page you just created</li>
            <li><span className="font-semibold text-gray-800">App logo:</span> Click "Upload a logo" and pick any image from your computer (even a screenshot — it doesn&apos;t matter)</li>
            <li>Check the legal agreement box, then click <strong>"Create app"</strong></li>
          </ul>
        </>,
        actionLabel: 'Open App Creation Form →',
        actionUrl: 'https://www.linkedin.com/developers/apps/new',
      },
      {
        heading: 'Enable the two required features',
        body: <>
          You should now be inside your new app. At the top, click the <strong>"Products"</strong> tab.
          <ul className="mt-3 space-y-2 text-sm">
            <li>Find <strong>"Share on LinkedIn"</strong> → click <strong>"Request access"</strong></li>
            <li>Find <strong>"Sign In with LinkedIn using OpenID Connect"</strong> → click <strong>"Request access"</strong></li>
          </ul>
          <p className="mt-3 text-green-700 font-medium">Both should show "Added" within a few seconds — no waiting required.</p>
        </>,
      },
      {
        heading: 'Add the redirect URL',
        body: <>
          Click the <strong>"Auth"</strong> tab at the top of your app. Scroll down to
          <strong> "OAuth 2.0 settings"</strong>.
          Click the <strong>pencil icon ✏️</strong> next to "Authorized redirect URLs for your app".
          Then click <strong>"+ Add redirect URL"</strong>, paste the URL below, and click <strong>"Update"</strong>.
        </>,
        showRedirectUri: true,
      },
      {
        heading: 'Paste your credentials here',
        body: <>
          Still on the <strong>"Auth"</strong> tab, look at the top section. You&apos;ll see:
          <ul className="mt-2 space-y-1 text-sm">
            <li><strong>Client ID</strong> — a short code like <code className="bg-gray-100 px-1.5 py-0.5 rounded">86xxxxxxxx</code></li>
            <li><strong>Client Secret</strong> — click <strong>"Generate secret"</strong> if it says so, then copy it</li>
          </ul>
          <p className="mt-2">Paste both into the fields below, then click <strong>"Save &amp; Authorize"</strong>.</p>
        </>,
        isCredentialStep: true,
      },
    ];

    // ── X / Twitter ──────────────────────────────────────────────────────────
    case 'twitter': return [
      {
        heading: 'Sign up for a free X Developer account',
        body: <>
          X (Twitter) requires a free developer account to allow apps to post on your behalf.
          Click the button below to sign up — use your existing X account to log in.
          <p className="mt-3 text-sm text-gray-600">
            When asked <em>"What is your use case?"</em>, select <strong>"Hobbyist"</strong> or
            <strong> "Personal use / building tools for myself"</strong> and fill in a short description like{' '}
            <em>"Personal social media scheduler for my own posts"</em>.
          </p>
        </>,
        actionLabel: 'Open X Developer Portal →',
        actionUrl: 'https://developer.twitter.com/en/portal/apps/new',
      },
      {
        heading: 'Create an App inside the portal',
        body: <>
          Once you&apos;re in the developer portal, look for a <strong>"+ Create App"</strong> or <strong>"New App"</strong> button.
          <ul className="mt-3 space-y-2 text-sm">
            <li><span className="font-semibold text-gray-800">App name:</span> Type anything, e.g. <code className="bg-gray-100 px-1.5 py-0.5 rounded">My Scheduler</code></li>
          </ul>
          <p className="mt-3">Click <strong>"Next"</strong> / <strong>"Create"</strong> to continue.</p>
        </>,
      },
      {
        heading: 'Set up User Authentication',
        body: <>
          Inside your new app, find <strong>"User authentication settings"</strong> and click <strong>"Set up"</strong>.
          Fill in the form exactly like this:
          <ul className="mt-3 space-y-2 text-sm">
            <li><span className="font-semibold text-gray-800">App permissions:</span> Select <strong>"Read and Write"</strong></li>
            <li><span className="font-semibold text-gray-800">Type of App:</span> Select <strong>"Web App, Automated App or Bot"</strong></li>
            <li><span className="font-semibold text-gray-800">Callback URI / Redirect URL:</span> Paste the URL shown on the next step</li>
            <li><span className="font-semibold text-gray-800">Website URL:</span> Type <code className="bg-gray-100 px-1.5 py-0.5 rounded">http://localhost:3000</code></li>
          </ul>
        </>,
      },
      {
        heading: 'Copy and paste this Callback URL',
        body: <>
          In the <strong>"Callback URI / Redirect URL"</strong> field, paste the URL below.
          Then click <strong>"Save"</strong>.
        </>,
        showRedirectUri: true,
      },
      {
        heading: 'Get your Client ID and Secret',
        body: <>
          Go to the <strong>"Keys and Tokens"</strong> tab inside your app.
          Scroll down to the <strong>"OAuth 2.0 Client ID and Client Secret"</strong> section.
          Click <strong>"Generate"</strong> if the button is there, then copy both values and paste them below.
        </>,
        isCredentialStep: true,
      },
    ];

    // ── Threads ──────────────────────────────────────────────────────────────
    case 'threads': return [
      {
        heading: 'Open the Meta Developer Portal',
        body: <>
          Threads is owned by Meta (the company behind Facebook/Instagram).
          Click the button below and sign in with your <strong>Facebook or Instagram account</strong>.
        </>,
        actionLabel: 'Open Meta Developer Portal →',
        actionUrl: 'https://developers.facebook.com/apps/creation/',
      },
      {
        heading: 'Create a new App',
        body: <>
          Click <strong>"Create App"</strong>. On the next screen:
          <ul className="mt-3 space-y-2 text-sm">
            <li>For <strong>"What do you want your app to do?"</strong> — select <strong>"Other"</strong>, click Next</li>
            <li>For <strong>"Select an app type"</strong> — select <strong>"Consumer"</strong>, click Next</li>
            <li>For <strong>"Add an app name"</strong> — type anything, e.g. <code className="bg-gray-100 px-1.5 py-0.5 rounded">My Scheduler</code></li>
            <li>Click <strong>"Create app"</strong> (you may need to enter your password again)</li>
          </ul>
        </>,
      },
      {
        heading: 'Add the Threads API',
        body: <>
          You&apos;re now inside your new app. You&apos;ll see a list of products to add.
          Find <strong>"Threads API"</strong> and click <strong>"Set up"</strong> next to it.
          <p className="mt-3 text-sm text-gray-600">
            (If you don&apos;t see it on the first page, scroll down or look for a "Show more" / search box.)
          </p>
        </>,
      },
      {
        heading: 'Add the redirect URL',
        body: <>
          In the left sidebar, click <strong>"Threads API"</strong> then <strong>"Settings"</strong>.
          Find the <strong>"Redirect Callback URLs"</strong> field.
          Click <strong>"Add"</strong>, paste the URL below, then click <strong>"Save changes"</strong>.
        </>,
        showRedirectUri: true,
      },
      {
        heading: 'Get your App ID and Secret',
        body: <>
          In the left sidebar, click <strong>"App settings"</strong> (or <strong>"Basic"</strong>).
          <ul className="mt-3 space-y-2 text-sm">
            <li><strong>App ID</strong> — the number at the top of the page</li>
            <li><strong>App secret</strong> — click <strong>"Show"</strong> next to it, then copy it</li>
          </ul>
          <p className="mt-2">Paste both below and click <strong>"Save &amp; Authorize"</strong>.</p>
        </>,
        isCredentialStep: true,
      },
    ];

    // ── Substack ─────────────────────────────────────────────────────────────
    case 'substack': return [
      {
        heading: 'Open your Substack account settings',
        body: <>
          Click the button below to open your Substack dashboard.
          Make sure you&apos;re signed in to the Substack account you want to post from.
        </>,
        actionLabel: 'Open Substack Dashboard →',
        actionUrl: 'https://substack.com/account/settings',
      },
      {
        heading: 'Find your API token',
        body: <>
          In your Substack settings, scroll down until you see a section called <strong>"API"</strong> or
          <strong> "Publication API"</strong>. Click <strong>"Generate token"</strong> if there isn&apos;t one yet.
          Copy the token shown (it starts with <code className="bg-gray-100 px-1.5 py-0.5 rounded">sk_</code>).
          <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ⚠️ Note: Substack does not have an official public posting API. This uses their internal API which could stop working if they change it.
          </p>
        </>,
      },
      {
        heading: 'Enter your Substack details',
        body: <>
          Enter your Substack <strong>subdomain</strong> (the part before <em>.substack.com</em> in your publication URL)
          and the API token you just copied.
        </>,
        isCredentialStep: true,
      },
    ];
  }
}

// ─── Wizard Modal ─────────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<Platform, string> = {
  linkedin: '#0A66C2', twitter: '#000000', threads: '#000000', substack: '#FF6719',
};
const PLATFORM_NAMES: Record<Platform, string> = {
  linkedin: 'LinkedIn', twitter: 'X (Twitter)', threads: 'Threads', substack: 'Substack',
};
const CREDENTIAL_LABELS: Record<Platform, [string, string]> = {
  linkedin: ['Client ID', 'Client Secret'],
  twitter: ['Client ID (OAuth 2.0)', 'Client Secret (OAuth 2.0)'],
  threads: ['App ID', 'App Secret'],
  substack: ['Your subdomain (e.g. yourname)', 'API Token'],
};

function Wizard({
  platform, redirectUri, existingId,
  onClose, onSaved,
}: {
  platform: Platform; redirectUri: string; existingId?: string;
  onClose: () => void; onSaved: () => void;
}) {
  const steps = useSteps(platform, redirectUri);
  const [step, setStep] = useState(0);
  const [clientId, setClientId] = useState(existingId || '');
  const [clientSecret, setClientSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const [idLabel, secretLabel] = CREDENTIAL_LABELS[platform];
  const color = PLATFORM_COLORS[platform];

  const copyUri = () => {
    navigator.clipboard.writeText(redirectUri).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSave = async () => {
    if (!clientId.trim() || !clientSecret.trim()) { setError('Both fields are required.'); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/credentials/${platform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId.trim(), client_secret: clientSecret.trim() }),
      });
      if (!res.ok) throw new Error('Save failed');
      onSaved();
    } catch {
      setError('Could not save. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-center gap-3 border-b border-gray-100 shrink-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + '15' }}>
            <PlatformIcon platform={platform} size={22} />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-gray-900">Connect {PLATFORM_NAMES[platform]}</h2>
            <p className="text-xs text-gray-400">Free one-time setup · Step {step + 1} of {steps.length}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 px-6 pt-3 shrink-0">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= step ? 'bg-indigo-500' : 'bg-gray-200'}`} />
          ))}
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          <h3 className="font-bold text-gray-900 text-base mb-3">{current.heading}</h3>
          <div className="text-sm text-gray-600 leading-relaxed">{current.body}</div>

          {/* Action button */}
          {current.actionLabel && current.actionUrl && (
            <a
              href={current.actionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors"
              style={{ backgroundColor: color }}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {current.actionLabel}
            </a>
          )}

          {/* Redirect URI */}
          {current.showRedirectUri && (
            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-2">
              <code className="text-xs text-gray-700 flex-1 break-all leading-relaxed">{redirectUri}</code>
              <button
                onClick={copyUri}
                className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${copied ? 'bg-green-100 text-green-700' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-100'}`}
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          )}

          {/* Credential form */}
          {current.isCredentialStep && (
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{idLabel}</label>
                <input
                  type="text"
                  value={clientId}
                  onChange={e => { setClientId(e.target.value); setError(null); }}
                  placeholder="Paste here…"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{secretLabel}</label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={e => { setClientSecret(e.target.value); setError(null); }}
                  placeholder="Paste here…"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-3 border-t border-gray-100 flex items-center justify-between shrink-0">
          <button
            onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 font-medium"
          >
            {step > 0 ? '← Back' : 'Cancel'}
          </button>
          {isLast ? (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {saving
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</>
                : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Save &amp; Authorize</>
              }
            </button>
          ) : (
            <button
              onClick={() => setStep(s => s + 1)}
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Platform Card ────────────────────────────────────────────────────────────

function PlatformCard({
  platform, connections, configured, redirectUri, onSetupSaved, onDisconnect,
}: {
  platform: Platform; connections: Connection[]; configured: boolean; redirectUri: string;
  onSetupSaved: () => void; onDisconnect: (id: string, name: string) => void;
}) {
  const [showWizard, setShowWizard] = useState(false);
  const color = PLATFORM_COLORS[platform];
  const name = PLATFORM_NAMES[platform];

  return (
    <>
      {showWizard && (
        <Wizard
          platform={platform}
          redirectUri={redirectUri}
          onClose={() => setShowWizard(false)}
          onSaved={() => { setShowWizard(false); onSetupSaved(); }}
        />
      )}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-sm transition-shadow">
        {/* Card header */}
        <div className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: color + '12' }}>
            <PlatformIcon platform={platform} size={26} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-gray-900">{name}</h3>
              {connections.length > 0 && (
                <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Connected
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {connections.length > 0
                ? `${connections.length} account${connections.length > 1 ? 's' : ''} · click Connect to add more`
                : configured ? 'Credentials saved — click Connect to authorize'
                : 'Not connected'}
            </p>
          </div>

          {/* CTA button */}
          {configured ? (
            <a
              href={`/api/auth/connect?platform=${platform}`}
              className="shrink-0 flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: color }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Connect
            </a>
          ) : (
            <button
              onClick={() => setShowWizard(true)}
              className="shrink-0 flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: color }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Set up
            </button>
          )}
        </div>

        {/* Connected accounts */}
        {connections.length > 0 && (
          <div className="border-t border-gray-100 divide-y divide-gray-50">
            {connections.map(conn => (
              <div key={conn.id} className="px-5 py-3 flex items-center gap-3">
                {conn.avatar_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={conn.avatar_url} alt="" className="w-8 h-8 rounded-full shrink-0" />
                  : <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: color }}>{conn.account_name[0]?.toUpperCase()}</div>
                }
                <span className="flex-1 text-sm font-semibold text-gray-900 truncate">{conn.account_name}</span>
                <button
                  onClick={() => onDisconnect(conn.id, conn.account_name)}
                  className="text-xs text-gray-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Reconfigure link for configured-but-not-connected */}
        {configured && connections.length === 0 && (
          <div className="border-t border-gray-50 px-5 py-2 flex justify-end">
            <button
              onClick={() => setShowWizard(true)}
              className="text-xs text-gray-400 hover:text-gray-600 font-medium"
            >
              Edit setup
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function SettingsContent() {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [configured, setConfigured] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ ok: boolean; msg: string } | null>(null);
  const [redirectBase, setRedirectBase] = useState('');

  useEffect(() => { setRedirectBase(window.location.origin); }, []);

  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    if (connected) setNotification({ ok: true, msg: `${connected} connected successfully!` });
    else if (error) {
      const msgs: Record<string, string> = {
        auth_cancelled: 'Authorization was cancelled.',
        invalid_state: 'Something went wrong — please try again.',
        linkedin_failed: 'LinkedIn authorization failed. Double-check your Client ID and Secret.',
        twitter_failed: 'X authorization failed. Double-check your credentials.',
        threads_failed: 'Threads authorization failed. Double-check your App ID and Secret.',
      };
      setNotification({ ok: false, msg: msgs[error] || `Error: ${error}` });
    }
  }, [searchParams]);

  const loadData = useCallback(async () => {
    try {
      const [connRes, ...credRes] = await Promise.all([
        fetch('/api/connections'),
        fetch('/api/credentials/linkedin'),
        fetch('/api/credentials/twitter'),
        fetch('/api/credentials/threads'),
        fetch('/api/credentials/substack'),
      ]);
      const conns = await connRes.json();
      const [li, tw, th, ss] = await Promise.all(credRes.map(r => r.json()));
      setConnections(conns);
      setConfigured({ linkedin: li.configured, twitter: tw.configured, threads: th.configured, substack: ss.configured });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDisconnect = async (id: string, name: string) => {
    if (!confirm(`Remove ${name}?`)) return;
    await fetch(`/api/connections/${id}`, { method: 'DELETE' });
    setNotification({ ok: true, msg: `${name} removed.` });
    loadData();
  };

  const getRedirectUri = (platform: Platform) =>
    platform === 'substack' ? '' : `${redirectBase}/api/auth/callback/${platform}`;

  const platformConnections = (p: Platform) => connections.filter(c => c.platform === p);

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-6 py-5 bg-white border-b border-gray-200 shrink-0">
        <h1 className="text-xl font-bold text-gray-900">Platform Connections</h1>
        <p className="text-sm text-gray-500 mt-0.5">Connect your accounts to start scheduling posts · free, one-time setup</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-4">

          {notification && (
            <div className={`p-4 rounded-xl flex items-center justify-between ${notification.ok ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
              <div className="flex items-center gap-2 text-sm font-medium">
                {notification.ok
                  ? <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  : <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                }
                {notification.msg}
              </div>
              <button onClick={() => setNotification(null)} className="opacity-50 hover:opacity-100 p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          {loading
            ? <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
            : (['linkedin', 'twitter', 'threads', 'substack'] as Platform[]).map(p => (
              <PlatformCard
                key={p}
                platform={p}
                connections={platformConnections(p)}
                configured={!!configured[p]}
                redirectUri={getRedirectUri(p)}
                onSetupSaved={loadData}
                onDisconnect={handleDisconnect}
              />
            ))
          }
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading…</div>}>
      <SettingsContent />
    </Suspense>
  );
}
