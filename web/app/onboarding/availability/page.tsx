'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken, AvailabilityRule } from '../../../lib/api';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function OnboardingAvailabilityPage() {
  const router = useRouter();
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
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
    api.listMyAvailability().then(setRules).catch(() => {});
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (startTime >= endTime) {
      setError('Start time must be before end time');
      return;
    }
    setLoading(true);
    try {
      await api.createAvailability({ dayOfWeek, startTime, endTime, isRecurring: true });
      refresh();
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    await api.deleteAvailability(id);
    refresh();
  }

  return (
    <main style={{ maxWidth: 480, margin: '60px auto', padding: 24 }}>
      <Steps active={3} />
      <h1>Set your weekly availability</h1>
      <p style={{ color: '#555' }}>
        Add the days and hours you're generally free. You'll be able to block off specific
        dates (vacation, etc.) later from your dashboard.
      </p>

      {rules.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, marginTop: 20 }}>
          {rules.map((r) => (
            <li
              key={r.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 10,
                border: '1px solid #eee',
                borderRadius: 8,
                marginBottom: 6,
              }}
            >
              <span>
                {r.isRecurring ? DAYS[r.dayOfWeek ?? 0] : r.specificDate} · {r.startTime}–{r.endTime}
              </span>
              <button onClick={() => handleDelete(r.id)} style={{ border: 'none', background: 'none', color: 'crimson', cursor: 'pointer' }}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginTop: 20, alignItems: 'flex-end' }}>
        <label style={labelStyle}>
          Day
          <select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))} style={inputStyle}>
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          From
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          To
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={inputStyle} />
        </label>
        <button type="submit" disabled={loading} style={secondaryButtonStyle}>
          + Add
        </button>
      </form>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <button
        onClick={() => router.push('/onboarding/payouts')}
        disabled={rules.length === 0}
        style={{ ...submitStyle, marginTop: 24 }}
      >
        Continue to payouts
      </button>
      {rules.length === 0 && (
        <p style={{ fontSize: 13, color: '#999', marginTop: 8 }}>
          Add at least one availability slot to finish setup.
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

const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 };
const inputStyle: React.CSSProperties = { padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 14 };
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
  padding: '8px 14px',
  borderRadius: 6,
  border: '1px solid #111',
  background: '#fff',
  color: '#111',
  fontSize: 14,
  cursor: 'pointer',
  height: 38,
};
