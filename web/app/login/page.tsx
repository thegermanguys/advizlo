'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setToken } from '../../lib/api';
import { colors, styles } from '../../lib/theme';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.login({ email, password });
      setToken(res.accessToken);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message ?? 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.pageNarrow}>
      <h1>Log in</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
        <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={styles.input} />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={styles.input} />
        {error && <p style={{ color: colors.rust, margin: 0 }}>{error}</p>}
        <button type="submit" disabled={loading} style={styles.primaryButton}>
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 14, color: colors.slate }}>
        <a href="/forgot-password" style={{ color: colors.ink, fontWeight: 600 }}>Forgot password?</a>
      </p>
      <p style={{ marginTop: 8, fontSize: 14, color: colors.slate }}>
        No account? <a href="/register" style={{ color: colors.ink, fontWeight: 600 }}>Sign up</a>
      </p>
    </main>
  );
}
