import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { api, Category, ConsultantProfile } from '../lib/api';

export default function BrowseScreen({ navigation }: any) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [consultants, setConsultants] = useState<ConsultantProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .listConsultants(categoryId || undefined)
      .then(setConsultants)
      .finally(() => setLoading(false));
  }, [categoryId]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Find a consultant</Text>

      <View style={styles.pillRow}>
        <Pressable onPress={() => setCategoryId('')} style={[styles.pill, categoryId === '' && styles.pillActive]}>
          <Text style={categoryId === '' ? styles.pillTextActive : styles.pillText}>All</Text>
        </Pressable>
        {categories.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => setCategoryId(c.id)}
            style={[styles.pill, categoryId === c.id && styles.pillActive]}
          >
            <Text style={categoryId === c.id ? styles.pillTextActive : styles.pillText}>{c.name}</Text>
          </Pressable>
        ))}
      </View>

      {loading && <ActivityIndicator style={{ marginTop: 20 }} />}

      {!loading && consultants.length === 0 && (
        <Text style={styles.empty}>No approved consultants in this category yet.</Text>
      )}

      {consultants.map((c) => (
        <Pressable
          key={c.id}
          style={styles.card}
          onPress={() => navigation.navigate('ConsultantDetail', { consultantId: c.id })}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardName}>{c.user?.fullName}</Text>
            <Text style={styles.cardCategory}>{c.category?.name}</Text>
          </View>
          {c.bio && <Text style={styles.cardBio}>{c.bio}</Text>}
          <View style={styles.chipRow}>
            {c.serviceTypes?.map((st) => (
              <View key={st.id} style={styles.serviceChip}>
                <Text style={styles.serviceChipText}>
                  {st.name} · {Number(st.price) === 0 ? 'Free' : `$${st.price}`}
                </Text>
              </View>
            ))}
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 8 },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 8 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  pill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#ccc' },
  pillActive: { backgroundColor: '#111', borderColor: '#111' },
  pillText: { color: '#111', fontSize: 13 },
  pillTextActive: { color: '#fff', fontSize: 13 },
  empty: { color: '#777' },
  card: { padding: 14, borderWidth: 1, borderColor: '#eee', borderRadius: 10, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  cardName: { fontWeight: '600' },
  cardCategory: { color: '#777', fontSize: 12 },
  cardBio: { color: '#555', fontSize: 13, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  serviceChip: { backgroundColor: '#f3f3f3', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 12 },
  serviceChipText: { fontSize: 11 },
});
