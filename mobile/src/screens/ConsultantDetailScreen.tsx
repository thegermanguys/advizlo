import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { api, ConsultantProfile, ServiceType, ConsultationMode, Booking } from '../lib/api';
import StarRating from '../components/StarRating';

const MODE_LABELS: Record<ConsultationMode, string> = {
  IN_APP_VIDEO: 'Video (in-app)',
  ZOOM: 'Zoom',
  GOOGLE_MEET: 'Google Meet',
  PHONE: 'Phone',
  IN_PERSON: 'In-person',
};

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

export default function ConsultantDetailScreen({ route, navigation }: any) {
  const { consultantId } = route.params;

  const [profile, setProfile] = useState<ConsultantProfile | null>(null);
  const [selectedServiceType, setSelectedServiceType] = useState<ServiceType | null>(null);
  const [mode, setMode] = useState<ConsultationMode | null>(null);
  const [date, setDate] = useState(todayISODate());
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Booking | null>(null);
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    api.getConsultant(consultantId).then(setProfile).catch(() => setError('Consultant not found'));
  }, [consultantId]);

  useEffect(() => {
    if (!selectedServiceType) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    api
      .getAvailableSlots(consultantId, selectedServiceType.id, date)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedServiceType, date]);

  function selectServiceType(st: ServiceType) {
    setSelectedServiceType(st);
    setMode(st.consultationModes[0] ?? null);
  }

  async function handleBook() {
    if (!selectedServiceType || !mode || !selectedSlot) return;
    setError(null);
    setBooking(true);
    try {
      const result = await api.createBooking({
        consultantId,
        serviceTypeId: selectedServiceType.id,
        scheduledAt: selectedSlot,
        consultationMode: mode,
      });
      setConfirmed(result);
    } catch (err: any) {
      setError(err.message ?? 'Could not complete booking');
    } finally {
      setBooking(false);
    }
  }

  async function handlePayNow() {
    if (!confirmed) return;
    setPayLoading(true);
    try {
      const { url } = await api.createCheckoutSession(confirmed.id);
      await Linking.openURL(url);
    } catch (err: any) {
      setError(err.message ?? 'Could not start payment');
    } finally {
      setPayLoading(false);
    }
  }

  if (!profile) return <ActivityIndicator style={{ marginTop: 40 }} />;

  if (confirmed) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>
          {confirmed.status === 'CONFIRMED' ? 'Booking confirmed 🎉' : 'Booking requested'}
        </Text>
        <Text style={styles.subtitle}>
          {confirmed.status === 'CONFIRMED'
            ? "You're all set."
            : 'This slot is held for you — payment (coming next) will confirm it.'}
        </Text>
        <View style={styles.confirmBox}>
          <Text style={{ fontWeight: '600' }}>
            {selectedServiceType?.name} with {profile.user?.fullName}
          </Text>
          <Text>{new Date(confirmed.scheduledAt).toLocaleString()}</Text>
          <Text>{MODE_LABELS[confirmed.consultationMode]}</Text>
          {confirmed.address && <Text>Address: {confirmed.address}</Text>}
          <Text>{Number(confirmed.priceCharged) === 0 ? 'Free' : `$${confirmed.priceCharged}`}</Text>
          {confirmed.status === 'CONFIRMED' &&
            ['IN_APP_VIDEO', 'ZOOM', 'GOOGLE_MEET'].includes(confirmed.consultationMode) &&
            (confirmed.meetingLink ? (
              <Pressable onPress={() => Linking.openURL(confirmed.meetingLink as string)}>
                <Text style={{ color: '#0a7d34', fontWeight: '600' }}>Join call →</Text>
              </Pressable>
            ) : (
              <Text style={{ color: '#a67c00', fontSize: 13 }}>Meeting link pending…</Text>
            ))}
        </View>
        <Pressable style={styles.button} onPress={() => navigation.navigate('MyBookings')}>
          <Text style={styles.buttonText}>View my bookings</Text>
        </Pressable>
        {confirmed.status === 'PENDING' && Number(confirmed.priceCharged) > 0 && (
          <Pressable
            style={[styles.button, { backgroundColor: '#0a7d34' }]}
            onPress={handlePayNow}
            disabled={payLoading}
          >
            <Text style={styles.buttonText}>
              {payLoading ? 'Opening browser…' : `Pay $${confirmed.priceCharged} now`}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{profile.user?.fullName}</Text>
      <Text style={styles.category}>{profile.category?.name}</Text>
      {!!profile.reviewCount && profile.averageRating != null && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <StarRating value={profile.averageRating} />
          <Text style={{ fontSize: 13, color: '#555' }}>
            {profile.averageRating.toFixed(1)} ({profile.reviewCount} review{profile.reviewCount === 1 ? '' : 's'})
          </Text>
        </View>
      )}
      {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

      <Text style={styles.step}>1. Choose a consultation type</Text>
      {profile.serviceTypes?.map((st) => (
        <Pressable
          key={st.id}
          onPress={() => selectServiceType(st)}
          style={[styles.optionCard, selectedServiceType?.id === st.id && styles.optionCardActive]}
        >
          <Text>
            {st.name} — {st.durationMins} min — {Number(st.price) === 0 ? 'Free' : `$${st.price}`}
          </Text>
        </Pressable>
      ))}

      {selectedServiceType && (
        <>
          <Text style={styles.step}>2. How would you like to meet?</Text>
          <View style={styles.chipRow}>
            {selectedServiceType.consultationModes.map((m) => (
              <Pressable key={m} onPress={() => setMode(m)} style={[styles.chip, mode === m && styles.chipActive]}>
                <Text style={mode === m ? styles.chipTextActive : styles.chipText}>{MODE_LABELS[m]}</Text>
              </Pressable>
            ))}
          </View>
          {mode === 'IN_PERSON' && profile.inPersonAddress && (
            <Text style={styles.address}>Address: {profile.inPersonAddress}</Text>
          )}

          <Text style={styles.step}>3. Pick a time</Text>
          <TextInput
            style={styles.dateInput}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
          />
          {loadingSlots && <ActivityIndicator />}
          {!loadingSlots && slots.length === 0 && <Text style={styles.empty}>No open slots this day.</Text>}
          <View style={styles.chipRow}>
            {slots.map((s) => (
              <Pressable key={s} onPress={() => setSelectedSlot(s)} style={[styles.chip, selectedSlot === s && styles.chipActive]}>
                <Text style={selectedSlot === s ? styles.chipTextActive : styles.chipText}>
                  {new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </Pressable>
            ))}
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={[styles.button, (!selectedSlot || !mode) && styles.buttonDisabled]}
            disabled={!selectedSlot || !mode || booking}
            onPress={handleBook}
          >
            <Text style={styles.buttonText}>
              {booking
                ? 'Booking…'
                : Number(selectedServiceType.price) === 0
                  ? 'Book free consultation'
                  : `Book — $${selectedServiceType.price}`}
            </Text>
          </Pressable>
        </>
      )}

      {!!profile.reviews?.length && (
        <>
          <Text style={styles.step}>Reviews</Text>
          {profile.reviews.map((r) => (
            <View key={r.id} style={styles.reviewCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <StarRating value={r.rating} />
                <Text style={{ fontSize: 12, color: '#999' }}>
                  {new Date(r.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: '600', marginTop: 6 }}>{r.client.fullName}</Text>
              {r.comment && <Text style={{ fontSize: 14, color: '#555', marginTop: 4 }}>{r.comment}</Text>}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 4 },
  title: { fontSize: 22, fontWeight: '600' },
  subtitle: { color: '#555', marginTop: 4 },
  category: { color: '#777', marginBottom: 4 },
  bio: { color: '#555', marginBottom: 8 },
  step: { fontWeight: '600', marginTop: 20, marginBottom: 8 },
  optionCard: { padding: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 6 },
  optionCardActive: { borderColor: '#111', borderWidth: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: '#ccc' },
  chipActive: { borderColor: '#111', borderWidth: 2 },
  chipText: { fontSize: 12, color: '#111' },
  chipTextActive: { fontSize: 12, color: '#111' },
  address: { fontSize: 12, color: '#777', marginTop: 4 },
  dateInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 10 },
  empty: { color: '#777' },
  error: { color: 'crimson', marginTop: 8 },
  confirmBox: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 14, marginTop: 12, gap: 4 },
  button: { backgroundColor: '#111', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontWeight: '600' },
  reviewCard: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 14, marginBottom: 10 },
});
