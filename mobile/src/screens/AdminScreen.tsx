import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { api, AdminStats, AdminConsultant, AdminUser } from '../lib/api';

type CommissionRow = {
  id: string;
  scheduledAt: string;
  commissionAmount: string;
  priceCharged: string;
  status: string;
  client: { fullName: string };
  consultant: { user: { fullName: string } };
  serviceType: { name: string };
  payment: { status: string; platformFee: string; consultantPayout: string } | null;
};

export default function AdminScreen() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingConsultants, setPendingConsultants] = useState<AdminConsultant[]>([]);
  const [pendingUsers, setPendingUsers] = useState<AdminUser[]>([]);
  const [commissionTotal, setCommissionTotal] = useState<number | null>(null);
  const [feesCollected, setFeesCollected] = useState<number | null>(null);
  const [commissionRows, setCommissionRows] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    setLoading(true);
    Promise.all([
      api.admin.getStats(),
      api.admin.listConsultants('PENDING'),
      api.admin.listUsers('PENDING'),
      api.admin.getCommissions(),
    ])
      .then(([nextStats, consultants, users, commissions]) => {
        setStats(nextStats);
        setPendingConsultants(consultants);
        setPendingUsers(users);
        setCommissionTotal(commissions.totals.totalCommissionEarned);
        setFeesCollected(commissions.totals.platformFeesCollected);
        setCommissionRows(commissions.bookings.slice(0, 8));
      })
      .finally(() => setLoading(false));
  }

  async function decideConsultant(id: string, status: 'APPROVED' | 'REJECTED') {
    await api.admin.setVerificationStatus(id, status);
    refresh();
  }

  async function decideUser(id: string, status: 'APPROVED' | 'REJECTED') {
    await api.admin.setUserApproval(id, status);
    refresh();
  }

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Admin</Text>

      {stats && (
        <View style={styles.statsGrid}>
          <StatCard label="Approved" value={stats.approvedConsultants} />
          <StatCard label="Pending profiles" value={stats.pendingConsultants} />
          <StatCard label="Pending users" value={stats.pendingUsers} />
          <StatCard label="Bookings" value={stats.totalBookings} />
          <StatCard label="GMV" value={`$${stats.grossBookingValue.toFixed(2)}`} />
          <StatCard
            label="Commission"
            value={`$${(commissionTotal ?? stats.totalCommissionEarned).toFixed(2)}`}
          />
        </View>
      )}

      <Text style={styles.sectionTitle}>Pending consultants</Text>
      <Text style={styles.empty}>
        A profile stays off the public list until it is approved and the account is approved.
      </Text>
      {pendingConsultants.length === 0 && <Text style={styles.empty}>Nothing waiting on review.</Text>}
      {pendingConsultants.map((consultant) => (
        <View key={consultant.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={{ fontWeight: '600' }}>{consultant.user.fullName}</Text>
            <Text style={{ color: '#777', fontSize: 12 }}>{consultant.category.name}</Text>
          </View>
          <Text style={styles.cardSubtext}>{consultant.user.email}</Text>
          {consultant.bio && <Text style={styles.cardBio}>{consultant.bio}</Text>}
          <View style={styles.actionRow}>
            <Pressable style={styles.approveBtn} onPress={() => decideConsultant(consultant.id, 'APPROVED')}>
              <Text style={styles.approveBtnText}>Approve</Text>
            </Pressable>
            <Pressable style={styles.rejectBtn} onPress={() => decideConsultant(consultant.id, 'REJECTED')}>
              <Text style={styles.rejectBtnText}>Reject</Text>
            </Pressable>
          </View>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Pending users</Text>
      {pendingUsers.length === 0 && <Text style={styles.empty}>Nothing waiting on review.</Text>}
      {pendingUsers.map((user) => (
        <View key={user.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={{ fontWeight: '600' }}>{user.fullName}</Text>
            <Text style={{ color: '#777', fontSize: 12 }}>{user.role}</Text>
          </View>
          <Text style={styles.cardSubtext}>{user.email}</Text>
          <View style={styles.actionRow}>
            <Pressable style={styles.approveBtn} onPress={() => decideUser(user.id, 'APPROVED')}>
              <Text style={styles.approveBtnText}>Approve</Text>
            </Pressable>
            <Pressable style={styles.rejectBtn} onPress={() => decideUser(user.id, 'REJECTED')}>
              <Text style={styles.rejectBtnText}>Reject</Text>
            </Pressable>
          </View>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Commissions</Text>
      <Text style={styles.empty}>
        Stored booking commission
        {commissionTotal != null ? `: $${commissionTotal.toFixed(2)}` : ''}
        {feesCollected != null ? `. Platform fees collected: $${feesCollected.toFixed(2)}.` : '.'}
      </Text>
      {commissionRows.map((row) => (
        <View key={row.id} style={styles.card}>
          <Text style={{ fontWeight: '600' }}>{row.serviceType.name}</Text>
          <Text style={styles.cardSubtext}>
            {row.client.fullName} → {row.consultant.user.fullName}
          </Text>
          <Text style={styles.cardBio}>
            Commission ${row.commissionAmount} · price ${row.priceCharged} · {row.status}
            {row.payment ? ` · payment ${row.payment.status.toLowerCase()} · fee $${row.payment.platformFee}` : ' · no payment'}
          </Text>
        </View>
      ))}

      <Text style={styles.note}>
        Category and per-consultant commission overrides are edited on the web admin panel.
      </Text>
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 8 },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { width: '31%', borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10 },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 11, color: '#777' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 20, marginBottom: 8 },
  empty: { color: '#777' },
  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12, marginBottom: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  cardSubtext: { color: '#999', fontSize: 12 },
  cardBio: { color: '#555', fontSize: 13, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  approveBtn: { borderWidth: 1, borderColor: '#0a7d34', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 12 },
  approveBtnText: { color: '#0a7d34', fontSize: 12, fontWeight: '600' },
  rejectBtn: { borderWidth: 1, borderColor: '#c0392b', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 12 },
  rejectBtnText: { color: '#c0392b', fontSize: 12, fontWeight: '600' },
  note: { fontSize: 12, color: '#999', marginTop: 20, fontStyle: 'italic' },
});
