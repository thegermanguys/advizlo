'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken, Booking } from '../../lib/api';

export default function MyBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    refresh();
  }, [router]);

  function refresh() {
    setLoading(true);
    api
      .listMyBookingsAsClient()
      .then(setBookings)
      .finally(() => setLoading(false));
  }

  async function handleCancel(id: string, priceCharged: string) {
    const result = await api.cancelBooking(id);
    if (Number(priceCharged) > 0) {
      setMessage(
        result.refunded
          ? 'Booking cancelled — a refund has been issued.'
          : "Booking cancelled — per the consultant's cancellation policy, no refund was issued.",
      );
    } else {
      setMessage('Booking cancelled.');
    }
    refresh();
  }

  async function handlePay(id: string) {
    const { url } = await api.createCheckoutSession(id);
    window.location.href = url;
  }

  if (loading) return <main style={{ padding: 24 }}>Loading…</main>;

  return (
    <main style={{ maxWidth: 640, margin: '40px auto', padding: 24 }}>
      <h1>My bookings</h1>
      {message && (
        <p style={{ fontSize: 14, background: '#f6f6f6', padding: 10, borderRadius: 6 }}>{message}</p>
      )}
      {bookings.length === 0 && <p style={{ color: '#777' }}>No bookings yet — go browse a consultant.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        {bookings.map((b) => (
          <div key={b.id} style={{ padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{b.serviceType.name}</strong>
              <StatusBadge status={b.status} />
            </div>
            <p style={{ color: '#555', margin: '4px 0' }}>with {b.consultant?.user.fullName}</p>
            <p style={{ fontSize: 13, color: '#777' }}>{new Date(b.scheduledAt).toLocaleString()}</p>
            <p style={{ fontSize: 13, color: '#777' }}>
              {Number(b.priceCharged) === 0 ? 'Free' : `$${b.priceCharged}`}
            </p>

            {b.status === 'CONFIRMED' && needsMeetingLink(b.consultationMode) && (
              b.meetingLink ? (
                <a
                  href={b.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-block', marginTop: 8, fontSize: 13, color: '#0a7d34', fontWeight: 600 }}
                >
                  Join call →
                </a>
              ) : (
                <p style={{ fontSize: 13, color: '#a67c00', marginTop: 8 }}>Meeting link pending…</p>
              )
            )}

            {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                {b.status === 'PENDING' && Number(b.priceCharged) > 0 && (
                  <button
                    onClick={() => handlePay(b.id)}
                    style={{ border: 'none', background: '#111', color: '#fff', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}
                  >
                    Pay now
                  </button>
                )}
                <button
                  onClick={() => handleCancel(b.id, b.priceCharged)}
                  style={{ border: 'none', background: 'none', color: 'crimson', cursor: 'pointer', fontSize: 13 }}
                >
                  Cancel booking
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}

function needsMeetingLink(mode: Booking['consultationMode']) {
  return mode === 'IN_APP_VIDEO' || mode === 'ZOOM' || mode === 'GOOGLE_MEET';
}

function StatusBadge({ status }: { status: Booking['status'] }) {
  const colors: Record<Booking['status'], string> = {
    PENDING: '#a67c00',
    CONFIRMED: '#0a7d34',
    COMPLETED: '#555',
    CANCELLED: '#999',
    NO_SHOW: '#c0392b',
  };
  return (
    <span style={{ fontSize: 12, color: colors[status], fontWeight: 600 }}>{status}</span>
  );
}
