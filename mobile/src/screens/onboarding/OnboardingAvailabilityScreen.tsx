import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { api, AvailabilityRule } from '../../lib/api';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function OnboardingAvailabilityScreen({ navigation }: any) {
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    api.listMyAvailability().then(setRules).catch(() => {});
  }

  async function handleAdd() {
    if (startTime >= endTime) {
      setError('Start time must be before end time');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await api.createAvailability({ dayOfWeek, startTime, endTime, isRecurring: true });
      refresh();
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    await api.deleteAvailability(id);
    refresh();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Set your weekly availability</Text>
      <Text style={styles.subtitle}>Add the days/hours you're generally free.</Text>

      {rules.map((r) => (
        <View key={r.id} style={styles.row}>
          <Text>
            {r.isRecurring ? DAYS[r.dayOfWeek ?? 0] : r.specificDate} · {r.startTime}–{r.endTime}
          </Text>
          <Pressable onPress={() => handleDelete(r.id)}>
            <Text style={{ color: 'crimson' }}>Remove</Text>
          </Pressable>
        </View>
      ))}

      <View style={styles.dayRow}>
        {DAYS.map((d, i) => (
          <Pressable key={d} onPress={() => setDayOfWeek(i)} style={[styles.dayChip, dayOfWeek === i && styles.dayChipActive]}>
            <Text style={dayOfWeek === i ? styles.dayTextActive : styles.dayText}>{d.slice(0, 3)}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="09:00" value={startTime} onChangeText={setStartTime} />
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="17:00" value={endTime} onChangeText={setEndTime} />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={styles.secondaryButton} onPress={handleAdd} disabled={loading}>
        <Text style={styles.secondaryButtonText}>{loading ? 'Adding…' : '+ Add slot'}</Text>
      </Pressable>

      <Pressable
        style={[styles.button, rules.length === 0 && styles.buttonDisabled]}
        disabled={rules.length === 0}
        onPress={() => navigation.navigate('OnboardingPayouts')}
      >
        <Text style={styles.buttonText}>Continue to payouts</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 10 },
  title: { fontSize: 22, fontWeight: '600' },
  subtitle: { fontSize: 13, color: '#555', marginBottom: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 6,
  },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  dayChip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: '#ccc' },
  dayChipActive: { backgroundColor: '#111', borderColor: '#111' },
  dayText: { color: '#111', fontSize: 12 },
  dayTextActive: { color: '#fff', fontSize: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginTop: 8 },
  error: { color: 'crimson' },
  secondaryButton: { borderWidth: 1, borderColor: '#111', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 8 },
  secondaryButtonText: { color: '#111', fontWeight: '600' },
  button: { backgroundColor: '#111', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
