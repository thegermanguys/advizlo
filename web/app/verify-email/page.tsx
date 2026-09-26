'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, getToken } from '../../lib/api';
import { colors, styles } from '../../lib/theme';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailPageInner />
    </Suspense>
  );
}

function VerifyEmailPageInner() {
  const params = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'working' | 'done' | 'error'>('working');
  const [message, setMessage] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(!!getToken());
  }, []);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('This link is missing its token. Open the link from the verification email.');
      return;
    }

    let cancelled = false;
    api
      .verifyEmail(token)
      .then((res) => {
        if (cancelled) return;
        setStatus('done');
        setMessage(res.message);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setStatus('error');
        setMessage(err.message ?? 'This verification link is invalid or has expired');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const nextHref = signedIn ? '/dashboard' : '/login';
  const nextLabel = signedIn ? 'Go to your dashboard' : 'Log in';

  return (
    <main style={styles.pageNarrow}>
      <h1>Verify your email</h1>
      {status === 'working' && <p style={styles.lede}>Checking your link…</p>}
      {status === 'done' && <p style={styles.statusForest}>{message}</p>}
      {status === 'error' && <p style={styles.statusRust}>{message}</p>}
      {status !== 'working' && (
        <a
          href={nextHref}
          style={{ ...styles.primaryButton, display: 'inline-block', marginTop: 16, textDecoration: 'none' }}
        >
          {nextLabel}
        </a>
      )}
      {status === 'error' && signedIn && (
        <p style={{ marginTop: 16, fontSize: 14, color: colors.slate }}>
          You can send a fresh link from your dashboard.
        </p>
      )}
    </main>
  );
}
