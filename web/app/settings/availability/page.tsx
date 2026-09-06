'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken, AvailabilityRule } from '../../../lib/api';
import ConsultantNav from '../../../components/ConsultantNav';
import { colors, styles } from '../../../lib/theme';

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
  const [dayOfWeek, setDayOfWeek] = useState(1);
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

  const rulesByDay: Record<number, AvailabilityRule[]> = {};
  for (const r of rules) {
    if (r.isRecurring && r.dayOfWeek != null) {
      (rulesByDay[r.dayOfWeek] ??= []).push(r);
    }
  }
  const oneOffRules = rules.filter((r) => !r.isRecurring);

  return (
    <main style={styles.page}>
      <ConsultantNav />
      <h1>Manage availability</h1>
      <p style={styles.lede}>
        Add or remove the days and hours you're generally free. Changes apply immediately —
        clients see updated openings right away.
      </p>

      {!loaded && <p style={styles.statusSlate}>Loading…</p>}

      {loaded && rules.length === 0 && (
        <p style={styles.statusBrass}>
          You have no availability set — clients can't book you until you add a slot below.
        </p>
      )}

      {DAYS.map((dayName, i) => {
        const dayRules = rulesByDay[i] ?? [];
        if (dayRules.length === 0) return null;
        return (
          <div key={dayName} style={{ marginTop: 20 }}>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{dayName}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dayRules
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((r) => (
                  <div key={r.id} style={styles.row}>
                    <span style={{ fontSize: 14 }}>
                      {r.startTime}–{r.endTime}
                    </span>
                    <button onClick={() => handleDelete(r.id)} style={styles.dangerButton}>
                      Remove
                    </button>
                  </div>
                ))}
            </div>
          </div>
        );
      })}

      {oneOffRules.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Specific dates</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {oneOffRules.map((r) => (
              <div key={r.id} style={styles.row}>
                <span style={{ fontSize: 14 }}>
                  {r.specificDate} · {r.startTime}–{r.endTime}
                </span>
                <button onClick={() => handleDelete(r.id)} style={styles.dangerButton}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleAdd} style={{ ...styles.panel, marginTop: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>Add a recurring weekly slot</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label style={styles.label}>
            Day
            <select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))} style={styles.input}>
              {DAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label style={styles.label}>
            From
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={styles.input} />
          </label>
          <label style={styles.label}>
            To
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={styles.input} />
          </label>
          <button type="submit" disabled={loading} style={{ ...styles.secondaryButton, height: 41 }}>
            {loading ? 'Adding…' : 'Add slot'}
          </button>
        </div>
        {error && <p style={{ color: colors.rust, margin: 0 }}>{error}</p>}
      </form>
    </main>
  );
}
