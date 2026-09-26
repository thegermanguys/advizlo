'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, clearToken, getToken } from '../lib/api';
import { styles } from '../lib/theme';
import AdminNav from './AdminNav';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    api
      .me()
      .then((me) => {
        if (me.role !== 'ADMIN') {
          router.replace('/dashboard');
          return;
        }
        setReady(true);
      })
      .catch(() => {
        clearToken();
        router.replace('/login');
      });
  }, [router]);

  if (!ready) return <main style={styles.pageWide}>Loading…</main>;

  return (
    <main style={shellStyle}>
      <AdminNav />
      {children}
    </main>
  );
}

const shellStyle: React.CSSProperties = {
  ...styles.pageWide,
  maxWidth: 960,
};
