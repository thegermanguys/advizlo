export interface OfferSummary {
  label: string | null;
  firstMeetingFree: boolean;
}

export function browseOffer(
  serviceTypes:
    | Array<{
        price: string | number;
        currency?: string | null;
        isFirstFree?: boolean;
        active?: boolean;
      }>
    | undefined,
): OfferSummary {
  const active = (serviceTypes ?? []).filter((serviceType) => serviceType.active !== false);
  if (active.length === 0) return { label: null, firstMeetingFree: false };

  const firstMeetingFree = active.some((serviceType) => !!serviceType.isFirstFree);
  const paid = active
    .map((serviceType) => ({
      amount: typeof serviceType.price === 'number' ? serviceType.price : Number(serviceType.price),
      currency: (serviceType.currency || 'USD').toUpperCase(),
    }))
    .filter((price) => Number.isFinite(price.amount) && price.amount > 0);

  if (paid.length === 0) return { label: 'Free', firstMeetingFree };
  paid.sort((a, b) => a.amount - b.amount);
  return {
    label: `From ${formatMoney(paid[0].amount, paid[0].currency)}`,
    firstMeetingFree,
  };
}

export function formatMoney(amount: number, currency: string): string {
  const whole = Number.isInteger(amount);
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    }).format(amount);
  } catch {
    const rendered = whole ? amount.toFixed(0) : amount.toFixed(2);
    return `${currency} ${rendered}`;
  }
}

export function formatNextOpen(iso: string | null | undefined): string {
  if (!iso) return 'No open times';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'No open times';
  const when = date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `Next ${when}`;
}

export function speaksLine(languages: string[] | null | undefined): string | null {
  const names = (languages ?? []).map((language) => language.trim()).filter(Boolean);
  if (names.length === 0) return null;
  return `Speaks ${names.join(', ')}`;
}
