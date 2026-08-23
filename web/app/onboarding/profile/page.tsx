'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken, Category } from '../../../lib/api';

export default function OnboardingProfilePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [bio, setBio] = useState('');
  const [credentialsInfo, setCredentialsInfo] = useState('');
  const [inPersonAddress, setInPersonAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    api.categories().then(setCategories).catch(() => setError('Could not load categories'));

    // Pre-fill if the consultant already started onboarding before.
    api
      .getMyConsultantProfile()
      .then((profile) => {
        if (profile?.categoryId) setCategoryId(profile.categoryId);
        if (profile?.bio) setBio(profile.bio);
        if (profile?.credentialsInfo) setCredentialsInfo(profile.credentialsInfo);
        if (profile?.inPersonAddress) setInPersonAddress(profile.inPersonAddress);
      })
      .catch(() => {
        /* first time through onboarding — nothing to prefill, that's fine */
      });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.updateMyConsultantProfile({ categoryId, bio, credentialsInfo, inPersonAddress });
      router.push('/onboarding/pricing');
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 480, margin: '60px auto', padding: 24 }}>
      <Steps active={1} />
      <h1>Tell clients who you are</h1>
      <p style={{ color: '#555' }}>
        This shows up on your public profile so clients know what you help with.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
        <label style={labelStyle}>
          Category
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            style={inputStyle}
          >
            <option value="" disabled>
              Select your specialty
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          Short bio
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="e.g. 12 years practicing family law, focused on..."
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </label>

        <label style={labelStyle}>
          Credentials / licensing info
          <textarea
            value={credentialsInfo}
            onChange={(e) => setCredentialsInfo(e.target.value)}
            rows={3}
            placeholder="e.g. Bar number, state licensed, certifications..."
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </label>

        <label style={labelStyle}>
          In-person address (optional — only needed if you offer in-person consultations)
          <input
            value={inPersonAddress}
            onChange={(e) => setInPersonAddress(e.target.value)}
            placeholder="123 Main St, Suite 400, Springfield"
            style={inputStyle}
          />
        </label>

        {error && <p style={{ color: 'crimson' }}>{error}</p>}

        <button type="submit" disabled={loading || !categoryId} style={submitStyle}>
          {loading ? 'Saving…' : 'Continue to pricing'}
        </button>
      </form>
    </main>
  );
}

function Steps({ active }: { active: 1 | 2 | 3 | 4 | 5 }) {
  const steps = ['Profile', 'Pricing', 'Availability', 'Payouts', 'Video'];
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 24, fontSize: 13, color: '#777' }}>
      {steps.map((s, i) => (
        <span key={s} style={{ fontWeight: i + 1 === active ? 700 : 400, color: i + 1 === active ? '#111' : '#999' }}>
          {i + 1}. {s}
          {i < steps.length - 1 && <span style={{ margin: '0 6px' }}>→</span>}
        </span>
      ))}
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 };
const inputStyle: React.CSSProperties = { padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 14 };
const submitStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 6,
  border: 'none',
  background: '#111',
  color: '#fff',
  fontSize: 14,
  cursor: 'pointer',
};
