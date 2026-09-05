'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken, Booking } from '../../lib/api';
import StarRating from '../../components/StarRating';

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

            {b.status === 'COMPLETED' && (
              <ReviewSection booking={b} onReviewed={refresh} />
            )}
          </div>
        ))}
      </div>
    </main>
  );
}

function ReviewSection({ booking, onReviewed }: { booking: Booking; onReviewed: () => void }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (booking.review) {
    return (
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f3f3f3' }}>
        <p style={{ fontSize: 12, color: '#777', margin: '0 0 4px' }}>Your review</p>
        <StarRating value={booking.review.rating} />
        {booking.review.comment && (
          <p style={{ fontSize: 13, color: '#555', margin: '4px 0 0' }}>{booking.review.comment}</p>
        )}
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ marginTop: 10, border: 'none', background: 'none', color: '#111', fontWeight: 600, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
      >
        Leave a review
      </button>
    );
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await api.createReview({ bookingId: booking.id, rating, comment: comment || undefined });
      onReviewed();
    } catch (err: any) {
      setError(err.message ?? 'Could not submit review');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f3f3f3', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <StarRating value={rating} onChange={setRating} size={20} />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment…"
        rows={2}
        style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 13, resize: 'vertical' }}
      />
      {error && <p style={{ color: 'crimson', fontSize: 13, margin: 0 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{ border: 'none', background: '#111', color: '#fff', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}
        >
          {submitting ? 'Submitting…' : 'Submit review'}
        </button>
        <button
          onClick={() => setOpen(false)}
          style={{ border: 'none', background: 'none', color: '#777', cursor: 'pointer', fontSize: 13 }}
        >
          Cancel
        </button>
      </div>
    </div>
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
