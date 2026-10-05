import { colors } from '../lib/theme';

export default function SiteHeader() {
  return (
    <header
      style={{
        background: colors.white,
        borderBottom: `1px solid ${colors.line}`,
      }}
    >
      <div style={{ padding: '10px 24px' }}>
        <a href="/" style={{ display: 'inline-flex', lineHeight: 0, textDecoration: 'none' }}>
          <img
            src="/advizlo-logo.png"
            alt="Advizlo"
            width={180}
            height={56}
            style={{ display: 'block', height: 56, width: 'auto' }}
          />
        </a>
      </div>
    </header>
  );
}
