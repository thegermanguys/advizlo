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
import ConsultantNav from '../../components/ConsultantNav';
import { colors, styles } from '../../lib/theme';

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

  if (!user) return <main style={styles.pageNarrow}>Loading…</main>;

  const hasCategory = !!profile?.categoryId && profile.category?.name !== 'Uncategorized';
  const hasPricing = (profile?.serviceTypes?.length ?? 0) > 0;
  const hasAvailability = (profile?.availability?.length ?? 0) > 0;
  const onboardingComplete = hasCategory && hasPricing && hasAvailability && payoutsReady;

  return (
    <main style={styles.pageNarrow}>
      {user.role === 'CONSULTANT' && <ConsultantNav />}
      <h1>Welcome, {user.fullName}</h1>
      <p style={styles.lede}>
        Signed in as <strong>{user.email}</strong> — role: <strong>{user.role.toLowerCase()}</strong>
      </p>

      {user.role === 'CLIENT' && (
        <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
          <a href="/browse" style={styles.secondaryButton}>
            Browse consultants
          </a>
          <a href="/bookings" style={styles.secondaryButton}>
            My bookings
          </a>
        </div>
      )}

      {user.role === 'CONSULTANT' && !onboardingComplete && (
        <div style={{ ...styles.panel, marginTop: 20 }}>
          <p style={{ fontWeight: 700, marginBottom: 10 }}>Finish setting up your profile</p>
          <ChecklistItem done={hasCategory} label="Profile & specialty" href="/onboarding/profile" />
          <ChecklistItem done={hasPricing} label="Pricing" href="/onboarding/pricing" />
          <ChecklistItem done={hasAvailability} label="Availability" href="/onboarding/availability" />
          <ChecklistItem done={payoutsReady} label="Payouts (Stripe)" href="/onboarding/payouts" />
        </div>
      )}

      {user.role === 'CONSULTANT' && onboardingComplete && (
        <div style={{ marginTop: 20 }}>
          <p>
            Your profile is set up{' '}
            {profile?.verificationStatus === 'PENDING' && (
              <span style={styles.statusBrass}>— pending verification review</span>
            )}
            .
          </p>
          <p style={{ color: colors.slate, fontSize: 14 }}>
            {profile?.serviceTypes?.length} consultation type(s) ·{' '}
            <a href="/settings/availability" style={{ color: colors.ink, fontWeight: 600 }}>
              {profile?.availability?.length} availability slot(s)
            </a>
          </p>

          <h3 style={{ marginTop: 24 }}>Upcoming bookings</h3>
          {bookings.length === 0 && <p style={styles.statusSlate}>No bookings yet.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            {bookings.map((b) => (
              <div key={b.id} style={{ ...styles.row, justifyContent: 'flex-start', flexDirection: 'column', alignItems: 'flex-start' }}>
                <p style={{ margin: 0, fontSize: 14 }}>
                  <strong>{b.serviceType.name}</strong> with {b.client?.fullName} —{' '}
                  {new Date(b.scheduledAt).toLocaleString()} — {b.status.toLowerCase()}
                </p>
                {b.status === 'CONFIRMED' &&
                  ['IN_APP_VIDEO', 'ZOOM', 'GOOGLE_MEET'].includes(b.consultationMode) && (
                    b.meetingLink ? (
                      <a href={b.meetingLink} target="_blank" rel="noopener noreferrer" style={{ ...styles.statusForest, fontSize: 13, marginTop: 4 }}>
                        Join call
                      </a>
                    ) : (
                      <span style={{ ...styles.statusBrass, fontSize: 13, marginTop: 4 }}>Meeting link pending</span>
                    )
                  )}
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={handleLogout} style={{ ...styles.secondaryButton, marginTop: 32 }}>
        Log out
      </button>
    </main>
  );
}

function ChecklistItem({ done, label, href }: { done: boolean; label: string; href: string }) {
  return (
    <a href={href} style={checklistLinkStyle}>
      <span style={done ? checklistDotDoneStyle : checklistDotStyle}>{done ? '✓' : ''}</span>
      {label}
      {!done && <span style={{ marginLeft: 'auto', color: colors.slateLight, fontSize: 13 }}>Set up</span>}
    </a>
  );
}

const checklistLinkStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '9px 0',
  textDecoration: 'none',
  color: colors.ink,
  fontSize: 14,
};

const checklistDotStyle: React.CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: '50%',
  border: `1px solid ${colors.ink}`,
  background: 'transparent',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 11,
  flexShrink: 0,
};

const checklistDotDoneStyle: React.CSSProperties = {
  ...checklistDotStyle,
  background: colors.ink,
  color: colors.paper,
};
