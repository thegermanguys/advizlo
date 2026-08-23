'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Category, ConsultantProfile } from '../../lib/api';

export default function BrowsePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [consultants, setConsultants] = useState<ConsultantProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .listConsultants(categoryId || undefined)
      .then(setConsultants)
      .finally(() => setLoading(false));
  }, [categoryId]);

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: 24 }}>
      <h1>Find a consultant</h1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '16px 0 24px' }}>
        <Pill active={categoryId === ''} label="All" onClick={() => setCategoryId('')} />
        {categories.map((c) => (
          <Pill key={c.id} active={categoryId === c.id} label={c.name} onClick={() => setCategoryId(c.id)} />
        ))}
      </div>

      {loading && <p>Loading…</p>}

      {!loading && consultants.length === 0 && (
        <p style={{ color: '#777' }}>
          No approved consultants in this category yet. (Consultants need admin verification
          before appearing here — see README for how to approve one for testing.)
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {consultants.map((c) => (
          <Link
            key={c.id}
            href={`/consultants/${c.id}`}
            style={{
              display: 'block',
              padding: 16,
              border: '1px solid #eee',
              borderRadius: 10,
              textDecoration: 'none',
              color: '#111',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{c.user?.fullName}</strong>
              <span style={{ color: '#777', fontSize: 13 }}>{c.category?.name}</span>
            </div>
            {c.bio && <p style={{ color: '#555', fontSize: 14, marginTop: 6 }}>{c.bio}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {c.serviceTypes?.map((st) => (
                <span
                  key={st.id}
                  style={{ fontSize: 12, padding: '3px 8px', borderRadius: 12, background: '#f3f3f3' }}
                >
                  {st.name} · {Number(st.price) === 0 ? 'Free' : `$${st.price}`}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px',
        borderRadius: 20,
        border: active ? '1px solid #111' : '1px solid #ccc',
        background: active ? '#111' : '#fff',
        color: active ? '#fff' : '#111',
        fontSize: 13,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}
