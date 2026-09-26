'use client';

import { usePathname } from 'next/navigation';
import { colors } from '../lib/theme';

const LINKS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/consultants', label: 'Consultants' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/commissions', label: 'Commissions' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/bookings', label: 'Bookings' },
];

export default function AdminNav() {
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
