'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Booking } from '../../../lib/api';

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin.listRecentBookings().then(setBookings).finally(() => setLoading(false));
  }, []);

  return (
    <main style={{ maxWidth: 900, margin: '40px auto', padding: 24 }}>
      <Link href="/admin" style={{ fontSize: 13 }}>
        ← Back to overview
      </Link>
      <h1>Recent bookings</h1>

      {loading && <p>Loading…</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 16 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
            <th style={thStyle}>When</th>
            <th style={thStyle}>Client</th>
            <th style={thStyle}>Consultant</th>
            <th style={thStyle}>Service</th>
            <th style={thStyle}>Price</th>
            <th style={thStyle}>Commission</th>
            <th style={thStyle}>Status</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id} style={{ borderBottom: '1px solid #f3f3f3' }}>
              <td style={tdStyle}>{new Date(b.scheduledAt).toLocaleString()}</td>
              <td style={tdStyle}>{b.client?.fullName}</td>
              <td style={tdStyle}>{b.consultant?.user.fullName}</td>
              <td style={tdStyle}>{b.serviceType.name}</td>
              <td style={tdStyle}>{Number(b.priceCharged) === 0 ? 'Free' : `$${b.priceCharged}`}</td>
              <td style={tdStyle}>${b.commissionAmount}</td>
              <td style={tdStyle}>{b.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

const thStyle: React.CSSProperties = { padding: '8px 6px', fontSize: 12, color: '#777' };
const tdStyle: React.CSSProperties = { padding: '8px 6px' };
