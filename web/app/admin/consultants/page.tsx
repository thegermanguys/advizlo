'use client';

import { useEffect, useState } from 'react';
import AdminShell from '../../../components/AdminShell';
import { api, AdminConsultant, ApprovalStatus } from '../../../lib/api';
import { colors, styles } from '../../../lib/theme';

type StatusFilter = 'ALL' | ApprovalStatus;

export default function AdminConsultantsPage() {
  return (
    <AdminShell>
      <Consultants />
    </AdminShell>
  );
}

function Consultants() {
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

  async function handleDecision(id: string, status: ApprovalStatus) {
    await api.admin.setVerificationStatus(id, status);
    refresh();
  }

  async function handleCommissionChange(id: string, value: string) {
    const override = value === '' ? null : Number(value) / 100;
    await api.admin.setConsultantCommission(id, override);
    refresh();
  }

  return (
    <>
      <h1>Consultants</h1>
      <p style={styles.lede}>
        Profile approval is separate from the account decision on Users. Browse lists a consultant
        only when both are approved. Existing profiles keep the verification status they already
        had, so consultants who were already approved stay public.
      </p>

      <div style={{ display: 'flex', gap: 8, margin: '12px 0 20px', flexWrap: 'wrap' }}>
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as StatusFilter[]).map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            style={filter === value ? styles.primaryButton : styles.secondaryButton}
          >
            {value}
          </button>
        ))}
      </div>

      {loading && <p>Loading…</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: `1px solid ${colors.line}` }}>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Category</th>
            <th style={thStyle}>Profile</th>
            <th style={thStyle}>Account</th>
            <th style={thStyle}>Commission override (%)</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {consultants.map((consultant) => (
            <tr key={consultant.id} style={{ borderBottom: `1px solid ${colors.line}` }}>
              <td style={tdStyle}>
                {consultant.user.fullName}
                <div style={{ fontSize: 12, color: colors.slateLight }}>{consultant.user.email}</div>
              </td>
              <td style={tdStyle}>{consultant.category.name}</td>
              <td style={tdStyle}>
                <StatusText status={consultant.verificationStatus} />
              </td>
              <td style={tdStyle}>
                <StatusText status={consultant.user.approvalStatus} />
              </td>
              <td style={tdStyle}>
                <input
                  type="number"
                  placeholder="global"
                  defaultValue={
                    consultant.commissionRateOverride != null
                      ? Math.round(consultant.commissionRateOverride * 100)
                      : ''
                  }
                  onBlur={(e) => handleCommissionChange(consultant.id, e.target.value)}
                  style={{ ...styles.input, width: 80 }}
                />
              </td>
              <td style={tdStyle}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {consultant.verificationStatus !== 'APPROVED' && (
                    <button
                      onClick={() => handleDecision(consultant.id, 'APPROVED')}
                      style={styles.secondaryButton}
                    >
                      Approve
                    </button>
                  )}
                  {consultant.verificationStatus !== 'REJECTED' && (
                    <button
                      onClick={() => handleDecision(consultant.id, 'REJECTED')}
                      style={styles.dangerButton}
                    >
                      Reject
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function StatusText({ status }: { status: string }) {
  const style =
    status === 'APPROVED' ? styles.statusForest : status === 'REJECTED' ? styles.statusRust : styles.statusBrass;
  return <span style={style}>{status}</span>;
}

const thStyle: React.CSSProperties = { padding: '8px 6px', fontSize: 12, color: colors.slate, fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '10px 6px', verticalAlign: 'top' };
