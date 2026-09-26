import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Switch, StyleSheet } from 'react-native';
import {
  api,
  ServiceType,
  ConsultationMode,
  ConsultationFeePolicy,
  ConsultantProfile,
  CONSULTATION_FEE_POLICIES,
} from '../../lib/api';

const ALL_MODES: { value: ConsultationMode; label: string }[] = [
  { value: 'IN_APP_VIDEO', label: 'Video (in-app)' },
  { value: 'ZOOM', label: 'Zoom' },
  { value: 'GOOGLE_MEET', label: 'Google Meet' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'IN_PERSON', label: 'In-person' },
];

export default function OnboardingPricingScreen({ navigation }: any) {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [profile, setProfile] = useState<ConsultantProfile | null>(null);
  const [feePolicy, setFeePolicy] = useState<ConsultationFeePolicy>('CHARGE_FROM_FIRST');
  const [name, setName] = useState('');
  const [durationMins, setDurationMins] = useState('30');
  const [price, setPrice] = useState('50');
  const [isFirstFree, setIsFirstFree] = useState(false);
  const [modes, setModes] = useState<ConsultationMode[]>(['IN_APP_VIDEO']);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refresh();
    api
      .getMyConsultantProfile()
      .then((p) => {
        setProfile(p);
        setFeePolicy(p.consultationFeePolicy ?? 'CHARGE_FROM_FIRST');
      })
      .catch(() => {});
  }, []);

  async function handlePolicyChange(next: ConsultationFeePolicy) {
    if (!profile) return;
    const previous = feePolicy;
    setFeePolicy(next);
    setError(null);
    try {
      const updated = await api.updateMyConsultantProfile({
        categoryId: profile.categoryId,
        consultationFeePolicy: next,
      });
      setProfile(updated);
    } catch (err: any) {
      setFeePolicy(previous);
      setError(err.message ?? 'Could not save fee policy');
    }
  }

  function refresh() {
    api.listMyServiceTypes().then(setServiceTypes).catch(() => {});
  }

  function toggleMode(mode: ConsultationMode) {
    setModes((prev) => (prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]));
  }

  async function handleAdd() {
    if (modes.length === 0) {
      setError('Pick at least one consultation mode');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await api.createServiceType({
        name,
        durationMins: Number(durationMins),
        price: isFirstFree ? 0 : Number(price),
        isFirstFree,
        consultationModes: modes,
      });
      setName('');
      setIsFirstFree(false);
      refresh();
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    await api.deleteServiceType(id);
    refresh();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Set your pricing</Text>
      <Text style={styles.subtitle}>
        Choose how your consulting fee is charged. The price on a consultation type is collected only when that policy charges the meeting.
      </Text>

      <Text style={styles.label}>Consultation fee</Text>
      {CONSULTATION_FEE_POLICIES.map((option) => (
        <Pressable
          key={option.value}
          onPress={() => handlePolicyChange(option.value)}
          disabled={!profile}
          style={[styles.policyCard, feePolicy === option.value && styles.policyCardActive]}
        >
          <Text style={styles.policyTitle}>{option.label}</Text>
          <Text style={styles.policyDescription}>{option.description}</Text>
        </Pressable>
      ))}

      {serviceTypes.map((st) => (
        <View key={st.id} style={styles.serviceRow}>
          <Text style={styles.serviceText}>
            {st.name} · {st.durationMins}min · {Number(st.price) === 0 ? 'Free' : `$${st.price}`}
          </Text>
          <Pressable onPress={() => handleDelete(st.id)}>
            <Text style={{ color: 'crimson' }}>Remove</Text>
          </Pressable>
        </View>
      ))}

      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="Name (e.g. Initial Consultation)" value={name} onChangeText={setName} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Duration (min)"
            keyboardType="numeric"
            value={durationMins}
            onChangeText={setDurationMins}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Price (USD)"
            keyboardType="decimal-pad"
            editable={!isFirstFree}
            value={price}
            onChangeText={setPrice}
          />
        </View>

        <View style={styles.switchRow}>
          <Text>Offer for free</Text>
          <Switch value={isFirstFree} onValueChange={setIsFirstFree} />
        </View>

        <Text style={styles.label}>Consultation modes</Text>
        <View style={styles.chipRow}>
          {ALL_MODES.map((m) => (
            <Pressable
              key={m.value}
              onPress={() => toggleMode(m.value)}
              style={[styles.chip, modes.includes(m.value) && styles.chipActive]}
            >
              <Text style={modes.includes(m.value) ? styles.chipTextActive : styles.chipText}>{m.label}</Text>
            </Pressable>
          ))}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
        <Pressable style={styles.secondaryButton} onPress={handleAdd} disabled={loading}>
          <Text style={styles.secondaryButtonText}>{loading ? 'Adding…' : '+ Add consultation type'}</Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.button, serviceTypes.length === 0 && styles.buttonDisabled]}
        disabled={serviceTypes.length === 0}
        onPress={() => navigation.navigate('OnboardingAvailability')}
      >
        <Text style={styles.buttonText}>Continue to availability</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 10 },
  title: { fontSize: 22, fontWeight: '600' },
  subtitle: { fontSize: 13, color: '#555', marginBottom: 8 },
  policyCard: { padding: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 8 },
  policyCardActive: { borderColor: '#111', borderWidth: 2 },
  policyTitle: { fontWeight: '600', fontSize: 14 },
  policyDescription: { fontSize: 12, color: '#555', marginTop: 2 },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 6,
  },
  serviceText: { fontSize: 14 },
  form: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 14, gap: 10, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 13, color: '#555' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: '#ccc' },
  chipActive: { backgroundColor: '#111', borderColor: '#111' },
  chipText: { color: '#111', fontSize: 12 },
  chipTextActive: { color: '#fff', fontSize: 12 },
  error: { color: 'crimson' },
  secondaryButton: { borderWidth: 1, borderColor: '#111', borderRadius: 8, padding: 10, alignItems: 'center' },
  secondaryButtonText: { color: '#111', fontWeight: '600' },
  button: { backgroundColor: '#111', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
