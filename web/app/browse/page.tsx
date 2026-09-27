'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Category, ConsultantProfile, consultantPhotoSrc } from '../../lib/api';
import ProfilePhoto from '../../components/ProfilePhoto';
import { browseOffer, formatNextOpen, speaksLine } from '../../lib/consultant-card';
import { colors, styles } from '../../lib/theme';

export default function BrowsePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [nameQuery, setNameQuery] = useState('');
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

  const query = nameQuery.trim().toLowerCase();
  const visible = consultants.filter((consultant) => {
    if (!query) return true;
    return (consultant.user?.fullName ?? '').toLowerCase().includes(query);
  });

  return (
    <main style={styles.pageWide}>
      <p style={styles.eyebrow}>Browse</p>
      <h1>Find a consultant</h1>
      <p style={styles.lede}>Search by name, or start with a specialty. Price, languages, and the next open time are on the card.</p>

      <form onSubmit={(e) => e.preventDefault()} style={{ marginTop: 20 }}>
        <label style={styles.label}>
          Search by name
          <input
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            placeholder="e.g. Anna Schmidt"
            type="search"
            style={styles.input}
          />
        </label>
      </form>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '18px 0 24px' }}>
        <Pill active={categoryId === ''} label="All" onClick={() => setCategoryId('')} />
        {categories.map((category) => (
          <Pill
            key={category.id}
            active={categoryId === category.id}
            label={category.name}
            onClick={() => setCategoryId(category.id)}
          />
        ))}
      </div>

      {loading && <p style={{ color: colors.slate }}>Loading…</p>}

      {!loading && consultants.length === 0 && (
        <p style={{ color: colors.slate }}>
          No approved consultants in this category yet. Consultants need admin verification before
          appearing here.
        </p>
      )}

      {!loading && consultants.length > 0 && visible.length === 0 && (
        <p style={{ color: colors.slate }}>No consultants match that name.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visible.map((consultant) => (
          <ConsultantCard key={consultant.id} consultant={consultant} />
        ))}
      </div>
    </main>
  );
}

function ConsultantCard({ consultant }: { consultant: ConsultantProfile }) {
  const name = consultant.user?.fullName ?? 'Consultant';
  const country = consultant.country?.trim();
  const bio = consultant.bio?.trim();
  const languages = speaksLine(consultant.languages);
  const offer = browseOffer(consultant.serviceTypes);
  const nextOpen = formatNextOpen(consultant.nextOpenAt);

  return (
    <Link href={`/consultants/${consultant.id}`} className="browse-card">
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <ProfilePhoto name={name} src={consultantPhotoSrc(consultant)} size={56} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
            <strong style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: 20, fontWeight: 600 }}>
              {name}
            </strong>
            <span style={{ color: colors.slate, fontSize: 13, flexShrink: 0 }}>{consultant.category?.name}</span>
          </div>
          {country && <div style={{ color: colors.slate, fontSize: 13, marginTop: 2 }}>{country}</div>}
          {languages && <div style={{ color: colors.ink, fontSize: 13, marginTop: 2 }}>{languages}</div>}
          {bio && (
            <p
              title={bio}
              style={{
                color: colors.slate,
                fontSize: 14,
                lineHeight: 1.45,
                margin: '8px 0 0',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {bio}
            </p>
          )}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
          marginTop: 14,
          paddingTop: 12,
          borderTop: `1px solid ${colors.line}`,
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {offer.label && <span style={{ fontWeight: 700, fontSize: 15 }}>{offer.label}</span>}
          {offer.firstMeetingFree && <span style={freeBadgeStyle}>First meeting free</span>}
        </div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: consultant.nextOpenAt ? colors.forest : colors.slate,
          }}
        >
          {nextOpen}
        </span>
      </div>
    </Link>
  );
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px',
        borderRadius: 20,
        border: active ? `1px solid ${colors.ink}` : `1px solid ${colors.line}`,
        background: active ? colors.ink : colors.white,
        color: active ? colors.paper : colors.ink,
        fontSize: 13,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

const freeBadgeStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: colors.forest,
  border: `1px solid ${colors.forest}`,
  borderRadius: 999,
  padding: '2px 8px',
};
