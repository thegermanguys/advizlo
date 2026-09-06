'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, setToken, Role } from '../../lib/api';
import { colors, styles } from '../../lib/theme';

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageInner />
    </Suspense>
  );
}

function RegisterPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initialRole = params.get('role') === 'CONSULTANT' ? 'CONSULTANT' : 'CLIENT';
  const [role, setRole] = useState<Role>(initialRole);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.register({ email, password, fullName, role });
      setToken(res.accessToken);
      router.push(role === 'CONSULTANT' ? '/onboarding/profile' : '/dashboard');
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.pageNarrow}>
      <h1>Create your account</h1>

      <div style={{ display: 'flex', gap: 8, marginTop: 20, marginBottom: 20 }}>
        <button type="button" onClick={() => setRole('CLIENT')} style={role === 'CLIENT' ? roleButtonActive : roleButton}>
          I need advice
        </button>
        <button type="button" onClick={() => setRole('CONSULTANT')} style={role === 'CONSULTANT' ? roleButtonActive : roleButton}>
          I'm a consultant
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required style={styles.input} />
        <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={styles.input} />
        <input placeholder="Password (min 8 characters)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} style={styles.input} />
        {error && <p style={{ color: colors.rust, margin: 0 }}>{error}</p>}
        <button type="submit" disabled={loading} style={styles.primaryButton}>
          {loading ? 'Creating account…' : 'Sign up'}
        </button>
      </form>

      <p style={{ marginTop: 20, fontSize: 14, color: colors.slate }}>
        Already have an account? <a href="/login" style={{ color: colors.ink, fontWeight: 600 }}>Log in</a>
      </p>
    </main>
  );
}

const roleButton: React.CSSProperties = {
  flex: 1,
  padding: 11,
  borderRadius: 6,
  border: `1px solid ${colors.line}`,
  background: colors.white,
  color: colors.slate,
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
};

const roleButtonActive: React.CSSProperties = {
  ...roleButton,
  border: `2px solid ${colors.ink}`,
  background: colors.ink,
  color: colors.paper,
  fontWeight: 700,
};
