'use client';

import { useEffect, useState } from 'react';
import { api, Category } from '../lib/api';
import { colors, styles } from '../lib/theme';

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
  }, []);

  return (
    <main>
      <section style={{ ...styles.pageWide, paddingTop: 72, paddingBottom: 56 }}>
        <p style={styles.eyebrow}>A TGG product</p>
        <h1 style={{ fontSize: 44, maxWidth: '14ch' }}>Talk to the right expert, this week.</h1>
        <p style={{ ...styles.lede, fontSize: 17, marginTop: 12 }}>
          Advizlo connects you with verified lawyers, doctors, tax advisors, and other
          consultants for a booked video or phone consultation — no waiting rooms, no cold
          calls.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
          <a href="/register?role=CLIENT" style={styles.primaryButton}>
            I need advice
          </a>
          <a href="/register?role=CONSULTANT" style={styles.secondaryButton}>
            I'm a consultant
          </a>
        </div>
      </section>

      <section style={{ ...styles.pageWide, paddingTop: 0, paddingBottom: 56 }}>
        <h2 style={{ fontSize: 22 }}>How it works</h2>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 20 }}>
          <Step number="1" title="Find your expert" body="Browse by category and see real availability, pricing, and credentials up front." />
          <Step number="2" title="Book a time" body="Pick an open slot. Free intro calls or paid sessions — your choice." />
          <Step number="3" title="Meet & get answers" body="Join by video, phone, or in person, then pay only once the session is confirmed." />
        </div>
      </section>

      {categories.length > 0 && (
        <section style={{ ...styles.pageWide, paddingTop: 0, paddingBottom: 72 }}>
          <h2 style={{ fontSize: 22 }}>Areas covered</h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
            {categories.map((c) => (
              <span key={c.id} style={categoryPillStyle}>
                {c.name}
              </span>
            ))}
          </div>
        </section>
      )}

      <footer style={{ ...styles.pageWide, borderTop: `1px solid ${colors.line}`, paddingTop: 24, paddingBottom: 40 }}>
        <p style={{ fontSize: 13, color: colors.slateLight, margin: 0 }}>
          Advizlo — a TGG product. <a href="/login" style={{ color: colors.slateLight }}>Log in</a>
        </p>
      </footer>
    </main>
  );
}

function Step({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div style={{ flex: '1 1 220px', minWidth: 220 }}>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: colors.brass, margin: 0 }}>{number}</p>
      <p style={{ fontWeight: 700, margin: '8px 0 4px' }}>{title}</p>
      <p style={{ fontSize: 14, color: colors.slate, margin: 0 }}>{body}</p>
    </div>
  );
}

const categoryPillStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 999,
  border: `1px solid ${colors.line}`,
  background: colors.white,
  fontSize: 13,
  color: colors.ink,
};
