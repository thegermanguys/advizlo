'use client';

import { useState } from 'react';
import { api } from '../../lib/api';
import { colors, styles } from '../../lib/theme';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.pageNarrow}>
      <h1>Reset your password</h1>

      {submitted ? (
        <p style={styles.statusForest}>
          If an account exists for that email, we've sent a link to reset your password. It
          expires in 1 hour.
        </p>
      ) : (
        <>
          <p style={styles.lede}>
            Enter the email you signed up with and we'll send you a link to choose a new
            password.
          </p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={styles.input} />
            {error && <p style={{ color: colors.rust, margin: 0 }}>{error}</p>}
            <button type="submit" disabled={loading} style={styles.primaryButton}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        </>
      )}

      <p style={{ marginTop: 20, fontSize: 14, color: colors.slate }}>
        <a href="/login" style={{ color: colors.ink, fontWeight: 600 }}>Back to log in</a>
      </p>
    </main>
  );
}
