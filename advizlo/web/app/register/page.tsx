'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setToken, Role } from '../../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('CLIENT');
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
    <main style={{ maxWidth: 400, margin: '60px auto', padding: 24 }}>
      <h1>Create your account</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => setRole('CLIENT')}
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 6,
            border: role === 'CLIENT' ? '2px solid #111' : '1px solid #ccc',
            background: role === 'CLIENT' ? '#111' : '#fff',
            color: role === 'CLIENT' ? '#fff' : '#111',
          }}
        >
          I need advice
        </button>
        <button
          type="button"
          onClick={() => setRole('CONSULTANT')}
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 6,
            border: role === 'CONSULTANT' ? '2px solid #111' : '1px solid #ccc',
            background: role === 'CONSULTANT' ? '#111' : '#fff',
            color: role === 'CONSULTANT' ? '#fff' : '#111',
          }}
        >
          I'm a consultant
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          placeholder="Password (min 8 characters)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          style={inputStyle}
        />
        {error && <p style={{ color: 'crimson' }}>{error}</p>}
        <button type="submit" disabled={loading} style={submitStyle}>
          {loading ? 'Creating account…' : 'Sign up'}
        </button>
      </form>

      <p style={{ marginTop: 16 }}>
        Already have an account? <a href="/login">Log in</a>
      </p>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 6,
  border: '1px solid #ccc',
  fontSize: 14,
};

const submitStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 6,
  border: 'none',
  background: '#111',
  color: '#fff',
  fontSize: 14,
  cursor: 'pointer',
};
