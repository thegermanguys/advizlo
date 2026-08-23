'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Category } from '../../../lib/api';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    setLoading(true);
    api.admin.listCategories().then(setCategories).finally(() => setLoading(false));
  }

  async function handleChange(id: string, value: string) {
    const override = value === '' ? null : Number(value) / 100;
    await api.admin.setCategoryCommission(id, override);
    refresh();
  }

  return (
    <main style={{ maxWidth: 600, margin: '40px auto', padding: 24 }}>
      <Link href="/admin" style={{ fontSize: 13 }}>
        ← Back to overview
      </Link>
      <h1>Category commission overrides</h1>
      <p style={{ color: '#555' }}>
        Leave blank to use the platform-wide default rate (set via <code>COMMISSION_RATE</code>{' '}
        in the backend env). A per-consultant override, if set, still wins over this.
      </p>

      {loading && <p>Loading…</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
        {categories.map((c) => (
          <div
            key={c.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 12,
              border: '1px solid #eee',
              borderRadius: 8,
            }}
          >
            <span>{c.name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number"
                placeholder="global"
                defaultValue={
                  c.commissionRateOverride != null ? Math.round(c.commissionRateOverride * 100) : ''
                }
                onBlur={(e) => handleChange(c.id, e.target.value)}
                style={{ width: 70, padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
              />
              <span style={{ color: '#777', fontSize: 13 }}>%</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
