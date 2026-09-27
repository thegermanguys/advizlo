'use client';

import { useState } from 'react';
import { colors, styles } from '../lib/theme';

const SUGGESTED_LANGUAGES = [
  'English',
  'German',
  'Spanish',
  'French',
  'Italian',
  'Portuguese',
  'Dutch',
  'Polish',
  'Turkish',
  'Arabic',
  'Ukrainian',
  'Russian',
  'Mandarin',
  'Japanese',
  'Hindi',
];

const MAX_LANGUAGES = 12;

export default function LanguageField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  function add(raw: string) {
    const name = raw.trim().replace(/\s+/g, ' ');
    if (!name) return;
    if (name.length > 40) {
      setError('Language names can be up to 40 characters.');
      return;
    }
    if (value.some((language) => language.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setDraft('');
      setError(null);
      return;
    }
    if (value.length >= MAX_LANGUAGES) {
      setError(`You can list up to ${MAX_LANGUAGES} languages.`);
      return;
    }
    setError(null);
    setDraft('');
    onChange([...value, name]);
  }

  function remove(name: string) {
    onChange(value.filter((language) => language !== name));
    setError(null);
  }

  const suggestions = SUGGESTED_LANGUAGES.filter(
    (language) => !value.some((selected) => selected.toLocaleLowerCase() === language.toLocaleLowerCase()),
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: colors.ink }}>Languages you work in</span>
      <p style={{ margin: 0, fontSize: 13, color: colors.slate }}>
        Clients see these on your browse card.
      </p>
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {value.map((language) => (
            <button
              key={language}
              type="button"
              onClick={() => remove(language)}
              style={selectedChipStyle}
              aria-label={`Remove ${language}`}
            >
              {language} ×
            </button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
            }
          }}
          placeholder="Add a language"
          maxLength={40}
          style={{ ...styles.input, flex: '1 1 180px' }}
        />
        <button type="button" onClick={() => add(draft)} style={styles.secondaryButton}>
          Add
        </button>
      </div>
      {suggestions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {suggestions.map((language) => (
            <button key={language} type="button" onClick={() => add(language)} style={suggestionChipStyle}>
              {language}
            </button>
          ))}
        </div>
      )}
      {error && <p style={{ color: colors.rust, margin: 0, fontSize: 13 }}>{error}</p>}
    </div>
  );
}

const suggestionChipStyle: React.CSSProperties = {
  padding: '5px 10px',
  borderRadius: 999,
  border: `1px solid ${colors.line}`,
  background: colors.white,
  color: colors.ink,
  fontSize: 13,
  cursor: 'pointer',
};

const selectedChipStyle: React.CSSProperties = {
  ...suggestionChipStyle,
  border: `1px solid ${colors.ink}`,
  background: colors.ink,
  color: colors.paper,
};
