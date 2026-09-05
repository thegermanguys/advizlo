import Link from 'next/link';

export default function HomePage() {
  return (
    <main
      style={{
        maxWidth: 480,
        margin: '80px auto',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <h1>Advizlo</h1>
      <p style={{ color: '#555' }}>
        Book a consultation with a lawyer, doctor, tax advisor, or educational
        consultant.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
        <Link href="/login" style={{ padding: '10px 20px', border: '1px solid #ccc', borderRadius: 6 }}>
          Log in
        </Link>
        <Link
          href="/register"
          style={{
            padding: '10px 20px',
            background: '#111',
            color: '#fff',
            borderRadius: 6,
          }}
        >
          Sign up
        </Link>
      </div>
    </main>
  );
}
