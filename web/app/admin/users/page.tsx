'use client';

import { useEffect, useState } from 'react';
import AdminShell from '../../../components/AdminShell';
import { api, AdminUser, ApprovalStatus } from '../../../lib/api';
import { colors, styles } from '../../../lib/theme';

type StatusFilter = 'ALL' | ApprovalStatus;

export default function AdminUsersPage() {
  return (
    <AdminShell>
      <UsersQueue />
    </AdminShell>
  );
}

function UsersQueue() {
  const [filter, setFilter] = useState<StatusFilter>('PENDING');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refresh();
  }, [filter]);

  function refresh() {
    setLoading(true);
    api.admin
      .listUsers(filter === 'ALL' ? undefined : filter)
      .then(setUsers)
      .finally(() => setLoading(false));
  }

  async function handleDecision(id: string, status: ApprovalStatus) {
    await api.admin.setUserApproval(id, status);
    refresh();
  }

  return (
    <>
      <h1>Users</h1>
      <p style={styles.lede}>
        Client and consultant accounts start pending. Approving an account lets that person book.
        It does not by itself publish a consultant profile — that decision is on Consultants.
        Admin accounts are created with the backend <code>create-admin</code> script and are not
        listed here.
      </p>

      <div style={{ display: 'flex', gap: 8, margin: '12px 0 20px', flexWrap: 'wrap' }}>
        {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as StatusFilter[]).map((value) => (
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

      {!loading && users.length === 0 && <p style={styles.statusSlate}>No users in this view.</p>}

      {!loading && users.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: `1px solid ${colors.line}` }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Joined</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: `1px solid ${colors.line}` }}>
                <td style={tdStyle}>
                  {user.fullName}
                  <div style={{ fontSize: 12, color: colors.slateLight }}>{user.email}</div>
                </td>
                <td style={tdStyle}>{user.role.toLowerCase()}</td>
                <td style={tdStyle}>
                  <StatusText status={user.approvalStatus} />
                </td>
                <td style={tdStyle}>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {user.approvalStatus !== 'APPROVED' && (
                      <button onClick={() => handleDecision(user.id, 'APPROVED')} style={styles.secondaryButton}>
                        Approve
                      </button>
                    )}
                    {user.approvalStatus !== 'REJECTED' && (
                      <button onClick={() => handleDecision(user.id, 'REJECTED')} style={styles.dangerButton}>
                        Reject
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function StatusText({ status }: { status: ApprovalStatus }) {
  const style =
    status === 'APPROVED' ? styles.statusForest : status === 'REJECTED' ? styles.statusRust : styles.statusBrass;
  return <span style={style}>{status}</span>;
}

const thStyle: React.CSSProperties = { padding: '8px 6px', fontSize: 12, color: colors.slate, fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '10px 6px', verticalAlign: 'top' };
