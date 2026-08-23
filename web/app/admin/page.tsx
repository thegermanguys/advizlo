'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getToken, AdminStats, AdminConsultant } from '../../lib/api';

export default function AdminOverviewPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pending, setPending] = useState<AdminConsultant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    refresh();
  }, [router]);

  function refresh() {
    setLoading(true);
    Promise.all([api.admin.getStats(), api.admin.listConsultants('PENDING')])
      .then(([s, p]) => {
        setStats(s);
        setPending(p);
      })
      .catch(() => router.push('/dashboard')) // not an admin, or not logged in
      .finally(() => setLoading(false));
  }

  async function handleDecision(id: string, status: 'APPROVED' | 'REJECTED') {
    await api.admin.setVerificationStatus(id, status);
    refresh();
  }

  if (loading) return <main style={{ padding: 24 }}>Loading…</main>;

  return (
    <main style={{ maxWidth: 800, margin: '40px auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1>Admin</h1>
        <nav style={{ display: 'flex', gap: 16, fontSize: 14 }}>
          <Link href="/admin/consultants">All consultants</Link>
          <Link href="/admin/categories">Categories</Link>
          <Link href="/admin/bookings">Bookings</Link>
        </nav>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 24 }}>
          <StatCard label="Approved consultants" value={stats.approvedConsultants} />
          <StatCard label="Pending approval" value={stats.pendingConsultants} />
          <StatCard label="Total clients" value={stats.totalClients} />
          <StatCard label="Total bookings" value={stats.totalBookings} />
          <StatCard label="Gross booking value" value={`$${stats.grossBookingValue.toFixed(2)}`} />
          <StatCard label="Commission earned" value={`$${stats.totalCommissionEarned.toFixed(2)}`} />
        </div>
      )}

      <h2 style={{ marginTop: 32 }}>Pending consultant approvals</h2>
      {pending.length === 0 && <p style={{ color: '#777' }}>Nothing waiting on review.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
        {pending.map((c) => (
          <div key={c.id} style={{ padding: 14, border: '1px solid #eee', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{c.user.fullName}</strong>
              <span style={{ color: '#777', fontSize: 13 }}>{c.category.name}</span>
            </div>
            <p style={{ fontSize: 13, color: '#777' }}>{c.user.email}</p>
            {c.bio && <p style={{ fontSize: 14, color: '#555' }}>{c.bio}</p>}
            {c.credentialsInfo && (
              <p style={{ fontSize: 13, color: '#555' }}>
                <strong>Credentials:</strong> {c.credentialsInfo}
              </p>
            )}
            <p style={{ fontSize: 12, color: '#999' }}>
              {c._count.serviceTypes} consultation type(s) configured
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => handleDecision(c.id, 'APPROVED')} style={approveStyle}>
                Approve
              </button>
              <button onClick={() => handleDecision(c.id, 'REJECTED')} style={rejectStyle}>
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ padding: 14, border: '1px solid #eee', borderRadius: 8 }}>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#777' }}>{label}</div>
    </div>
  );
}

const approveStyle: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 6,
  border: 'none',
  background: '#0a7d34',
  color: '#fff',
  fontSize: 13,
  cursor: 'pointer',
};
const rejectStyle: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 6,
  border: '1px solid #c0392b',
  background: '#fff',
  color: '#c0392b',
  fontSize: 13,
  cursor: 'pointer',
};
