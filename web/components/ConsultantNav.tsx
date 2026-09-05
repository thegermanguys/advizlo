'use client';

import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/settings/profile', label: 'Profile' },
  { href: '/onboarding/pricing', label: 'Pricing' },
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
          <a
            key={link.href}
            href={link.href}
            style={{
              ...linkStyle,
              color: active ? '#111' : '#777',
              fontWeight: active ? 700 : 400,
              borderBottom: active ? '2px solid #111' : '2px solid transparent',
            }}
          >
            {link.label}
          </a>
        );
      })}
    </nav>
  );
}

const navStyle: React.CSSProperties = {
  display: 'flex',
  gap: 20,
  flexWrap: 'wrap',
  borderBottom: '1px solid #eee',
  paddingBottom: 12,
  marginBottom: 24,
};
const linkStyle: React.CSSProperties = {
  textDecoration: 'none',
  fontSize: 14,
  paddingBottom: 10,
};
