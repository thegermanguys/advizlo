// Aligned with the Leadhaus (TGG) brand mark: deep navy + sky blue,
// so Advizlo reads as part of the same family of products.
export const colors = {
  ink: '#081427',
  paper: '#F7F9FC',
  brass: '#5798D4',
  brassDark: '#2E5F91',
  slate: '#57616F',
  slateLight: '#88919B',
  line: '#E1E6ED',
  forest: '#2F5D4C',
  rust: '#A23E2C',
  white: '#FFFFFF',
};

export const styles = {
  page: {
    maxWidth: 640,
    margin: '0 auto',
    padding: '48px 24px 80px',
  } as React.CSSProperties,

  pageNarrow: {
    maxWidth: 520,
    margin: '0 auto',
    padding: '48px 24px 80px',
  } as React.CSSProperties,

  pageWide: {
    maxWidth: 760,
    margin: '0 auto',
    padding: '48px 24px 80px',
  } as React.CSSProperties,

  eyebrow: {
    fontSize: 13,
    color: colors.slate,
    margin: '0 0 6px',
  } as React.CSSProperties,

  lede: {
    fontSize: 15,
    color: colors.slate,
    maxWidth: '60ch',
    lineHeight: 1.6,
  } as React.CSSProperties,

  panel: {
    border: `1px solid ${colors.line}`,
    borderRadius: 6,
    padding: 20,
    background: colors.white,
  } as React.CSSProperties,

  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    border: `1px solid ${colors.line}`,
    borderRadius: 6,
    background: colors.white,
  } as React.CSSProperties,

  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 13,
    fontWeight: 600,
    color: colors.ink,
  } as React.CSSProperties,

  input: {
    padding: '10px 12px',
    borderRadius: 6,
    border: `1px solid ${colors.line}`,
    fontSize: 14,
    fontWeight: 400,
    color: colors.ink,
    background: colors.white,
  } as React.CSSProperties,

  inputDisabled: {
    padding: '10px 12px',
    borderRadius: 6,
    border: `1px solid ${colors.line}`,
    fontSize: 14,
    fontWeight: 400,
    color: colors.slateLight,
    background: '#F5F3EF',
  } as React.CSSProperties,

  primaryButton: {
    padding: '11px 20px',
    borderRadius: 6,
    border: 'none',
    background: colors.ink,
    color: colors.paper,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  } as React.CSSProperties,

  secondaryButton: {
    padding: '10px 19px',
    borderRadius: 6,
    border: `1px solid ${colors.ink}`,
    background: 'transparent',
    color: colors.ink,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  } as React.CSSProperties,

  dangerButton: {
    padding: '7px 14px',
    borderRadius: 6,
    border: `1px solid ${colors.rust}`,
    background: 'transparent',
    color: colors.rust,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  } as React.CSSProperties,

  statusForest: { color: colors.forest, fontWeight: 600 } as React.CSSProperties,
  statusBrass: { color: colors.brassDark, fontWeight: 600 } as React.CSSProperties,
  statusRust: { color: colors.rust, fontWeight: 600 } as React.CSSProperties,
  statusSlate: { color: colors.slateLight } as React.CSSProperties,
};
