'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken, AuthUser, ConsultantProfile } from '../../../lib/api';
import ConsultantNav from '../../../components/ConsultantNav';
import { colors, styles } from '../../../lib/theme';

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

  if (!user) return <main style={styles.pageNarrow}>Loading…</main>;

  return (
    <main style={styles.pageNarrow}>
      <ConsultantNav />
      <h1>Your profile</h1>
      <p style={styles.lede}>
        This is what clients and admins see about you. Keep your contact details current.
      </p>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 28 }}>
        <label style={styles.label}>
          Full name
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} style={styles.input} />
        </label>

        <label style={styles.label}>
          Email
          <input value={user.email} disabled style={styles.inputDisabled} />
        </label>

        <label style={styles.label}>
          Phone
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +1 555 123 4567" style={styles.input} />
        </label>

        {profile && (
          <>
            <label style={styles.label}>
              Category
              <input value={profile.category?.name ?? ''} disabled style={styles.inputDisabled} />
            </label>

            <label style={styles.label}>
              Short bio
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} style={{ ...styles.input, resize: 'vertical' }} />
            </label>

            <label style={styles.label}>
              Credentials & licensing
              <textarea value={credentialsInfo} onChange={(e) => setCredentialsInfo(e.target.value)} rows={3} style={{ ...styles.input, resize: 'vertical' }} />
            </label>

            <p style={{ fontSize: 13, color: colors.slate, margin: 0 }}>
              Verification status:{' '}
              <span style={profile.verificationStatus === 'APPROVED' ? styles.statusForest : styles.statusBrass}>
                {profile.verificationStatus.toLowerCase()}
              </span>
            </p>
          </>
        )}

        {error && <p style={{ color: colors.rust, margin: 0 }}>{error}</p>}
        {message && <p style={styles.statusForest}>{message}</p>}

        <button type="submit" disabled={saving} style={{ ...styles.primaryButton, alignSelf: 'flex-start' }}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </main>
  );
}
