import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Linking } from 'react-native';
import { api, VideoStatus } from '../../lib/api';

export default function OnboardingVideoScreen({ navigation }: any) {
  const [status, setStatus] = useState<VideoStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    api.getVideoStatus().then(setStatus).catch(() => {});
  }

  async function handleConnectZoom() {
    setError(null);
    try {
      const { url } = await api.startZoomConnect();
      await Linking.openURL(url);
    } catch (err: any) {
      setError(err.message ?? 'Could not start Zoom connection');
    }
  }

  async function handleConnectGoogle() {
    setError(null);
    try {
      const { url } = await api.startGoogleConnect();
      await Linking.openURL(url);
    } catch (err: any) {
      setError(err.message ?? 'Could not start Google connection');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Video for consultations</Text>
      <Text style={styles.subtitle}>
        Optional — in-app video works immediately for every consultant. Connect Zoom or Google
        Meet only if you'd rather use those instead.
      </Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <ProviderRow name="In-app video" description="Built in, always ready." alwaysReady />
      <ProviderRow
        name="Zoom"
        description="Meetings created under your own Zoom account."
        connected={!!status?.zoomConnected}
        onConnect={handleConnectZoom}
      />
      <ProviderRow
        name="Google Meet"
        description="Meetings created via your Google Calendar."
        connected={!!status?.googleConnected}
        onConnect={handleConnectGoogle}
      />

      <Pressable style={styles.refreshButton} onPress={refresh}>
        <Text style={styles.refreshButtonText}>Refresh status</Text>
      </Pressable>

      <Pressable style={styles.button} onPress={() => navigation.replace('Dashboard')}>
        <Text style={styles.buttonText}>Finish setup</Text>
      </Pressable>
    </ScrollView>
  );
}

function ProviderRow({
  name,
  description,
  connected,
  alwaysReady,
  onConnect,
}: {
  name: string;
  description: string;
  connected?: boolean;
  alwaysReady?: boolean;
  onConnect?: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '600' }}>{name}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      {alwaysReady || connected ? (
        <Text style={styles.connected}>{alwaysReady ? 'Always ready' : 'Connected'}</Text>
      ) : (
        <Pressable style={styles.connectButton} onPress={onConnect}>
          <Text style={styles.connectButtonText}>Connect</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 10 },
  title: { fontSize: 22, fontWeight: '600' },
  subtitle: { color: '#555', fontSize: 13, marginBottom: 8 },
  error: { color: 'crimson' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  rowDescription: { fontSize: 12, color: '#777', marginTop: 2 },
  connected: { color: '#0a7d34', fontSize: 13, fontWeight: '600' },
  connectButton: { borderWidth: 1, borderColor: '#111', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 12 },
  connectButtonText: { color: '#111', fontSize: 13, fontWeight: '600' },
  refreshButton: { borderWidth: 1, borderColor: '#111', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 8 },
  refreshButtonText: { color: '#111', fontWeight: '600' },
  button: { backgroundColor: '#111', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
