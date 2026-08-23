import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { api, Category } from '../../lib/api';

export default function OnboardingProfileScreen({ navigation }: any) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [bio, setBio] = useState('');
  const [credentialsInfo, setCredentialsInfo] = useState('');
  const [inPersonAddress, setInPersonAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
    api
      .getMyConsultantProfile()
      .then((p) => {
        if (p?.categoryId) setCategoryId(p.categoryId);
        if (p?.bio) setBio(p.bio);
        if (p?.credentialsInfo) setCredentialsInfo(p.credentialsInfo);
        if (p?.inPersonAddress) setInPersonAddress(p.inPersonAddress);
      })
      .catch(() => {});
  }, []);

  async function handleContinue() {
    if (!categoryId) {
      setError('Pick a category first');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await api.updateMyConsultantProfile({ categoryId, bio, credentialsInfo, inPersonAddress });
      navigation.navigate('OnboardingPricing');
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Tell clients who you are</Text>

      <Text style={styles.label}>Category</Text>
      <View style={styles.chipRow}>
        {categories.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => setCategoryId(c.id)}
            style={[styles.chip, categoryId === c.id && styles.chipActive]}
          >
            <Text style={categoryId === c.id ? styles.chipTextActive : styles.chipText}>{c.name}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Short bio</Text>
      <TextInput
        style={[styles.input, { height: 90 }]}
        multiline
        placeholder="e.g. 12 years practicing family law..."
        value={bio}
        onChangeText={setBio}
      />

      <Text style={styles.label}>Credentials / licensing info</Text>
      <TextInput
        style={[styles.input, { height: 70 }]}
        multiline
        placeholder="Bar number, licenses, certifications..."
        value={credentialsInfo}
        onChangeText={setCredentialsInfo}
      />

      <Text style={styles.label}>In-person address (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="123 Main St, Suite 400, Springfield"
        value={inPersonAddress}
        onChangeText={setInPersonAddress}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.button} onPress={handleContinue} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Saving…' : 'Continue to pricing'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 10 },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 8 },
  label: { fontSize: 13, color: '#555', marginTop: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#ccc' },
  chipActive: { backgroundColor: '#111', borderColor: '#111' },
  chipText: { color: '#111', fontSize: 13 },
  chipTextActive: { color: '#fff', fontSize: 13 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, textAlignVertical: 'top' },
  button: { backgroundColor: '#111', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: 'crimson' },
});
