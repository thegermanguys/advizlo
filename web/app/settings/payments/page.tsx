'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken, Booking } from '../../../lib/api';
import ConsultantNav from '../../../components/ConsultantNav';
import { colors, styles } from '../../../lib/theme';

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
    <main style={styles.pageWide}>
      <ConsultantNav />
      <h1>Payments</h1>
      <p style={styles.lede}>
        What you've earned from paid consultations, after Advizlo's platform commission.
      </p>

      {!payoutsReady && (
        <p style={styles.statusBrass}>
          You haven't finished connecting Stripe — payouts won't reach your bank account until
          that's done. <a href="/onboarding/payouts" style={styles.statusBrass}>Finish connecting.</a>
        </p>
      )}

      {!loaded && <p style={styles.statusSlate}>Loading…</p>}

      {loaded && (
        <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
          <StatCard label="Total earned, net" value={`$${netPayout.toFixed(2)}`} highlight />
          <StatCard label="Gross before commission" value={`$${grossEarnings.toFixed(2)}`} />
          <StatCard label="Platform commission" value={`$${totalCommission.toFixed(2)}`} />
        </div>
      )}

      {loaded && freeConsultsCount > 0 && (
        <p style={{ fontSize: 13, color: colors.slateLight, marginTop: 20 }}>
          Plus {freeConsultsCount} free consultation{freeConsultsCount === 1 ? '' : 's'} — no
          charge, not counted above.
        </p>
      )}

      <h3 style={{ marginTop: 40 }}>Paid consultations</h3>
      {loaded && earningBookings.length === 0 && (
        <p style={styles.statusSlate}>No paid consultations yet.</p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
        {earningBookings
          .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
          .map((b) => (
            <div key={b.id} style={styles.row}>
              <div>
                <p style={{ margin: 0, fontWeight: 700 }}>{b.serviceType.name}</p>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: colors.slate }}>
                  {new Date(b.scheduledAt).toLocaleDateString()} · {b.status.toLowerCase()}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontWeight: 700 }}>
                  ${(Number(b.priceCharged) - Number(b.commissionAmount)).toFixed(2)}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: colors.slateLight }}>
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
        padding: 18,
        border: `1px solid ${highlight ? colors.ink : colors.line}`,
        borderRadius: 6,
        minWidth: 160,
        flex: 1,
        background: colors.white,
      }}
    >
      <p style={{ margin: 0, fontSize: 12, color: colors.slate }}>{label}</p>
      <p style={{ margin: '8px 0 0', fontSize: 26, fontFamily: 'var(--font-display)', fontWeight: 600 }}>{value}</p>
    </div>
  );
}
