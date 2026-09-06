'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken, Booking } from '../../../lib/api';
import ConsultantNav from '../../../components/ConsultantNav';

export default function ConsultantBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    refresh();
  }, [router]);

  function refresh() {
    api
      .listMyBookingsAsConsultant()
      .then(setBookings)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }

  async function handleCancel(id: string) {
    if (!confirm('Cancel this booking? The client will be notified and refunded if applicable.')) {
      return;
    }
    setError(null);
    setCancellingId(id);
    try {
      await api.cancelBooking(id);
      refresh();
    } catch (err: any) {
      setError(err.message ?? 'Could not cancel this booking');
    } finally {
      setCancellingId(null);
    }
  }

  const now = Date.now();
  const upcoming = bookings
    .filter((b) => (b.status === 'PENDING' || b.status === 'CONFIRMED') && new Date(b.scheduledAt).getTime() >= now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const past = bookings.filter(
    (b) => !(b.status === 'PENDING' || b.status === 'CONFIRMED') || new Date(b.scheduledAt).getTime() < now,
  );

  return (
    <main style={{ maxWidth: 640, margin: '60px auto', padding: 24 }}>
      <ConsultantNav />
      <h1>Upcoming meetings</h1>
      <p style={{ color: '#555' }}>
        Every booking is auto-confirmed once a client books an open slot. Cancel one here if you
        can no longer make it — the client will be refunded automatically if they paid.
      </p>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {!loaded && <p style={{ color: '#777' }}>Loading…</p>}
      {loaded && upcoming.length === 0 && (
        <p style={{ color: '#777', fontSize: 14 }}>No upcoming meetings.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
        {upcoming.map((b) => (
          <div key={b.id} style={rowStyle}>
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>{b.serviceType.name}</p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#555' }}>
                with {b.client?.fullName} ({b.client?.email}) — {new Date(b.scheduledAt).toLocaleString()}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#999' }}>
                {b.status} · {b.consultationMode.replace('_', ' ')}
                {b.meetingLink && (
                  <>
                    {' · '}
                    <a href={b.meetingLink} target="_blank" rel="noopener noreferrer" style={{ color: '#0a7d34', fontWeight: 600 }}>
                      Join call
                    </a>
                  </>
                )}
              </p>
            </div>
            <button onClick={() => handleCancel(b.id)}
              disabled={cancellingId === b.id}
              style={cancelButtonStyle}
            >
              {cancellingId === b.id ? 'Cancelling…' : 'Cancel'}
            </button>
          </div>
        ))}
      </div>

      {past.length > 0 && (
        <>
          <h3 style={{ marginTop: 32 }}>Past & cancelled</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {past.map((b) => (
              <div key={b.id} style={{ ...rowStyle, opacity: 0.6 }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>{b.serviceType.name}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#555' }}>
                    with {b.client?.fullName} — {new Date(b.scheduledAt).toLocaleString()} — {b.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 12,
  padding: 14,
  border: '1px solid #eee',
  borderRadius: 8,
};
const cancelButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 6,
  border: '1px solid crimson',
  background: '#fff',
  color: 'crimson',
  fontSize: 13,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};
