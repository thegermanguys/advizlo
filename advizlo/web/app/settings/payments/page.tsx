'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken, Booking } from '../../../lib/api';
import ConsultantNav from '../../../components/ConsultantNav';

export default function ConsultantPaymentsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payoutsReady, setPayoutsReady] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    Promise.all([
      api.listMyBookingsAsConsultant().catch(() => []),
      api.getConnectStatus().catch(() => null),
    ]).then(([b, status]) => {
      setBookings(b);
      setPayoutsReady(!!status?.chargesEnabled);
      setLoaded(true);
    });
  }, [router]);

  const now = Date.now();
  const earningBookings = bookings.filter(
    (b) =>
      Number(b.priceCharged) > 0 &&
      (b.status === 'COMPLETED' || (b.status === 'CONFIRMED' && new Date(b.scheduledAt).getTime() < now)),
  );

  const grossEarnings = earningBookings.reduce((sum, b) => sum + Number(b.priceCharged), 0);
  const totalCommission = earningBookings.reduce((sum, b) => sum + Number(b.commissionAmount), 0);
  const netPayout = grossEarnings - totalCommission;

  const freeConsultsCount = bookings.filter(
    (b) => Number(b.priceCharged) === 0 && (b.status === 'COMPLETED' || b.status === 'CONFIRMED'),
  ).length;

  return (
    <main style={{ maxWidth: 640, margin: '60px auto', padding: 24 }}>
      <ConsultantNav />
      <h1>Payments</h1>
      <p style={{ color: '#555' }}>
        A summary of what you've earned from paid consultations, after Advizlo's platform
        commission.
      </p>

      {!payoutsReady && (
        <p style={{ color: '#a67c00', fontSize: 14 }}>
          You haven't finished connecting Stripe yet — payouts won't reach your bank account
          until that's done.{' '}
          <a href="/onboarding/payouts" style={{ color: '#a67c00', fontWeight: 600 }}>
            Finish connecting →
          </a>
        </p>
      )}

      {!loaded && <p style={{ color: '#777' }}>Loading…</p>}

      {loaded && (
        <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
          <StatCard label="Total earned (net)" value={`$${netPayout.toFixed(2)}`} highlight />
          <StatCard label="Gross before commission" value={`$${grossEarnings.toFixed(2)}`} />
          <StatCard label="Platform commission" value={`$${totalCommission.toFixed(2)}`} />
        </div>
      )}

      {loaded && freeConsultsCount > 0 && (
        <p style={{ fontSize: 13, color: '#999', marginTop: 16 }}>
          Plus {freeConsultsCount} free consultation{freeConsultsCount === 1 ? '' : 's'} (no
          charge, not included above).
        </p>
      )}

      <h3 style={{ marginTop: 32 }}>Paid consultations</h3>
      {loaded && earningBookings.length === 0 && (
        <p style={{ color: '#777', fontSize: 14 }}>No paid consultations yet.</p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        {earningBookings
          .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
          .map((b) => (
            <div key={b.id} style={rowStyle}>
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>{b.serviceType.name}</p>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#555' }}>
                  {new Date(b.scheduledAt).toLocaleDateString()} · {b.status}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontWeight: 600 }}>
                  ${(Number(b.priceCharged) - Number(b.commissionAmount)).toFixed(2)}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#999' }}>
                  of ${Number(b.priceCharged).toFixed(2)} charged
                </p>
              </div>
            </div>
          ))}
      </div>
    </main>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
        padding: 16,
        border: highlight ? '2px solid #111' : '1px solid #eee',
        borderRadius: 8,
        minWidth: 160,
        flex: 1,
      }}
    >
      <p style={{ margin: 0, fontSize: 12, color: '#777' }}>{label}</p>
      <p style={{ margin: '6px 0 0', fontSize: 24, fontWeight: 700 }}>{value}</p>
    </div>
  );
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 12,
  border: '1px solid #eee',
  borderRadius: 8,
};
