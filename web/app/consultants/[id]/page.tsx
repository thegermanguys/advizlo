'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  api,
  getToken,
  ConsultantProfile,
  ServiceType,
  ConsultationMode,
} from '../../../lib/api';
import StarRating from '../../../components/StarRating';

const MODE_LABELS: Record<ConsultationMode, string> = {
  IN_APP_VIDEO: 'Video call (in-app)',
  ZOOM: 'Zoom',
  GOOGLE_MEET: 'Google Meet',
  PHONE: 'Phone call',
  IN_PERSON: 'In-person',
};

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

export default function ConsultantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<ConsultantProfile | null>(null);
  const [selectedServiceType, setSelectedServiceType] = useState<ServiceType | null>(null);
  const [mode, setMode] = useState<ConsultationMode | null>(null);
  const [date, setDate] = useState(todayISODate());
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    api.getConsultant(id).then(setProfile).catch(() => setError('Consultant not found'));
  }, [id]);

  useEffect(() => {
    if (!selectedServiceType) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    api
      .getAvailableSlots(id, selectedServiceType.id, date)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedServiceType, date, id]);

  function selectServiceType(st: ServiceType) {
    setSelectedServiceType(st);
    setMode(st.consultationModes[0] ?? null);
  }

  async function handleBook() {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    if (!selectedServiceType || !mode || !selectedSlot) return;
    setError(null);
    setBooking(true);
    try {
      const result = await api.createBooking({
        consultantId: id,
        serviceTypeId: selectedServiceType.id,
        scheduledAt: selectedSlot,
        consultationMode: mode,
      });
      setConfirmedBooking(result);
    } catch (err: any) {
      setError(err.message ?? 'Could not complete booking');
    } finally {
      setBooking(false);
    }
  }

  async function handlePayNow() {
    if (!confirmedBooking) return;
    setPayLoading(true);
    try {
      const { url } = await api.createCheckoutSession(confirmedBooking.id);
      window.location.href = url;
    } catch (err: any) {
      setError(err.message ?? 'Could not start payment');
      setPayLoading(false);
    }
  }

  if (error && !profile) return <main style={{ padding: 24 }}>{error}</main>;
  if (!profile) return <main style={{ padding: 24 }}>Loading…</main>;

  if (confirmedBooking) {
    return (
      <main style={{ maxWidth: 480, margin: '60px auto', padding: 24 }}>
        <h1>
          {confirmedBooking.status === 'CONFIRMED' ? 'Booking confirmed 🎉' : 'Booking requested'}
        </h1>
        <p style={{ color: '#555' }}>
          {confirmedBooking.status === 'CONFIRMED'
            ? "You're all set."
            : 'This slot is held for you — payment (coming in the next build step) will confirm it.'}
        </p>
        <div style={{ marginTop: 16, padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
          <p>
            <strong>{selectedServiceType?.name}</strong> with {profile.user?.fullName}
          </p>
          <p>{new Date(confirmedBooking.scheduledAt).toLocaleString()}</p>
          <p>{MODE_LABELS[confirmedBooking.consultationMode as ConsultationMode]}</p>
          {confirmedBooking.address && <p>Address: {confirmedBooking.address}</p>}
          <p>
            {Number(confirmedBooking.priceCharged) === 0
              ? 'Free'
              : `$${confirmedBooking.priceCharged}`}
          </p>
          {confirmedBooking.status === 'CONFIRMED' &&
            ['IN_APP_VIDEO', 'ZOOM', 'GOOGLE_MEET'].includes(confirmedBooking.consultationMode) && (
              confirmedBooking.meetingLink ? (
                <a
                  href={confirmedBooking.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0a7d34', fontWeight: 600 }}
                >
                  Join call →
                </a>
              ) : (
                <p style={{ color: '#a67c00', fontSize: 13 }}>Meeting link pending…</p>
              )
            )}
        </div>
        <button onClick={() => router.push('/bookings')} style={{ marginTop: 20, ...submitStyle }}>
          View my bookings
        </button>
        {confirmedBooking.status === 'PENDING' && Number(confirmedBooking.priceCharged) > 0 && (
          <button
            onClick={handlePayNow}
            disabled={payLoading}
            style={{ marginTop: 12, ...submitStyle, background: '#0a7d34' }}
          >
            {payLoading ? 'Redirecting…' : `Pay $${confirmedBooking.priceCharged} now`}
          </button>
        )}
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 640, margin: '40px auto', padding: 24 }}>
      <h1>{profile.user?.fullName}</h1>
      <p style={{ color: '#777' }}>{profile.category?.name}</p>
      {!!profile.reviewCount && profile.averageRating != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <StarRating value={profile.averageRating} />
          <span style={{ fontSize: 13, color: '#555' }}>
            {profile.averageRating.toFixed(1)} ({profile.reviewCount} review
            {profile.reviewCount === 1 ? '' : 's'})
          </span>
        </div>
      )}
      {profile.bio && <p style={{ color: '#555' }}>{profile.bio}</p>}

      <h2 style={{ marginTop: 32 }}>1. Choose a consultation type</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {profile.serviceTypes?.map((st) => (
          <button
            key={st.id}
            onClick={() => selectServiceType(st)}
            style={{
              textAlign: 'left',
              padding: 14,
              borderRadius: 8,
              border: selectedServiceType?.id === st.id ? '2px solid #111' : '1px solid #ccc',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            <strong>{st.name}</strong> — {st.durationMins} min —{' '}
            {Number(st.price) === 0 ? 'Free' : `$${st.price}`}
          </button>
        ))}
      </div>

      {selectedServiceType && (
        <>
          <h2 style={{ marginTop: 32 }}>2. How would you like to meet?</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {selectedServiceType.consultationModes.map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 20,
                  border: mode === m ? '2px solid #111' : '1px solid #ccc',
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
          {mode === 'IN_PERSON' && profile.inPersonAddress && (
            <p style={{ fontSize: 13, color: '#777', marginTop: 6 }}>
              Address: {profile.inPersonAddress}
            </p>
          )}

          <h2 style={{ marginTop: 32 }}>3. Pick a time</h2>
          <input
            type="date"
            value={date}
            min={todayISODate()}
            onChange={(e) => setDate(e.target.value)}
            style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', marginBottom: 12 }}
          />
          {loadingSlots && <p>Loading slots…</p>}
          {!loadingSlots && slots.length === 0 && (
            <p style={{ color: '#777' }}>No open slots this day — try another date.</p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {slots.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSlot(s)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: selectedSlot === s ? '2px solid #111' : '1px solid #ccc',
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                {new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </button>
            ))}
          </div>

          {error && <p style={{ color: 'crimson', marginTop: 12 }}>{error}</p>}

          <button
            onClick={handleBook}
            disabled={!selectedSlot || !mode || booking}
            style={{ ...submitStyle, marginTop: 24, opacity: !selectedSlot || !mode ? 0.5 : 1 }}
          >
            {booking
              ? 'Booking…'
              : Number(selectedServiceType.price) === 0
                ? 'Book free consultation'
                : `Book — $${selectedServiceType.price}`}
          </button>
        </>
      )}

      {!!profile.reviews?.length && (
        <>
          <h2 style={{ marginTop: 40 }}>Reviews</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            {profile.reviews.map((r) => (
              <div key={r.id} style={{ padding: 14, border: '1px solid #eee', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <StarRating value={r.rating} />
                  <span style={{ fontSize: 12, color: '#999' }}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, margin: '6px 0 0' }}>{r.client.fullName}</p>
                {r.comment && <p style={{ fontSize: 14, color: '#555', margin: '4px 0 0' }}>{r.comment}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
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
