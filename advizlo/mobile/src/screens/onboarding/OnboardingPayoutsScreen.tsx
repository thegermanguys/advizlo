import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Linking } from 'react-native';
import { api } from '../../lib/api';

export default function OnboardingPayoutsScreen({ navigation }: any) {
  const [status, setStatus] = useState<{ connected: boolean; chargesEnabled: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    api.getConnectStatus().then(setStatus).catch(() => {});
  }

  async function handleConnect() {
    setError(null);
    setLoading(true);
    try {
      const { url } = await api.startConnectOnboarding();
      // Stripe's KYC/onboarding flow doesn't render reliably inside an
      // in-app WebView, so we hand off to the device's browser. The
      // consultant returns to the app manually and taps "Refresh status".
      await Linking.openURL(url);
    } catch (err: any) {
      setError(err.message ?? 'Could not start Stripe onboarding');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Connect your payouts</Text>
      <Text style={styles.subtitle}>
        Advizlo uses Stripe to pay you directly for paid consultations, minus the platform
        commission. You'll be taken to your browser to verify your identity and add a bank
        account.
      </Text>

      <View style={styles.statusBox}>
        <Text>
          Status:{' '}
          {status?.chargesEnabled ? (
            <Text style={{ color: '#0a7d34', fontWeight: '600' }}>Connected & ready</Text>
          ) : status?.connected ? (
            <Text style={{ color: '#a67c00', fontWeight: '600' }}>Onboarding started — not finished</Text>
          ) : (
            <Text style={{ color: '#777', fontWeight: '600' }}>Not connected</Text>
          )}
        </Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.button} onPress={handleConnect} disabled={loading}>
        <Text style={styles.buttonText}>
          {loading ? 'Opening browser…' : status?.connected ? 'Continue Stripe setup' : 'Connect with Stripe'}
        </Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={refresh}>
        <Text style={styles.secondaryButtonText}>Refresh status</Text>
      </Pressable>

      <Pressable
        style={[styles.finishButton, !status?.chargesEnabled && styles.buttonDisabled]}
        disabled={!status?.chargesEnabled}
        onPress={() => navigation.navigate('OnboardingVideo')}
      >
        <Text style={styles.buttonText}>Continue to video setup</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: '600' },
  subtitle: { color: '#555', fontSize: 13 },
  statusBox: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 14, marginTop: 8 },
  error: { color: 'crimson' },
  button: { backgroundColor: '#111', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  secondaryButton: { borderWidth: 1, borderColor: '#111', borderRadius: 8, padding: 12, alignItems: 'center' },
  secondaryButtonText: { color: '#111', fontWeight: '600' },
  finishButton: { backgroundColor: '#0a7d34', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
