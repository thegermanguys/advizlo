import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { api, Category, ProfilePhotoMeta, consultantPhotoSrc } from '../../lib/api';
import ProfilePhoto from '../../components/ProfilePhoto';
import { pickProfilePhoto } from '../../lib/pick-profile-photo';

export default function OnboardingProfileScreen({ navigation }: any) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [bio, setBio] = useState('');
  const [credentialsInfo, setCredentialsInfo] = useState('');
  const [inPersonAddress, setInPersonAddress] = useState('');
  const [profileId, setProfileId] = useState<string | null>(null);
  const [photo, setPhoto] = useState<ProfilePhotoMeta | null>(null);
  const [fullName, setFullName] = useState('Consultant');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
    api.me().then((me) => setFullName(me.fullName)).catch(() => {});
    api
      .getMyConsultantProfile()
      .then((p) => {
        if (p?.id) setProfileId(p.id);
        if (p?.categoryId) setCategoryId(p.categoryId);
        if (p?.bio) setBio(p.bio);
        if (p?.credentialsInfo) setCredentialsInfo(p.credentialsInfo);
        if (p?.inPersonAddress) setInPersonAddress(p.inPersonAddress);
        setPhoto(p?.profilePhoto ?? null);
      })
      .catch(() => {});
  }, []);

  async function handlePickPhoto() {
    setError(null);
    try {
      const picked = await pickProfilePhoto();
      if (!picked) return;
      setUploadingPhoto(true);
      const saved = await api.uploadMyPhoto('consultant', picked);
      setPhoto(saved);
      if (!profileId) {
        const p = await api.getMyConsultantProfile();
        setProfileId(p.id);
      }
    } catch (err: any) {
      setError(err.message ?? 'Could not upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  }

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

      <View style={styles.photoRow}>
        <ProfilePhoto
          name={fullName}
          uri={consultantPhotoSrc(profileId ? { id: profileId, profilePhoto: photo } : null)}
          size={72}
        />
        <Pressable onPress={handlePickPhoto} disabled={uploadingPhoto}>
          <Text style={styles.photoAction}>{uploadingPhoto ? 'Uploading…' : photo ? 'Replace photo' : 'Add a photo'}</Text>
          <Text style={styles.photoHint}>JPEG, PNG, or WebP. Up to 1.5 MB.</Text>
        </Pressable>
      </View>

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
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  photoAction: { fontWeight: '600' },
  photoHint: { color: '#777', fontSize: 12, marginTop: 4 },
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
