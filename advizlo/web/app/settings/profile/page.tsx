'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken, AuthUser, ConsultantProfile } from '../../../lib/api';
import ConsultantNav from '../../../components/ConsultantNav';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ConsultantProfile | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [credentialsInfo, setCredentialsInfo] = useState('');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    api
      .me()
      .then((me) => {
        setUser(me);
        setFullName(me.fullName ?? '');
        setPhone(me.phone ?? '');
        return api.getMyConsultantProfile().catch(() => null);
      })
      .then((p) => {
        if (p) {
          setProfile(p);
          setBio(p.bio ?? '');
          setCredentialsInfo(p.credentialsInfo ?? '');
        }
      });
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const updatedUser = await api.updateMe({ fullName, phone });
      setUser(updatedUser);

      if (profile) {
        const updatedProfile = await api.updateMyConsultantProfile({
          categoryId: profile.categoryId,
          bio,
          credentialsInfo,
          inPersonAddress: profile.inPersonAddress ?? undefined,
          cancellationPolicyHours: profile.cancellationPolicyHours,
        });
        setProfile(updatedProfile);
      }
      setMessage('Saved.');
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  if (!user) return <main style={{ padding: 24 }}>Loading…</main>;

  return (
    <main style={{ maxWidth: 560, margin: '60px auto', padding: 24 }}>
      <ConsultantNav />
      <h1>Your profile</h1>
      <p style={{ color: '#555' }}>
        This is what clients and admins see about you. Keep your contact details up to date.
      </p>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
        <label style={labelStyle}>
          Full name
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} style={inputStyle} />
        </label>

        <label style={labelStyle}>
          Email <span style={{ color: '#999', fontWeight: 400 }}>(cannot be changed here)</span>
          <input value={user.email} disabled style={{ ...inputStyle, background: '#f5f5f5', color: '#777' }} />
        </label>

        <label style={labelStyle}>
          Phone
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. +1 555 123 4567"
            style={inputStyle}
          />
        </label>

        {profile && (
          <>
            <label style={labelStyle}>
              Category
              <input value={profile.category?.name ?? ''} disabled style={{ ...inputStyle, background: '#f5f5f5', color: '#777' }} />
            </label>

            <label style={labelStyle}>
              Short bio
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </label>

            <label style={labelStyle}>
              Credentials / licensing info
              <textarea
                value={credentialsInfo}
                onChange={(e) => setCredentialsInfo(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </label>

            <p style={{ fontSize: 13, color: '#777', margin: 0 }}>
              Verification status:{' '}
              <strong style={{ color: profile.verificationStatus === 'APPROVED' ? '#0a7d34' : '#a67c00' }}>
                {profile.verificationStatus}
              </strong>
            </p>
          </>
        )}

        {error && <p style={{ color: 'crimson', margin: 0 }}>{error}</p>}
        {message && <p style={{ color: '#0a7d34', margin: 0 }}>{message}</p>}

        <button type="submit" disabled={saving} style={submitStyle}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </main>
  );
}

const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600 };
const inputStyle: React.CSSProperties = { padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 14, fontWeight: 400 };
const submitStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 6,
  border: 'none',
  background: '#111',
  color: '#fff',
  fontSize: 14,
  cursor: 'pointer',
};
