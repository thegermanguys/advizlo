import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { api, AdminStats, AdminConsultant } from '../lib/api';

export default function AdminScreen() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pending, setPending] = useState<AdminConsultant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    setLoading(true);
    Promise.all([api.admin.getStats(), api.admin.listConsultants('PENDING')])
      .then(([s, p]) => {
        setStats(s);
        setPending(p);
      })
      .finally(() => setLoading(false));
  }

  async function handleDecision(id: string, status: 'APPROVED' | 'REJECTED') {
    await api.admin.setVerificationStatus(id, status);
    refresh();
  }

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Admin</Text>

      {stats && (
        <View style={styles.statsGrid}>
          <StatCard label="Approved" value={stats.approvedConsultants} />
          <StatCard label="Pending" value={stats.pendingConsultants} />
          <StatCard label="Bookings" value={stats.totalBookings} />
          <StatCard label="GMV" value={`$${stats.grossBookingValue.toFixed(2)}`} />
          <StatCard label="Commission" value={`$${stats.totalCommissionEarned.toFixed(2)}`} />
          <StatCard label="Clients" value={stats.totalClients} />
        </View>
      )}

      <Text style={styles.sectionTitle}>Pending approvals</Text>
      {pending.length === 0 && <Text style={styles.empty}>Nothing waiting on review.</Text>}
      {pending.map((c) => (
        <View key={c.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={{ fontWeight: '600' }}>{c.user.fullName}</Text>
            <Text style={{ color: '#777', fontSize: 12 }}>{c.category.name}</Text>
          </View>
          <Text style={styles.cardSubtext}>{c.user.email}</Text>
          {c.bio && <Text style={styles.cardBio}>{c.bio}</Text>}
          <View style={styles.actionRow}>
            <Pressable style={styles.approveBtn} onPress={() => handleDecision(c.id, 'APPROVED')}>
              <Text style={styles.approveBtnText}>Approve</Text>
            </Pressable>
            <Pressable style={styles.rejectBtn} onPress={() => handleDecision(c.id, 'REJECTED')}>
              <Text style={styles.rejectBtnText}>Reject</Text>
            </Pressable>
          </View>
        </View>
      ))}

      <Text style={styles.note}>
        Category and per-consultant commission overrides are managed from the web admin panel
        for now.
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
