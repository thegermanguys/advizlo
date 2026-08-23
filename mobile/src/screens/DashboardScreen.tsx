import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { api, clearToken, getToken, AuthUser, ConsultantProfile, Booking } from '../lib/api';

export default function DashboardScreen({ navigation }: any) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ConsultantProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payoutsReady, setPayoutsReady] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        navigation.replace('Login');
        return;
      }
      try {
        const me = await api.me();
        setUser(me);
        if (me.role === 'ADMIN') {
          navigation.replace('Admin');
          return;
        }
        if (me.role === 'CONSULTANT') {
          const p = await api.getMyConsultantProfile().catch(() => null);
          setProfile(p);
          const b = await api.listMyBookingsAsConsultant().catch(() => []);
          setBookings(b);
          const status = await api.getConnectStatus().catch(() => null);
          setPayoutsReady(!!status?.chargesEnabled);
        }
      } catch {
        await clearToken();
        navigation.replace('Login');
      }
    })();
  }, []);

  async function handleLogout() {
    await clearToken();
    navigation.replace('Login');
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text>Loading…</Text>
      </View>
    );
  }

  const hasCategory = !!profile?.categoryId && profile.category?.name !== 'Uncategorized';
  const hasPricing = (profile?.serviceTypes?.length ?? 0) > 0;
  const hasAvailability = (profile?.availability?.length ?? 0) > 0;
  const onboardingComplete = hasCategory && hasPricing && hasAvailability && payoutsReady;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {user.fullName}</Text>
      <Text style={styles.subtitle}>
        Signed in as {user.email} — role: {user.role}
      </Text>

      {user.role === 'CLIENT' && (
        <View style={styles.linkRow}>
          <Pressable style={styles.linkButton} onPress={() => navigation.navigate('Browse')}>
            <Text style={styles.linkButtonText}>Browse consultants</Text>
          </Pressable>
          <Pressable style={styles.linkButton} onPress={() => navigation.navigate('MyBookings')}>
            <Text style={styles.linkButtonText}>My bookings</Text>
          </Pressable>
        </View>
      )}

      {user.role === 'CONSULTANT' && !onboardingComplete && (
        <View style={styles.checklist}>
          <Text style={styles.checklistTitle}>Finish setting up your profile</Text>
          <ChecklistItem done={hasCategory} label="Profile & specialty" onPress={() => navigation.navigate('OnboardingProfile')} />
          <ChecklistItem done={hasPricing} label="Pricing" onPress={() => navigation.navigate('OnboardingPricing')} />
          <ChecklistItem done={hasAvailability} label="Availability" onPress={() => navigation.navigate('OnboardingAvailability')} />
          <ChecklistItem done={payoutsReady} label="Payouts (Stripe)" onPress={() => navigation.navigate('OnboardingPayouts')} />
        </View>
      )}

      {user.role === 'CONSULTANT' && onboardingComplete && (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.hint}>
            Your profile is set up{profile?.verificationStatus === 'PENDING' ? ' — pending verification review' : ''}.
          </Text>
          <Text style={{ fontWeight: '600', marginTop: 16, marginBottom: 8 }}>Upcoming bookings</Text>
          {bookings.length === 0 && <Text style={{ color: '#777' }}>No bookings yet.</Text>}
          {bookings.map((b) => (
            <View key={b.id} style={styles.bookingRow}>
              <Text style={{ fontSize: 13 }}>
                {b.serviceType.name} with {b.client?.fullName} — {new Date(b.scheduledAt).toLocaleString()} — {b.status}
              </Text>
              {b.status === 'CONFIRMED' &&
                ['IN_APP_VIDEO', 'ZOOM', 'GOOGLE_MEET'].includes(b.consultationMode) &&
                (b.meetingLink ? (
                  <Pressable onPress={() => Linking.openURL(b.meetingLink as string)}>
                    <Text style={{ color: '#0a7d34', fontSize: 12, fontWeight: '600', marginTop: 4 }}>
                      Join call →
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={{ color: '#a67c00', fontSize: 12, marginTop: 4 }}>Meeting link pending…</Text>
                ))}
            </View>
          ))}
        </View>
      )}

      <Pressable style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Log out</Text>
      </Pressable>
    </View>
  );
}

function ChecklistItem({ done, label, onPress }: { done: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.checklistRow}>
      <View style={[styles.checkDot, done && styles.checkDotDone]}>
        {done && <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>}
      </View>
      <Text style={{ flex: 1 }}>{label}</Text>
      {!done && <Text style={{ color: '#999' }}>→</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 8 },
  title: { fontSize: 22, fontWeight: '600' },
  subtitle: { color: '#555' },
  hint: { marginTop: 12 },
  button: { marginTop: 24, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, alignItems: 'center' },
  buttonText: { color: '#111' },
  checklist: { marginTop: 16, borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 14, gap: 4 },
  checklistTitle: { fontWeight: '600', marginBottom: 6 },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  checkDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: '#111', alignItems: 'center', justifyContent: 'center' },
  checkDotDone: { backgroundColor: '#111' },
  linkRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  linkButton: { flex: 1, borderWidth: 1, borderColor: '#111', borderRadius: 8, padding: 12, alignItems: 'center' },
  linkButtonText: { color: '#111', fontWeight: '600' },
  bookingRow: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10, marginBottom: 6 },
});
