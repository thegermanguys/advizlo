'use client';

import { usePathname } from 'next/navigation';
import { colors } from '../lib/theme';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/settings/profile', label: 'Profile' },
  { href: '/settings/availability', label: 'Availability' },
  { href: '/settings/bookings', label: 'Upcoming meetings' },
  { href: '/settings/payments', label: 'Payments' },
];

export default function ConsultantNav() {
  const pathname = usePathname();

  return (
    <nav style={navStyle}>
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <a key={link.href} href={link.href} style={active ? activeLinkStyle : linkStyle}>
            {link.label}
          </a>
        );
      })}
    </nav>
  );
}

const navStyle: React.CSSProperties = {
  display: 'flex',
  gap: 24,
  flexWrap: 'wrap',
  borderBottom: `1px solid ${colors.line}`,
  paddingBottom: 0,
  marginBottom: 32,
};

const linkStyle: React.CSSProperties = {
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: 500,
  color: colors.slate,
  paddingBottom: 12,
  borderBottom: '2px solid transparent',
};

const activeLinkStyle: React.CSSProperties = {
  ...linkStyle,
  color: colors.ink,
  fontWeight: 700,
  borderBottom: `2px solid ${colors.brass}`,
};
