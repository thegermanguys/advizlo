'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, getToken } from '../../../lib/api';

export default function OnboardingPayoutsPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingPayoutsPageInner />
    </Suspense>
  );
}

function OnboardingPayoutsPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<{
    connected: boolean;
    chargesEnabled: boolean;
    detailsSubmitted: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    refresh();
    // If Stripe just redirected back here, re-check status (it may take a
    // moment for Stripe's own systems to reflect the completed onboarding).
  }, [router]);

  function refresh() {
    api.getConnectStatus().then(setStatus).catch(() => {});
  }

  async function handleConnect() {
    setError(null);
    setLoading(true);
    try {
      const { url } = await api.startConnectOnboarding();
      window.location.href = url;
    } catch (err: any) {
      setError(err.message ?? 'Could not start Stripe onboarding');
      setLoading(false);
    }
  }

  const justReturned = params.get('return') === '1';

  return (
    <main style={{ maxWidth: 480, margin: '60px auto', padding: 24 }}>
      <Steps active={4} />
      <h1>Connect your payouts</h1>
      <p style={{ color: '#555' }}>
        Advizlo uses Stripe to pay you directly for paid consultations, minus the platform
        commission. You'll be redirected to Stripe to verify your identity and add a bank
        account.
      </p>

      {justReturned && !status?.chargesEnabled && (
        <p style={{ color: '#a67c00', fontSize: 14 }}>
          Welcome back — if Stripe onboarding isn't showing as complete yet, it can take a
          minute to update. Refresh this page shortly.
        </p>
      )}

      <div style={{ marginTop: 20, padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
        <p>
          Status:{' '}
          {status?.chargesEnabled ? (
            <strong style={{ color: '#0a7d34' }}>Connected & ready to receive payments</strong>
          ) : status?.connected ? (
            <strong style={{ color: '#a67c00' }}>Onboarding started — not finished yet</strong>
          ) : (
            <strong style={{ color: '#777' }}>Not connected</strong>
          )}
        </p>
      </div>

      {error && <p style={{ color: 'crimson', marginTop: 12 }}>{error}</p>}

      <button onClick={handleConnect} disabled={loading} style={{ ...submitStyle, marginTop: 20 }}>
        {loading ? 'Redirecting…' : status?.connected ? 'Continue Stripe setup' : 'Connect with Stripe'}
      </button>

      <button
        onClick={() => router.push('/onboarding/video')}
        disabled={!status?.chargesEnabled}
        style={{ ...secondaryButtonStyle, marginTop: 12, opacity: status?.chargesEnabled ? 1 : 0.5 }}
      >
        Continue to video setup
      </button>
      {!status?.chargesEnabled && (
        <p style={{ fontSize: 13, color: '#999', marginTop: 8 }}>
          You can still browse the app before this is done — but you can't accept paid
          bookings until Stripe onboarding is complete. Free consultations don't require this.
        </p>
      )}
    </main>
  );
}

function Steps({ active }: { active: 1 | 2 | 3 | 4 | 5 }) {
  const steps = ['Profile', 'Pricing', 'Availability', 'Payouts', 'Video'];
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 24, fontSize: 13, color: '#777' }}>
      {steps.map((s, i) => (
        <span key={s} style={{ fontWeight: i + 1 === active ? 700 : 400, color: i + 1 === active ? '#111' : '#999' }}>
          {i + 1}. {s}
          {i < steps.length - 1 && <span style={{ margin: '0 6px' }}>→</span>}
        </span>
      ))}
    </div>
  );
}

const submitStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 6,
  border: 'none',
  background: '#111',
  color: '#fff',
  fontSize: 14,
  cursor: 'pointer',
  width: '100%',
};
const secondaryButtonStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 6,
  border: '1px solid #111',
  background: '#fff',
  color: '#111',
  fontSize: 14,
  cursor: 'pointer',
  width: '100%',
};
