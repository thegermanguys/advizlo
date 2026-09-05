import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Linking, TextInput } from 'react-native';
import { api, Booking } from '../lib/api';
import StarRating from '../components/StarRating';

const STATUS_COLORS: Record<Booking['status'], string> = {
  PENDING: '#a67c00',
  CONFIRMED: '#0a7d34',
  COMPLETED: '#555',
  CANCELLED: '#999',
  NO_SHOW: '#c0392b',
};

export default function MyBookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    setLoading(true);
    api
      .listMyBookingsAsClient()
      .then(setBookings)
      .finally(() => setLoading(false));
  }

  async function handleCancel(id: string, priceCharged: string) {
    const result = await api.cancelBooking(id);
    if (Number(priceCharged) > 0) {
      setMessage(
        result.refunded
          ? 'Booking cancelled — a refund has been issued.'
          : "Booking cancelled — per the consultant's cancellation policy, no refund was issued.",
      );
    } else {
      setMessage('Booking cancelled.');
    }
    refresh();
  }

  async function handlePay(id: string) {
    const { url } = await api.createCheckoutSession(id);
    await Linking.openURL(url);
  }

  async function handleJoin(url: string) {
    await Linking.openURL(url);
  }

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>My bookings</Text>
      {message && <Text style={styles.message}>{message}</Text>}
      {bookings.length === 0 && <Text style={styles.empty}>No bookings yet — go browse a consultant.</Text>}

      {bookings.map((b) => (
        <View key={b.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={{ fontWeight: '600' }}>{b.serviceType.name}</Text>
            <Text style={{ color: STATUS_COLORS[b.status], fontWeight: '600', fontSize: 12 }}>{b.status}</Text>
          </View>
          <Text style={styles.cardText}>with {b.consultant?.user.fullName}</Text>
          <Text style={styles.cardSubtext}>{new Date(b.scheduledAt).toLocaleString()}</Text>
          <Text style={styles.cardSubtext}>
            {Number(b.priceCharged) === 0 ? 'Free' : `$${b.priceCharged}`}
          </Text>

          {b.status === 'CONFIRMED' && needsMeetingLink(b.consultationMode) && (
            b.meetingLink ? (
              <Pressable onPress={() => handleJoin(b.meetingLink as string)}>
                <Text style={styles.joinText}>Join call →</Text>
              </Pressable>
            ) : (
              <Text style={styles.pendingText}>Meeting link pending…</Text>
            )
          )}

          {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
              {b.status === 'PENDING' && Number(b.priceCharged) > 0 && (
                <Pressable onPress={() => handlePay(b.id)}>
                  <Text style={styles.payText}>Pay now</Text>
                </Pressable>
              )}
              <Pressable onPress={() => handleCancel(b.id, b.priceCharged)}>
                <Text style={styles.cancelText}>Cancel booking</Text>
              </Pressable>
            </View>
          )}

          {b.status === 'COMPLETED' && <ReviewSection booking={b} onReviewed={refresh} />}
        </View>
      ))}
    </ScrollView>
  );
}

function ReviewSection({ booking, onReviewed }: { booking: Booking; onReviewed: () => void }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (booking.review) {
    return (
      <View style={styles.reviewBox}>
        <Text style={styles.reviewLabel}>Your review</Text>
        <StarRating value={booking.review.rating} />
        {booking.review.comment && <Text style={styles.reviewComment}>{booking.review.comment}</Text>}
      </View>
    );
  }

  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)} style={{ marginTop: 8 }}>
        <Text style={styles.leaveReviewText}>Leave a review</Text>
      </Pressable>
    );
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await api.createReview({ bookingId: booking.id, rating, comment: comment || undefined });
      onReviewed();
    } catch (err: any) {
      setError(err.message ?? 'Could not submit review');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.reviewBox}>
      <StarRating value={rating} onChange={setRating} size={22} />
      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder="Optional comment…"
        multiline
        style={styles.reviewInput}
      />
      {error && <Text style={{ color: 'crimson', fontSize: 13 }}>{error}</Text>}
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
        <Pressable onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.submitReviewText}>{submitting ? 'Submitting…' : 'Submit review'}</Text>
        </Pressable>
        <Pressable onPress={() => setOpen(false)}>
          <Text style={{ color: '#777', fontSize: 13 }}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

function needsMeetingLink(mode: Booking['consultationMode']) {
  return mode === 'IN_APP_VIDEO' || mode === 'ZOOM' || mode === 'GOOGLE_MEET';
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10 },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 8 },
  empty: { color: '#777' },
  card: { padding: 14, borderWidth: 1, borderColor: '#eee', borderRadius: 10, marginBottom: 4, gap: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  cardText: { color: '#555' },
  cardSubtext: { color: '#777', fontSize: 12 },
  cancelText: { color: 'crimson', fontSize: 13, marginTop: 6 },
  payText: { color: '#0a7d34', fontSize: 13, fontWeight: '600', marginTop: 6 },
  joinText: { color: '#0a7d34', fontSize: 13, fontWeight: '600', marginTop: 6 },
  pendingText: { color: '#a67c00', fontSize: 13, marginTop: 6 },
  message: { fontSize: 13, backgroundColor: '#f6f6f6', padding: 10, borderRadius: 6 },
  reviewBox: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f3f3', gap: 6 },
  reviewLabel: { fontSize: 12, color: '#777' },
  reviewComment: { fontSize: 13, color: '#555' },
  leaveReviewText: { color: '#111', fontWeight: '600', fontSize: 13, textDecorationLine: 'underline' },
  reviewInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8, fontSize: 13, minHeight: 50 },
  submitReviewText: { color: '#111', fontWeight: '600', fontSize: 13 },
});
