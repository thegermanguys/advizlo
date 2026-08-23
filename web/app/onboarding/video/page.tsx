'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, getToken, VideoStatus } from '../../../lib/api';

export default function OnboardingVideoPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<VideoStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    refresh();
  }, [router]);

  function refresh() {
    api.getVideoStatus().then(setStatus).catch(() => {});
  }

  async function handleConnectZoom() {
    setError(null);
    try {
      const { url } = await api.startZoomConnect();
      window.location.href = url;
    } catch (err: any) {
      setError(err.message ?? 'Could not start Zoom connection');
    }
  }

  async function handleConnectGoogle() {
    setError(null);
    try {
      const { url } = await api.startGoogleConnect();
      window.location.href = url;
    } catch (err: any) {
      setError(err.message ?? 'Could not start Google connection');
    }
  }

  const zoomJustConnected = params.get('zoom') === 'connected';
  const zoomError = params.get('zoom') === 'error';
  const googleJustConnected = params.get('google') === 'connected';
  const googleError = params.get('google') === 'error';

  return (
    <main style={{ maxWidth: 480, margin: '60px auto', padding: 24 }}>
      <Steps active={5} />
      <h1>Video for consultations</h1>
      <p style={{ color: '#555' }}>
        This step is optional — in-app video works out of the box for every consultant, no
        setup required. Connect Zoom or Google Meet only if you'd rather use those for your
        consultations.
      </p>

      {(zoomJustConnected || googleJustConnected) && (
        <p style={{ color: '#0a7d34', fontSize: 14 }}>Connected successfully.</p>
      )}
      {(zoomError || googleError) && (
        <p style={{ color: 'crimson', fontSize: 14 }}>
          Something went wrong connecting — please try again.
        </p>
      )}
      {error && <p style={{ color: 'crimson', fontSize: 14 }}>{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
        <ProviderRow
          name="In-app video"
          description="Built in, works immediately for every consultant."
          connected={!!status?.dailyEnabled}
          alwaysReady
        />
        <ProviderRow
          name="Zoom"
          description="Meetings are created under your own Zoom account."
          connected={!!status?.zoomConnected}
          onConnect={handleConnectZoom}
        />
        <ProviderRow
          name="Google Meet"
          description="Meetings are created via your Google Calendar."
          connected={!!status?.googleConnected}
          onConnect={handleConnectGoogle}
        />
      </div>

      <button onClick={() => router.push('/dashboard')} style={{ ...submitStyle, marginTop: 24 }}>
        Finish setup
      </button>
    </main>
  );
}

function ProviderRow({
  name,
  description,
  connected,
  alwaysReady,
  onConnect,
}: {
  name: string;
  description: string;
  connected: boolean;
  alwaysReady?: boolean;
  onConnect?: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
        border: '1px solid #eee',
        borderRadius: 8,
      }}
    >
      <div>
        <p style={{ fontWeight: 600, margin: 0 }}>{name}</p>
        <p style={{ fontSize: 13, color: '#777', margin: '4px 0 0' }}>{description}</p>
      </div>
      {alwaysReady ? (
        <span style={{ color: '#0a7d34', fontSize: 13, fontWeight: 600 }}>Always ready</span>
      ) : connected ? (
        <span style={{ color: '#0a7d34', fontSize: 13, fontWeight: 600 }}>Connected</span>
      ) : (
        <button
          onClick={onConnect}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: '1px solid #111',
            background: '#fff',
            color: '#111',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Connect
        </button>
      )}
    </div>
  );
}

function Steps({ active }: { active: 1 | 2 | 3 | 4 | 5 }) {
  const steps = ['Profile', 'Pricing', 'Availability', 'Payouts', 'Video'];
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 24, fontSize: 13, color: '#777', flexWrap: 'wrap' }}>
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
