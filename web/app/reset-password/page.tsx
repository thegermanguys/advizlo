'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';
import { colors, styles } from '../../lib/theme';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageInner />
    </Suspense>
  );
}

function ResetPasswordPageInner() {
  const params = useSearchParams();
  const token = params.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('This reset link is missing its token. Please use the link from your email.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (err: any) {
      setError(err.message ?? 'This reset link is invalid or has expired');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <main style={styles.pageNarrow}>
        <h1>Reset your password</h1>
        <p style={styles.statusRust}>
          This link is missing its token. Please use the link from the password reset email, or{' '}
          <a href="/forgot-password" style={{ color: colors.ink, fontWeight: 600 }}>
            request a new one
          </a>
          .
        </p>
      </main>
    );
  }

  if (done) {
    return (
      <main style={styles.pageNarrow}>
        <h1>Password updated</h1>
        <p style={styles.statusForest}>
          Your password has been changed. You can now log in with your new password.
        </p>
        <a href="/login" style={{ ...styles.primaryButton, display: 'inline-block', marginTop: 12, textDecoration: 'none' }}>
          Go to login
        </a>
      </main>
    );
  }

  return (
    <main style={styles.pageNarrow}>
      <h1>Choose a new password</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
        <input type="password" placeholder="New password (min 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} style={styles.input} />
        <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} style={styles.input} />
        {error && <p style={{ color: colors.rust, margin: 0 }}>{error}</p>}
        <button type="submit" disabled={loading} style={styles.primaryButton}>
          {loading ? 'Saving…' : 'Set new password'}
        </button>
      </form>
    </main>
  );
}
