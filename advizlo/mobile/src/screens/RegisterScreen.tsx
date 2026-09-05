import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { api, setToken, Role } from '../lib/api';

export default function RegisterScreen({ navigation }: any) {
  const [role, setRole] = useState<Role>('CLIENT');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setError(null);
    setLoading(true);
    try {
      const res = await api.register({ email, password, fullName, role });
      await setToken(res.accessToken);
      navigation.replace(role === 'CONSULTANT' ? 'OnboardingProfile' : 'Dashboard');
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create your account</Text>

      <View style={styles.roleRow}>
        <Pressable
          style={[styles.roleButton, role === 'CLIENT' && styles.roleButtonActive]}
          onPress={() => setRole('CLIENT')}
        >
          <Text style={role === 'CLIENT' ? styles.roleTextActive : styles.roleText}>
            I need advice
          </Text>
        </Pressable>
        <Pressable
          style={[styles.roleButton, role === 'CONSULTANT' && styles.roleButtonActive]}
          onPress={() => setRole('CONSULTANT')}
        >
          <Text style={role === 'CONSULTANT' ? styles.roleTextActive : styles.roleText}>
            I'm a consultant
          </Text>
        </Pressable>
      </View>

      <TextInput style={styles.input} placeholder="Full name" value={fullName} onChangeText={setFullName} />
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password (min 8 characters)"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={styles.button} onPress={handleRegister} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Creating account…' : 'Sign up'}</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Already have an account? Log in</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 16 },
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  roleButton: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', alignItems: 'center' },
  roleButtonActive: { backgroundColor: '#111', borderColor: '#111' },
  roleText: { color: '#111' },
  roleTextActive: { color: '#fff' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  button: { backgroundColor: '#111', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: 'crimson' },
  link: { marginTop: 16, textAlign: 'center', color: '#111' },
});
