'use client';

import { useEffect, useState } from 'react';
import AdminShell from '../../../components/AdminShell';
import { api, CommissionReport } from '../../../lib/api';
import { colors, styles } from '../../../lib/theme';

export default function AdminCommissionsPage() {
  return (
    <AdminShell>
      <Commissions />
    </AdminShell>
  );
}

function Commissions() {
  const [report, setReport] = useState<CommissionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.admin
      .getCommissions()
      .then(setReport)
      .catch((err: Error) => setError(err.message ?? 'Could not load commissions'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading…</p>;
  if (error) return <p style={styles.statusRust}>{error}</p>;
  if (!report) return null;

  const succeeded = report.totals.paymentsByStatus.SUCCEEDED;
  const pending = report.totals.paymentsByStatus.PENDING;
  const refunded = report.totals.paymentsByStatus.REFUNDED;
  const failed = report.totals.paymentsByStatus.FAILED;

  return (
    <>
      <h1>Commissions</h1>
      <p style={styles.lede}>
        The platform default rate is {(report.commissionRate * 100).toFixed(0)}% (
        <code>COMMISSION_RATE</code>
        ). Each booking stores its own commission, including any category or consultant override
        that applied when it was created. Payment rows record the platform fee and consultant
        payout from that same amount. Nothing here starts a new charge.
      </p>

      <div style={statGridStyle}>
        <StatCard label="Commission on confirmed bookings" value={money(report.totals.totalCommissionEarned)} />
        <StatCard label="Platform fees collected" value={money(report.totals.platformFeesCollected)} />
        <StatCard label="Consultant payouts" value={money(report.totals.consultantPayouts)} />
        <StatCard label="Refunded platform fees" value={money(report.totals.refundedPlatformFees)} />
        <StatCard label="Gross booking value" value={money(report.totals.grossBookingValue)} />
        <StatCard
          label="Payments"
          value={`${succeeded?.count ?? 0} paid · ${pending?.count ?? 0} pending · ${refunded?.count ?? 0} refunded · ${failed?.count ?? 0} failed`}
        />
      </div>

      <h2 style={{ marginTop: 36 }}>Per booking</h2>
      {report.bookings.length === 0 && <p style={styles.statusSlate}>No bookings yet.</p>}
      {report.bookings.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 12 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: `1px solid ${colors.line}` }}>
                <th style={thStyle}>When</th>
                <th style={thStyle}>Client</th>
                <th style={thStyle}>Consultant</th>
                <th style={thStyle}>Service</th>
                <th style={thStyle}>Price</th>
                <th style={thStyle}>Commission</th>
                <th style={thStyle}>Payment</th>
                <th style={thStyle}>Platform fee</th>
                <th style={thStyle}>Payout</th>
                <th style={thStyle}>Booking</th>
              </tr>
            </thead>
            <tbody>
              {report.bookings.map((booking) => (
                <tr key={booking.id} style={{ borderBottom: `1px solid ${colors.line}` }}>
                  <td style={tdStyle}>{new Date(booking.scheduledAt).toLocaleString()}</td>
                  <td style={tdStyle}>{booking.client.fullName}</td>
                  <td style={tdStyle}>{booking.consultant.user.fullName}</td>
                  <td style={tdStyle}>{booking.serviceType.name}</td>
                  <td style={tdStyle}>{formatStored(booking.priceCharged)}</td>
                  <td style={tdStyle}>{formatStored(booking.commissionAmount)}</td>
                  <td style={tdStyle}>{booking.payment ? booking.payment.status.toLowerCase() : 'none'}</td>
                  <td style={tdStyle}>
                    {booking.payment ? formatStored(booking.payment.platformFee) : '—'}
                  </td>
                  <td style={tdStyle}>
                    {booking.payment ? formatStored(booking.payment.consultantPayout) : '—'}
                  </td>
                  <td style={tdStyle}>{booking.status.toLowerCase()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.panel}>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 12, color: colors.slate }}>{label}</div>
    </div>
  );
}

function money(amount: number) {
  return `$${amount.toFixed(2)}`;
}

function formatStored(amount: string) {
  const value = Number(amount);
  if (value === 0) return 'Free';
  return `$${amount}`;
}

const statGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 12,
  marginTop: 8,
};

const thStyle: React.CSSProperties = { padding: '8px 6px', fontSize: 12, color: colors.slate, fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '8px 6px', whiteSpace: 'nowrap' };
