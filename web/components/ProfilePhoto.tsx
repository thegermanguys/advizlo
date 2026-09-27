'use client';

import { useEffect, useRef, useState, type CSSProperties, type ChangeEvent, type ReactNode } from 'react';
import { colors } from '../lib/theme';

export default function ProfilePhoto({
  name,
  src,
  size = 48,
}: {
  name: string;
  src: string | null;
  size?: number;
}) {
  const initials = initialsFrom(name);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const frame: CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    background: colors.brass,
    objectFit: 'cover',
  };

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={`${name} profile photo`}
        width={size}
        height={size}
        style={frame}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`${name} profile photo`}
      style={{
        ...frame,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.white,
        fontWeight: 700,
        fontSize: Math.max(12, Math.round(size * 0.34)),
      }}
    >
      {initials}
    </div>
  );
}

export function ProfilePhotoEditor({
  name,
  src,
  onSelectFile,
  heading,
}: {
  name: string;
  src: string | null;
  onSelectFile: (file: File) => Promise<void>;
  heading?: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      await onSelectFile(file);
    } catch (err: any) {
      setError(err.message ?? 'Could not upload photo');
    } finally {
      setBusy(false);
    }
  }

  const actionLabel = busy ? 'Uploading photo' : src ? 'Replace photo' : 'Add a photo';

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={actionLabel}
        aria-busy={busy}
        style={{ ...photoButtonStyle, cursor: busy ? 'default' : 'pointer' }}
      >
        <ProfilePhoto name={name} src={src} size={72} />
      </button>
      <div style={{ minWidth: 0 }}>
        {heading}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onChange}
          hidden
        />
        <p style={{ margin: '8px 0 0', fontSize: 12, color: colors.slate }}>
          JPEG, PNG, or WebP. Up to 1.5 MB.
        </p>
        {busy && (
          <p role="status" style={{ margin: '6px 0 0', fontSize: 12, color: colors.slate }}>
            Uploading…
          </p>
        )}
        {error && <p style={{ color: colors.rust, margin: '6px 0 0', fontSize: 13 }}>{error}</p>}
      </div>
    </div>
  );
}

const photoButtonStyle: CSSProperties = {
  padding: 0,
  border: 'none',
  background: 'transparent',
  borderRadius: '50%',
  lineHeight: 0,
  flexShrink: 0,
};

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
