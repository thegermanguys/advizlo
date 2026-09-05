'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken, AvailabilityRule } from '../../../lib/api';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ManageAvailabilityPage() {
  return (
    <Suspense fallback={null}>
      <ManageAvailabilityPageInner />
    </Suspense>
  );
}

function ManageAvailabilityPageInner() {
  const router = useRouter();
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    refresh();
  }, [router]);

  function refresh() {
    api
      .listMyAvailability()
      .then(setRules)
      .catch(() => {})
      .finally(() => setLoaded(true));
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

  // Group rules by day for a clearer weekly overview.
  const rulesByDay: Record<number, AvailabilityRule[]> = {};
  for (const r of rules) {
    if (r.isRecurring && r.dayOfWeek != null) {
      (rulesByDay[r.dayOfWeek] ??= []).push(r);
    }
  }
  const oneOffRules = rules.filter((r) => !r.isRecurring);

  return (
    <main style={{ maxWidth: 560, margin: '60px auto', padding: 24 }}>
      <a href="/dashboard" style={backLinkStyle}>
        ← Back to dashboard
      </a>
      <h1 style={{ marginTop: 8 }}>Manage availability</h1>
      <p style={{ color: '#555' }}>
        Add or remove the days and hours you're generally free for consultations. Changes here
        apply immediately — clients will see updated openings right away.
      </p>

      {!loaded && <p style={{ color: '#777' }}>Loading…</p>}

      {loaded && rules.length === 0 && (
        <p style={{ color: '#a67c00', fontSize: 14 }}>
          You have no availability set — clients won't be able to book you until you add at
          least one slot below.
        </p>
      )}

      {DAYS.map((dayName, i) => {
        const dayRules = rulesByDay[i] ?? [];
        if (dayRules.length === 0) return null;
        return (
          <div key={dayName} style={{ marginTop: 16 }}>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{dayName}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {dayRules
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((r) => (
                  <div key={r.id} style={ruleRowStyle}>
                    <span>
                      {r.startTime}–{r.endTime}
                    </span>
                    <button onClick={() => handleDelete(r.id)} style={removeButtonStyle}>
                      Remove
                    </button>
                  </div>
                ))}
            </div>
          </div>
        );
      })}

      {oneOffRules.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Specific dates</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {oneOffRules.map((r) => (
              <div key={r.id} style={ruleRowStyle}>
                <span>
                  {r.specificDate} · {r.startTime}–{r.endTime}
                </span>
                <button onClick={() => handleDelete(r.id)} style={removeButtonStyle}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleAdd} style={formStyle}>
        <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>Add a recurring weekly slot</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
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
          <button type="submit" disabled={loading} style={addButtonStyle}>
            {loading ? 'Adding…' : '+ Add slot'}
          </button>
        </div>
        {error && <p style={{ color: 'crimson', margin: 0 }}>{error}</p>}
      </form>
    </main>
  );
}

const backLinkStyle: React.CSSProperties = {
  color: '#555',
  textDecoration: 'none',
  fontSize: 14,
};
const ruleRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 10,
  border: '1px solid #eee',
  borderRadius: 8,
  fontSize: 14,
};
const removeButtonStyle: React.CSSProperties = {
  border: 'none',
  background: 'none',
  color: 'crimson',
  cursor: 'pointer',
  fontSize: 13,
};
const formStyle: React.CSSProperties = {
  marginTop: 28,
  paddingTop: 20,
  borderTop: '1px solid #eee',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 };
const inputStyle: React.CSSProperties = { padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 14 };
const addButtonStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 6,
  border: '1px solid #111',
  background: '#fff',
  color: '#111',
  fontSize: 14,
  cursor: 'pointer',
  height: 38,
};
