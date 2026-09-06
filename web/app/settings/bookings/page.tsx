'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken, Booking } from '../../../lib/api';
import ConsultantNav from '../../../components/ConsultantNav';
import { colors, styles } from '../../../lib/theme';

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
    <main style={styles.pageWide}>
      <ConsultantNav />
      <h1>Upcoming meetings</h1>
      <p style={styles.lede}>
        Every booking is confirmed automatically once a client takes an open slot. Cancel one
        here if you can no longer make it — the client is refunded automatically if they paid.
      </p>

      {error && <p style={{ color: colors.rust }}>{error}</p>}
      {!loaded && <p style={styles.statusSlate}>Loading…</p>}
      {loaded && upcoming.length === 0 && <p style={styles.statusSlate}>No upcoming meetings.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
        {upcoming.map((b) => (
          <div key={b.id} style={{ ...styles.row, alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700 }}>{b.serviceType.name}</p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: colors.slate }}>
                with {b.client?.fullName} ({b.client?.email}) — {new Date(b.scheduledAt).toLocaleString()}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: colors.slateLight }}>
                {b.status.toLowerCase()} · {b.consultationMode.replace('_', ' ').toLowerCase()}
                {b.meetingLink && (
                  <>
                    {' · '}
                    <a href={b.meetingLink} target="_blank" rel="noopener noreferrer" style={styles.statusForest}>
                      Join call
                    </a>
                  </>
                )}
              </p>
            </div>
            <button onClick={() => handleCancel(b.id)} disabled={cancellingId === b.id} style={styles.dangerButton}>
              {cancellingId === b.id ? 'Cancelling…' : 'Cancel'}
            </button>
          </div>
        ))}
      </div>

      {past.length > 0 && (
        <>
          <h3 style={{ marginTop: 40 }}>Past & cancelled</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {past.map((b) => (
              <div key={b.id} style={{ ...styles.row, opacity: 0.55 }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700 }}>{b.serviceType.name}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: colors.slate }}>
                    with {b.client?.fullName} — {new Date(b.scheduledAt).toLocaleString()} — {b.status.toLowerCase()}
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
