// Next bookable moment from the same weekly availability the booking flow
// uses. Times stay naive UTC, matching bookings.service.ts: a "09:00" window
// is 09:00 UTC, not the consultant's timezone.

export const NEXT_OPEN_HORIZON_DAYS = 28;

export interface AvailabilityWindow {
  dayOfWeek: number | null;
  specificDate: Date | string | null;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  isBlocked: boolean;
}

export interface BusyInterval {
  scheduledAt: Date | string;
  durationMins: number;
}

interface Window {
  startMin: number;
  endMin: number;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function utcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function nextOpenAt(
  now: Date,
  availability: AvailabilityWindow[],
  bookings: BusyInterval[],
  durationMins: number,
): string | null {
  if (!Number.isFinite(durationMins) || durationMins <= 0) return null;
  if (!availability.some((rule) => !rule.isBlocked)) return null;

  const todayStart = utcMidnight(now);
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

  for (let day = 0; day < NEXT_OPEN_HORIZON_DAYS; day++) {
    const dayStart = new Date(todayStart.getTime() + day * 24 * 60 * 60 * 1000);
    const slots = openSlotMinutes(dayStart, availability, durationMins);
    for (const start of slots) {
      if (day === 0 && start <= nowMinutes) continue;
      const slot = new Date(dayStart);
      slot.setUTCHours(Math.floor(start / 60), start % 60, 0, 0);
      if (overlapsBooking(slot, durationMins, bookings)) continue;
      return slot.toISOString();
    }
  }
  return null;
}

function openSlotMinutes(
  dayStart: Date,
  availability: AvailabilityWindow[],
  durationMins: number,
): number[] {
  const rules = rulesForDay(dayStart, availability);
  let windows: Window[] = [];
  for (const rule of rules) {
    if (rule.isBlocked) continue;
    const window = toWindow(rule);
    if (window) windows.push(window);
  }
  for (const rule of rules) {
    if (!rule.isBlocked) continue;
    const block = toWindow(rule);
    if (!block) continue;
    windows = subtractBlock(windows, block.startMin, block.endMin);
  }

  const slots: number[] = [];
  for (const window of windows) {
    for (let t = window.startMin; t + durationMins <= window.endMin; t += durationMins) {
      slots.push(t);
    }
  }
  slots.sort((a, b) => a - b);
  return slots;
}

function rulesForDay(dayStart: Date, availability: AvailabilityWindow[]): AvailabilityWindow[] {
  const day = dayStart.getUTCDay();
  const key = dayStart.toISOString().slice(0, 10);
  return availability.filter((rule) => {
    if (rule.isRecurring) return rule.dayOfWeek === day;
    if (!rule.specificDate) return false;
    const specific = new Date(rule.specificDate);
    if (Number.isNaN(specific.getTime())) return false;
    return specific.toISOString().slice(0, 10) === key;
  });
}

function toWindow(rule: AvailabilityWindow): Window | null {
  const startMin = toMinutes(rule.startTime);
  const endMin = toMinutes(rule.endTime);
  if (startMin == null || endMin == null || endMin <= startMin) return null;
  return { startMin, endMin };
}

function toMinutes(hhmm: string): number | null {
  const match = TIME_PATTERN.exec(hhmm);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function overlapsBooking(slotStart: Date, durationMins: number, bookings: BusyInterval[]): boolean {
  const slotEnd = slotStart.getTime() + durationMins * 60 * 1000;
  for (const booking of bookings) {
    const start = new Date(booking.scheduledAt).getTime();
    if (Number.isNaN(start)) continue;
    const end = start + booking.durationMins * 60 * 1000;
    if (slotStart.getTime() < end && slotEnd > start) return true;
  }
  return false;
}

function subtractBlock(windows: Window[], blockStart: number, blockEnd: number): Window[] {
  const result: Window[] = [];
  for (const window of windows) {
    if (blockEnd <= window.startMin || blockStart >= window.endMin) {
      result.push(window);
      continue;
    }
    if (blockStart > window.startMin) {
      result.push({ startMin: window.startMin, endMin: Math.min(blockStart, window.endMin) });
    }
    if (blockEnd < window.endMin) {
      result.push({ startMin: Math.max(blockEnd, window.startMin), endMin: window.endMin });
    }
  }
  return result;
}
