'use client';

import { useEffect, useState } from 'react';
import AdminShell from '../../../components/AdminShell';
import { api, Category } from '../../../lib/api';
import { colors, styles } from '../../../lib/theme';

export default function AdminCategoriesPage() {
  return (
    <AdminShell>
      <Categories />
    </AdminShell>
  );
}

function Categories() {
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
    <>
      <h1>Category commission overrides</h1>
      <p style={styles.lede}>
        Leave blank to use the platform-wide default rate (set via <code>COMMISSION_RATE</code> in
        the backend env). A per-consultant override, if set, still wins over this. Collected amounts
        are on the Commissions page.
      </p>

      {loading && <p>Loading…</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
        {categories.map((category) => (
          <div key={category.id} style={styles.row}>
            <span>{category.name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number"
                placeholder="global"
                defaultValue={
                  category.commissionRateOverride != null
                    ? Math.round(category.commissionRateOverride * 100)
                    : ''
                }
                onBlur={(e) => handleChange(category.id, e.target.value)}
                style={{ ...styles.input, width: 80 }}
              />
              <span style={{ color: colors.slate, fontSize: 13 }}>%</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
