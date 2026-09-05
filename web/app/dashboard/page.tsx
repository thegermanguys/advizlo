'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  api,
  clearToken,
  getToken,
  AuthUser,
  ConsultantProfile,
  Booking,
} from '../../lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ConsultantProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payoutsReady, setPayoutsReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    api
      .me()
      .then(async (me) => {
        setUser(me);
        if (me.role === 'ADMIN') {
          router.replace('/admin');
          return;
        }
        if (me.role === 'CONSULTANT') {
          const p = await api.getMyConsultantProfile().catch(() => null);
          setProfile(p);
          const b = await api.listMyBookingsAsConsultant().catch(() => []);
          setBookings(b);
          const status = await api.getConnectStatus().catch(() => null);
          setPayoutsReady(!!status?.chargesEnabled);
        }
      })
      .catch(() => {
        clearToken();
        router.push('/login');
      });
  }, [router]);

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  if (!user) return <main style={{ padding: 24 }}>Loading…</main>;

  const hasCategory = !!profile?.categoryId && profile.category?.name !== 'Uncategorized';
  const hasPricing = (profile?.serviceTypes?.length ?? 0) > 0;
  const hasAvailability = (profile?.availability?.length ?? 0) > 0;
  const onboardingComplete = hasCategory && hasPricing && hasAvailability && payoutsReady;

  return (
    <main style={{ maxWidth: 480, margin: '60px auto', padding: 24 }}>
      <h1>Welcome, {user.fullName}</h1>
      <p style={{ color: '#555' }}>
        Signed in as <strong>{user.email}</strong> — role: <strong>{user.role}</strong>
      </p>

      {user.role === 'CLIENT' && (
        <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
          <a href="/browse" style={linkButtonStyle}>
            Browse consultants
          </a>
          <a href="/bookings" style={linkButtonStyle}>
            My bookings
          </a>
        </div>
      )}

      {user.role === 'CONSULTANT' && !onboardingComplete && (
        <div style={{ marginTop: 16, padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Finish setting up your profile</p>
          <ChecklistItem done={hasCategory} label="Profile & specialty" href="/onboarding/profile" />
          <ChecklistItem done={hasPricing} label="Pricing" href="/onboarding/pricing" />
          <ChecklistItem done={hasAvailability} label="Availability" href="/onboarding/availability" />
          <ChecklistItem done={payoutsReady} label="Payouts (Stripe)" href="/onboarding/payouts" />
        </div>
      )}

      {user.role === 'CONSULTANT' && onboardingComplete && (
        <div style={{ marginTop: 16 }}>
          <p>
            Your profile is set up{' '}
            {profile?.verificationStatus === 'PENDING' && (
              <span style={{ color: '#a67c00' }}>— pending verification review</span>
            )}
            .
          </p>
          <p style={{ color: '#555', fontSize: 14 }}>
            {profile?.serviceTypes?.length} consultation type(s) ·{' '}
            <a href="/settings/availability" style={{ color: '#111' }}>
              {profile?.availability?.length} availability slot(s)
            </a>
          </p>

          <h3 style={{ marginTop: 20 }}>Upcoming bookings</h3>
          {bookings.length === 0 && <p style={{ color: '#777', fontSize: 14 }}>No bookings yet.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {bookings.map((b) => (
              <div key={b.id} style={{ padding: 12, border: '1px solid #eee', borderRadius: 8, fontSize: 14 }}>
                <strong>{b.serviceType.name}</strong> with {b.client?.fullName} —{' '}
                {new Date(b.scheduledAt).toLocaleString()} — {b.status}
                {b.status === 'CONFIRMED' &&
                  ['IN_APP_VIDEO', 'ZOOM', 'GOOGLE_MEET'].includes(b.consultationMode) && (
                    b.meetingLink ? (
                      <>
                        {' — '}
                        <a href={b.meetingLink} target="_blank" rel="noopener noreferrer" style={{ color: '#0a7d34', fontWeight: 600 }}>
                          Join call
                        </a>
                      </>
                    ) : (
                      <span style={{ color: '#a67c00' }}> — meeting link pending</span>
                    )
                  )}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleLogout}
        style={{ marginTop: 24, padding: '10px 16px', border: '1px solid #ccc', borderRadius: 6 }}
      >
        Log out
      </button>
    </main>
  );
}

function ChecklistItem({ done, label, href }: { done: boolean; label: string; href: string }) {
  return (
    <a
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 0',
        textDecoration: 'none',
        color: '#111',
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
          border: '1px solid #111',
          background: done ? '#111' : 'transparent',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 11,
        }}
      >
        {done ? '✓' : ''}
      </span>
      {label}
      {!done && <span style={{ marginLeft: 'auto', color: '#999', fontSize: 13 }}>→</span>}
    </a>
  );
}

const linkButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 6,
  border: '1px solid #111',
  color: '#111',
  textDecoration: 'none',
  fontSize: 14,
};
