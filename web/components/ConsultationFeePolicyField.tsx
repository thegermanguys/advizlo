'use client';

import { ConsultationFeePolicy, CONSULTATION_FEE_POLICIES } from '../lib/api';
import { colors } from '../lib/theme';

export default function ConsultationFeePolicyField({
  value,
  onChange,
  disabled,
}: {
  value: ConsultationFeePolicy;
  onChange: (next: ConsultationFeePolicy) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
      <legend style={{ fontSize: 13, fontWeight: 600, color: colors.ink, marginBottom: 8 }}>
        Consultation fee
      </legend>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {CONSULTATION_FEE_POLICIES.map((option) => (
          <label
            key={option.value}
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              fontSize: 14,
              fontWeight: 400,
              color: colors.ink,
            }}
          >
            <input
              type="radio"
              name="consultationFeePolicy"
              value={option.value}
              checked={value === option.value}
              disabled={disabled}
              onChange={() => onChange(option.value)}
              style={{ marginTop: 3 }}
            />
            <span>
              <strong>{option.label}</strong>
              <span style={{ display: 'block', color: colors.slate, fontSize: 13, lineHeight: 1.45 }}>
                {option.description}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
