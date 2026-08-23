'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken, ServiceType, ConsultationMode } from '../../../lib/api';

const ALL_MODES: { value: ConsultationMode; label: string }[] = [
  { value: 'IN_APP_VIDEO', label: 'Video call (in-app)' },
  { value: 'ZOOM', label: 'Zoom' },
  { value: 'GOOGLE_MEET', label: 'Google Meet' },
  { value: 'PHONE', label: 'Phone call' },
  { value: 'IN_PERSON', label: 'In-person' },
];

export default function OnboardingPricingPage() {
  const router = useRouter();
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [name, setName] = useState('');
  const [durationMins, setDurationMins] = useState(30);
  const [price, setPrice] = useState<number>(50);
  const [isFirstFree, setIsFirstFree] = useState(false);
  const [modes, setModes] = useState<ConsultationMode[]>(['IN_APP_VIDEO']);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    refresh();
  }, [router]);

  function refresh() {
    api.listMyServiceTypes().then(setServiceTypes).catch(() => {});
  }

  function toggleMode(mode: ConsultationMode) {
    setModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode],
    );
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (modes.length === 0) {
      setError('Pick at least one consultation mode');
      return;
    }
    setLoading(true);
    try {
      await api.createServiceType({
        name,
        durationMins,
        price: isFirstFree ? 0 : price,
        isFirstFree,
        consultationModes: modes,
      });
      setName('');
      setIsFirstFree(false);
      refresh();
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    await api.deleteServiceType(id);
    refresh();
  }

  return (
    <main style={{ maxWidth: 560, margin: '60px auto', padding: 24 }}>
      <Steps active={2} />
      <h1>Set your pricing</h1>
      <p style={{ color: '#555' }}>
        Create one or more consultation types. Set price to $0 to offer it for free — e.g. a
        free "Initial Consultation" and a paid "Follow-up".
      </p>

      {serviceTypes.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, marginTop: 20 }}>
          {serviceTypes.map((st) => (
            <li
              key={st.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 12,
                border: '1px solid #eee',
                borderRadius: 8,
                marginBottom: 8,
              }}
            >
              <div>
                <strong>{st.name}</strong>{' '}
                <span style={{ color: '#777' }}>
                  · {st.durationMins} min · {Number(st.price) === 0 ? 'Free' : `$${st.price}`}
                </span>
              </div>
              <button onClick={() => handleDelete(st.id)} style={{ border: 'none', background: 'none', color: 'crimson', cursor: 'pointer' }}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20, padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
        <input
          placeholder='Name (e.g. "Initial Consultation")'
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={inputStyle}
        />
        <div style={{ display: 'flex', gap: 12 }}>
          <label style={labelStyle}>
            Duration (min)
            <input
              type="number"
              min={5}
              value={durationMins}
              onChange={(e) => setDurationMins(Number(e.target.value))}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Price (USD)
            <input
              type="number"
              min={0}
              step="0.01"
              value={price}
              disabled={isFirstFree}
              onChange={(e) => setPrice(Number(e.target.value))}
              style={inputStyle}
            />
          </label>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <input type="checkbox" checked={isFirstFree} onChange={(e) => setIsFirstFree(e.target.checked)} />
          Offer this one for free (price locked to $0)
        </label>

        <div>
          <p style={{ fontSize: 14, marginBottom: 6 }}>How can clients meet you for this?</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ALL_MODES.map((m) => (
              <label
                key={m.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px',
                  border: '1px solid #ccc',
                  borderRadius: 20,
                  fontSize: 13,
                }}
              >
                <input
                  type="checkbox"
                  checked={modes.includes(m.value)}
                  onChange={() => toggleMode(m.value)}
                />
                {m.label}
              </label>
            ))}
          </div>
        </div>

        {error && <p style={{ color: 'crimson' }}>{error}</p>}
        <button type="submit" disabled={loading} style={secondaryButtonStyle}>
          {loading ? 'Adding…' : '+ Add consultation type'}
        </button>
      </form>

      <button
        onClick={() => router.push('/onboarding/availability')}
        disabled={serviceTypes.length === 0}
        style={{ ...submitStyle, marginTop: 20 }}
      >
        Continue to availability
      </button>
      {serviceTypes.length === 0 && (
        <p style={{ fontSize: 13, color: '#999', marginTop: 8 }}>
          Add at least one consultation type to continue.
        </p>
      )}
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

const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, flex: 1 };
const inputStyle: React.CSSProperties = { padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 14 };
const submitStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 6,
  border: 'none',
  background: '#111',
  color: '#fff',
  fontSize: 14,
  cursor: 'pointer',
  width: '100%',
};
const secondaryButtonStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 6,
  border: '1px solid #111',
  background: '#fff',
  color: '#111',
  fontSize: 14,
  cursor: 'pointer',
};
