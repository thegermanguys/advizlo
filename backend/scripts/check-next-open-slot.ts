import { nextOpenAt, type AvailabilityWindow } from '../src/consultants/next-open-slot';
import { browseOffer } from '../../web/lib/consultant-card';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const monday = (start: string, end: string, extra: Partial<AvailabilityWindow> = {}): AvailabilityWindow => ({
  dayOfWeek: 1,
  specificDate: null,
  startTime: start,
  endTime: end,
  isRecurring: true,
  isBlocked: false,
  ...extra,
});

const none = nextOpenAt(new Date('2026-09-28T08:00:00.000Z'), [], [], 60);
assert(none === null, 'no availability should be no open time');

const blockedOnly = nextOpenAt(
  new Date('2026-09-28T08:00:00.000Z'),
  [monday('09:00', '17:00', { isBlocked: true })],
  [],
  60,
);
assert(blockedOnly === null, 'blocked-only rules should be no open time');

const tooShort = nextOpenAt(new Date('2026-09-28T08:00:00.000Z'), [monday('09:00', '09:30')], [], 60);
assert(tooShort === null, 'a window shorter than the session should not count');

const nextMonday = nextOpenAt(new Date('2026-09-27T15:00:00.000Z'), [monday('09:00', '12:00')], [], 60);
assert(
  nextMonday === '2026-09-28T09:00:00.000Z',
  `expected Monday 09:00, got ${nextMonday}`,
);

const laterToday = nextOpenAt(new Date('2026-09-28T10:30:00.000Z'), [monday('09:00', '12:00')], [], 60);
assert(
  laterToday === '2026-09-28T11:00:00.000Z',
  `expected 11:00 after 10:30, got ${laterToday}`,
);

const booked = nextOpenAt(
  new Date('2026-09-28T08:00:00.000Z'),
  [monday('09:00', '10:00')],
  [{ scheduledAt: '2026-09-28T09:00:00.000Z', durationMins: 60 }],
  60,
);
assert(
  booked === '2026-10-05T09:00:00.000Z',
  `expected the following Monday when today is booked, got ${booked}`,
);

const blockedDay = nextOpenAt(
  new Date('2026-09-28T08:00:00.000Z'),
  [
    monday('09:00', '10:00'),
    {
      dayOfWeek: null,
      specificDate: '2026-09-28T00:00:00.000Z',
      startTime: '00:00',
      endTime: '23:59',
      isRecurring: false,
      isBlocked: true,
    },
  ],
  [],
  60,
);
assert(
  blockedDay === '2026-10-05T09:00:00.000Z',
  `expected the week after a blocked Monday, got ${blockedDay}`,
);

const euro = browseOffer([{ price: '80.00', currency: 'EUR', isFirstFree: false, active: true }]);
assert(euro.label === 'From €80', `expected From €80, got ${euro.label}`);
assert(euro.firstMeetingFree === false, 'paid-only offer is not a free first meeting');

const intro = browseOffer([
  { price: '0', currency: 'EUR', isFirstFree: true, active: true },
  { price: '120', currency: 'EUR', isFirstFree: false, active: true },
]);
assert(intro.label === 'From €120', `expected From €120, got ${intro.label}`);
assert(intro.firstMeetingFree === true, 'isFirstFree should label the first meeting');

const free = browseOffer([{ price: '0.00', currency: 'USD', isFirstFree: false, active: true }]);
assert(free.label === 'Free', `expected Free, got ${free.label}`);

const usd = browseOffer([{ price: '50', currency: 'USD', active: true }]);
assert(usd.label === 'From $50', `expected From $50, got ${usd.label}`);

const empty = browseOffer([]);
assert(empty.label === null, 'no service types should not invent a price');

console.log('next open time and price checks passed');
