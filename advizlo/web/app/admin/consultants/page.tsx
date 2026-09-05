'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, AdminConsultant } from '../../../lib/api';

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

export default function AdminConsultantsPage() {
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [consultants, setConsultants] = useState<AdminConsultant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refresh();
  }, [filter]);

  function refresh() {
    setLoading(true);
    api.admin
      .listConsultants(filter === 'ALL' ? undefined : filter)
      .then(setConsultants)
      .finally(() => setLoading(false));
  }

  async function handleDecision(id: string, status: 'APPROVED' | 'REJECTED' | 'PENDING') {
    await api.admin.setVerificationStatus(id, status);
    refresh();
  }

  async function handleCommissionChange(id: string, value: string) {
    const override = value === '' ? null : Number(value) / 100;
    await api.admin.setConsultantCommission(id, override);
    refresh();
  }

  return (
    <main style={{ maxWidth: 900, margin: '40px auto', padding: 24 }}>
      <Link href="/admin" style={{ fontSize: 13 }}>
        ← Back to overview
      </Link>
      <h1>All consultants</h1>

      <div style={{ display: 'flex', gap: 8, margin: '12px 0 20px' }}>
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as StatusFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 12px',
              borderRadius: 20,
              border: filter === f ? '1px solid #111' : '1px solid #ccc',
              background: filter === f ? '#111' : '#fff',
              color: filter === f ? '#fff' : '#111',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {loading && <p>Loading…</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Category</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Commission override (%)</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {consultants.map((c) => (
            <tr key={c.id} style={{ borderBottom: '1px solid #f3f3f3' }}>
              <td style={tdStyle}>
                {c.user.fullName}
                <div style={{ fontSize: 12, color: '#999' }}>{c.user.email}</div>
              </td>
              <td style={tdStyle}>{c.category.name}</td>
              <td style={tdStyle}>
                <StatusBadge status={c.verificationStatus} />
              </td>
              <td style={tdStyle}>
                <input
                  type="number"
                  placeholder="global"
                  defaultValue={
                    c.commissionRateOverride != null
                      ? Math.round(c.commissionRateOverride * 100)
                      : ''
                  }
                  onBlur={(e) => handleCommissionChange(c.id, e.target.value)}
                  style={{ width: 70, padding: 4, borderRadius: 4, border: '1px solid #ccc' }}
                />
              </td>
              <td style={tdStyle}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {c.verificationStatus !== 'APPROVED' && (
                    <button onClick={() => handleDecision(c.id, 'APPROVED')} style={smallBtn('#0a7d34')}>
                      Approve
                    </button>
                  )}
                  {c.verificationStatus !== 'REJECTED' && (
                    <button onClick={() => handleDecision(c.id, 'REJECTED')} style={smallBtn('#c0392b')}>
                      Reject
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = { PENDING: '#a67c00', APPROVED: '#0a7d34', REJECTED: '#c0392b' };
  return <span style={{ color: colors[status], fontWeight: 600, fontSize: 12 }}>{status}</span>;
}

function smallBtn(color: string): React.CSSProperties {
  return {
    padding: '4px 10px',
    borderRadius: 6,
    border: `1px solid ${color}`,
    background: '#fff',
    color,
    fontSize: 12,
    cursor: 'pointer',
  };
}

const thStyle: React.CSSProperties = { padding: '8px 6px', fontSize: 12, color: '#777' };
const tdStyle: React.CSSProperties = { padding: '10px 6px', verticalAlign: 'top' };
