'use client';

import { useState } from 'react';
import { api } from '../lib/api';
import { colors, styles } from '../lib/theme';

export default function VerifyEmailNotice() {
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function resend() {
    setSending(true);
    setStatus(null);
    try {
      const res = await api.resendVerification();
      setStatus(res.message);
    } catch (err: any) {
      setStatus(err.message ?? 'Could not send the verification email');
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ ...styles.panel, marginTop: 16, borderColor: colors.brass }}>
      <p style={{ margin: 0, fontWeight: 700 }}>Verify your email before you book</p>
      <p style={{ ...styles.lede, marginTop: 8 }}>
        Open the link we sent to your inbox. You can stay signed in. Booking stays closed until that link is opened.
      </p>
      <button
        type="button"
        onClick={resend}
        disabled={sending}
        style={{ ...styles.secondaryButton, marginTop: 12 }}
      >
        {sending ? 'Sending…' : 'Resend verification email'}
      </button>
      {status && <p style={{ margin: '10px 0 0', fontSize: 14 }}>{status}</p>}
    </div>
  );
}
