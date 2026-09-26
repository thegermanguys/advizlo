'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminShell from '../../components/AdminShell';
import { api, AdminConsultant, AdminStats, AdminUser } from '../../lib/api';
import { colors, styles } from '../../lib/theme';

export default function AdminOverviewPage() {
  return (
    <AdminShell>
      <Overview />
    </AdminShell>
  );
}

function Overview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingConsultants, setPendingConsultants] = useState<AdminConsultant[]>([]);
  const [pendingUsers, setPendingUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.admin.getStats(),
      api.admin.listConsultants('PENDING'),
      api.admin.listUsers('PENDING'),
    ])
      .then(([nextStats, consultants, users]) => {
        setStats(nextStats);
        setPendingConsultants(consultants);
        setPendingUsers(users);
      })
      .catch((err: Error) => setError(err.message ?? 'Could not load admin overview'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function decideConsultant(id: string, status: 'APPROVED' | 'REJECTED') {
    await api.admin.setVerificationStatus(id, status);
    refresh();
  }

  async function decideUser(id: string, status: 'APPROVED' | 'REJECTED') {
    await api.admin.setUserApproval(id, status);
    refresh();
  }

  if (loading) return <p>Loading…</p>;

  return (
    <>
      <p style={styles.eyebrow}>Platform</p>
      <h1>Admin</h1>
      <p style={styles.lede}>
        Approve consultant profiles and user accounts. A consultant appears in public Browse only
        after both the profile and the account are approved. Commission totals live under
        Commissions and use the amounts already stored on each booking and payment.
      </p>
      {error && <p style={styles.statusRust}>{error}</p>}

      {stats && (
        <div style={statGridStyle}>
          <StatCard label="Approved consultants" value={stats.approvedConsultants} />
          <StatCard label="Pending consultants" value={stats.pendingConsultants} />
          <StatCard label="Pending users" value={stats.pendingUsers} />
          <StatCard label="Total clients" value={stats.totalClients} />
          <StatCard label="Total bookings" value={stats.totalBookings} />
          <StatCard label="Gross booking value" value={money(stats.grossBookingValue)} />
          <StatCard label="Commission earned" value={money(stats.totalCommissionEarned)} />
        </div>
      )}

      <h2 style={{ marginTop: 36 }}>Pending consultants</h2>
      {pendingConsultants.length === 0 && <p style={styles.statusSlate}>Nothing waiting on review.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
        {pendingConsultants.map((consultant) => (
          <div key={consultant.id} style={styles.panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <strong>{consultant.user.fullName}</strong>
              <span style={{ color: colors.slate, fontSize: 13 }}>{consultant.category.name}</span>
            </div>
            <p style={{ fontSize: 13, color: colors.slate, marginTop: 4 }}>{consultant.user.email}</p>
            {consultant.bio && <p style={{ fontSize: 14 }}>{consultant.bio}</p>}
            {consultant.credentialsInfo && (
              <p style={{ fontSize: 13, color: colors.slate }}>
                <strong>Credentials:</strong> {consultant.credentialsInfo}
              </p>
            )}
            <p style={{ fontSize: 12, color: colors.slateLight }}>
              Account {consultant.user.approvalStatus.toLowerCase()} · {consultant._count.serviceTypes}{' '}
              consultation type(s)
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => decideConsultant(consultant.id, 'APPROVED')} style={styles.primaryButton}>
                Approve
              </button>
              <button onClick={() => decideConsultant(consultant.id, 'REJECTED')} style={styles.dangerButton}>
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 36 }}>Pending users</h2>
      {pendingUsers.length === 0 && <p style={styles.statusSlate}>Nothing waiting on review.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
        {pendingUsers.map((user) => (
          <div key={user.id} style={styles.row}>
            <div>
              <strong>{user.fullName}</strong>
              <div style={{ fontSize: 13, color: colors.slate }}>
                {user.email} · {user.role.toLowerCase()}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => decideUser(user.id, 'APPROVED')} style={styles.primaryButton}>
                Approve
              </button>
              <button onClick={() => decideUser(user.id, 'REJECTED')} style={styles.dangerButton}>
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={styles.panel}>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 12, color: colors.slate }}>{label}</div>
    </div>
  );
}

function money(amount: number) {
  return `$${amount.toFixed(2)}`;
}

const statGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 12,
  marginTop: 24,
};
