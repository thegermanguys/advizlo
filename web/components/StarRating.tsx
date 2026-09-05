'use client';

// Read-only display: <StarRating value={4.3} />
// Interactive input: <StarRating value={rating} onChange={setRating} />
export default function StarRating({
  value,
  onChange,
  size = 16,
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
}) {
  const stars = [1, 2, 3, 4, 5];
  const interactive = !!onChange;

  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {stars.map((n) => {
        const filled = n <= Math.round(value);
        return (
          <span
            key={n}
            onClick={interactive ? () => onChange!(n) : undefined}
            style={{
              fontSize: size,
              color: filled ? '#f5a623' : '#ddd',
              cursor: interactive ? 'pointer' : 'default',
              lineHeight: 1,
            }}
          >
            ★
          </span>
        );
      })}
    </span>
  );
}
