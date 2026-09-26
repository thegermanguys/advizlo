'use client';

import { useEffect, useState } from 'react';
import AdminShell from '../../../components/AdminShell';
import { api, Booking } from '../../../lib/api';
import { colors, styles } from '../../../lib/theme';

export default function AdminBookingsPage() {
  return (
    <AdminShell>
      <Bookings />
    </AdminShell>
  );
}

function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin.listRecentBookings().then(setBookings).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <h1>Recent bookings</h1>
      <p style={styles.lede}>
        Commission on each row is the amount stored when the booking was created. Payment splits
        are on Commissions.
      </p>

      {loading && <p>Loading…</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 16 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: `1px solid ${colors.line}` }}>
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
          {bookings.map((booking) => (
            <tr key={booking.id} style={{ borderBottom: `1px solid ${colors.line}` }}>
              <td style={tdStyle}>{new Date(booking.scheduledAt).toLocaleString()}</td>
              <td style={tdStyle}>{booking.client?.fullName}</td>
              <td style={tdStyle}>{booking.consultant?.user.fullName}</td>
              <td style={tdStyle}>{booking.serviceType.name}</td>
              <td style={tdStyle}>
                {Number(booking.priceCharged) === 0 ? 'Free' : `$${booking.priceCharged}`}
              </td>
              <td style={tdStyle}>${booking.commissionAmount}</td>
              <td style={tdStyle}>{booking.status.toLowerCase()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

const thStyle: React.CSSProperties = { padding: '8px 6px', fontSize: 12, color: colors.slate, fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '8px 6px' };
