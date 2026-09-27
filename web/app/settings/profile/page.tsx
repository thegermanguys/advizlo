'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken, AuthUser, ConsultantProfile, consultantPhotoSrc, userPhotoSrc } from '../../../lib/api';
import ConsultantNav from '../../../components/ConsultantNav';
import LanguageField from '../../../components/LanguageField';
import { ProfilePhotoEditor } from '../../../components/ProfilePhoto';
import { colors, styles } from '../../../lib/theme';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ConsultantProfile | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
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
          setCountry(p.country ?? '');
          setLanguages(p.languages ?? []);
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
          country,
          languages,
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
      {user.role === 'CONSULTANT' && <ConsultantNav />}
      <h1>Your profile</h1>
      <p style={styles.lede}>
        {profile
          ? 'This is what clients see on your card and profile. Keep your contact details current.'
          : 'Your account details. You can update your name, phone, and photo.'}
      </p>

      {(user.role !== 'CONSULTANT' || profile) && (
        <div style={{ ...styles.panel, marginTop: 28 }}>
          <ProfilePhotoEditor
            name={fullName || user.fullName}
            src={profile ? consultantPhotoSrc(profile) : userPhotoSrc(user)}
            heading={
              <div>
                <h2 style={{ margin: 0, fontSize: 26 }}>{fullName || user.fullName}</h2>
                <p style={{ margin: '4px 0 0', color: colors.slate, fontSize: 14 }}>{user.email}</p>
              </div>
            }
            onSelectFile={async (file) => {
              const saved = await api.uploadMyPhoto(profile ? 'consultant' : 'user', file);
              if (profile) setProfile({ ...profile, profilePhoto: saved });
              else setUser({ ...user, profilePhoto: saved });
            }}
          />
        </div>
      )}

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
              Country
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                maxLength={80}
                placeholder="e.g. Germany"
                style={styles.input}
              />
            </label>

            <LanguageField value={languages} onChange={setLanguages} />

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
