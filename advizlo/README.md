# Advizlo

Monorepo containing:
- `backend/` — NestJS API + Prisma + Postgres
- `web/` — Next.js web app
- `mobile/` — Expo/React Native app
- `packages/shared/` — shared TypeScript types

**Feature status:**
- ✅ Slice 1 — Authentication & roles
- ✅ Slice 2 — Consultant onboarding + pricing engine + availability engine
- ✅ Slice 3 — Client browse/search + full booking flow
- ✅ Slice 4 — Payments: Stripe Connect, Checkout Sessions, webhook confirmation
- ✅ Slice 5 — Admin dashboard: consultant verification, commission overrides, platform stats, booking oversight
- ✅ Slice 6 — Video integration: Daily.co in-app rooms (zero setup), Zoom OAuth, Google Meet OAuth, all dispatched through one confirmation hook
- ✅ Slice 7 — Refunds: policy-aware refund eligibility on cancellation, Stripe transfer reversal
- ✅ Slice 8 — Consultant settings hub: a persistent nav bar (`ConsultantNav`) plus dedicated Profile / Availability / Upcoming meetings / Payments pages under `/settings/*`, web-only for now. This was started independently (not by me) and continued across a machine switch — see section 15 for what was broken when I picked it back up and what I fixed.

Not yet built: reviews. Mobile has no equivalent of the `/settings/*` section yet (see section 15).

**Two security fixes landed in slice 6/7** (worth reading if you deployed an earlier download): several endpoints were using Prisma's `include` without a matching `select`, which returns every scalar field on the related model. The serious one — `passwordHash` was being returned on booking-list endpoints since slice 3 (`include: { user: true }` / `include: { client: true }` on a Booking includes the *entire* User row). The other — the new Zoom/Google OAuth token fields were reachable through the public browse endpoints and the booking-creation response. Both are fixed with explicit `select` clauses now; see section 12 below for the full list of what changed.

---

## 1. Prerequisites

- Node.js 20+
- Docker (for local Postgres) — or your own Postgres instance
- For mobile: Expo Go app on your phone, or an iOS/Android simulator

## 2. Start the database

```bash
docker compose up -d
```

This starts Postgres on `localhost:5432` with user/password/db all set to `advizlo` (see `docker-compose.yml`).

## 3. Backend setup

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate      # creates all tables from schema.prisma
npm run seed                # seeds real categories (Legal, Medical, Tax Advisory, etc.)
npm run start:dev
```

API runs at `http://localhost:3001`. Quick smoke test:

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"password123","fullName":"Jane Doe","role":"CLIENT"}'
```

You should get back `{ accessToken, user }`.

### Stripe setup (for the payments module)

1. Get test-mode API keys from the [Stripe dashboard](https://dashboard.stripe.com/test/apikeys) and put the secret key in `backend/.env` as `STRIPE_SECRET_KEY`.
2. Install the [Stripe CLI](https://docs.stripe.com/stripe-cli), then run:
   ```bash
   stripe listen --forward-to localhost:3001/payments/webhook
   ```
   This prints a webhook signing secret (`whsec_...`) — put it in `backend/.env` as `STRIPE_WEBHOOK_SECRET`. Keep this running in a separate terminal while you test bookings locally.
3. A consultant connects payouts from `/onboarding/payouts` (web) or the equivalent mobile screen — this creates a Stripe Express account and walks them through Stripe's own KYC flow. In test mode, use Stripe's [test onboarding details](https://docs.stripe.com/connect/testing) (e.g. any test SSN, test bank account `000123456789`) to complete it without real identity docs.
4. A client can't check out a paid booking until the consultant has finished that Connect onboarding (`charges_enabled: true`) — the API returns a clear error otherwise.

### Video provider setup

**Daily.co (in-app video)** — needs zero per-consultant setup, just one platform-wide API key:
1. Get a key from the [Daily.co dashboard](https://dashboard.daily.co/developers) and put it in `backend/.env` as `DAILY_API_KEY`.

That's it — every consultant can offer `IN_APP_VIDEO` immediately.

**Zoom** — each consultant connects their *own* Zoom account via OAuth:
1. Create an OAuth app at the [Zoom App Marketplace](https://marketplace.zoom.us) ("Build App" → OAuth, user-managed, not Server-to-Server).
2. Add `http://localhost:3001/video/zoom/callback` as the redirect URL in the app settings — it must exactly match `ZOOM_REDIRECT_URI` in `backend/.env`.
3. Put the app's client ID/secret in `backend/.env` as `ZOOM_CLIENT_ID` / `ZOOM_CLIENT_SECRET`.
4. A consultant connects from `/onboarding/video` (web) or the equivalent mobile screen.

**Google Meet** — same idea, via Google Calendar's `conferenceData`:
1. Create an OAuth client ID (type "Web application") at [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials), and enable the **Google Calendar API** for that project.
2. Add `http://localhost:3001/video/google/callback` as an authorized redirect URI — must exactly match `GOOGLE_REDIRECT_URI`.
3. Put the client ID/secret in `backend/.env` as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
4. Same connect flow as Zoom.

None of these are required to run the app — a consultant who hasn't connected Zoom/Google simply can't offer those as consultation modes (enforced at booking time), and in-app video works regardless.

### Create an admin account

Public sign-up deliberately refuses `role: ADMIN` (see `auth.service.ts`), so admins are provisioned via a CLI script instead:

```bash
cd backend
npm run create-admin -- admin@advizlo.com "somePassword123" "Admin Name"
```

Log in with those credentials at `/login` (web) — you'll land on `/admin` instead of the regular dashboard. On mobile, log in the same way and you'll land on the Admin screen.

## 4. Web app setup

```bash
cd web
cp .env.local.example .env.local
npm install
npm run dev
```

Visit `http://localhost:3000`. Sign up as either a client or consultant, and you'll land on a dashboard that confirms your session/JWT round-trip works.

## 5. Mobile app setup

```bash
cd mobile
npm install
npm run start
```

Scan the QR code with Expo Go. **Important:** if testing on a physical device, `localhost` in `app.json` (`expo.extra.apiUrl`) won't reach your dev machine — replace it with your machine's LAN IP, e.g. `http://192.168.1.20:3001`, or run `expo start --tunnel`.

## 6. Repo structure

```
advizlo/
├── backend/            NestJS API
│   ├── prisma/
│   │   ├── schema.prisma   ← full data model (all entities, not just auth)
│   │   └── seed.ts
│   └── src/
│       ├── auth/           registration, login, JWT, role guards
│       ├── users/           profile endpoint
│       ├── categories/      public category list
│       ├── consultants/     profile, pricing (service types), availability + public browse
│       ├── bookings/        slot computation, booking creation, commission calc, cancellation
│       ├── payments/        Stripe Connect onboarding, Checkout Sessions, webhook
│       ├── admin/           verification approval, commission overrides, stats, oversight
│       ├── video/           Daily.co rooms, Zoom OAuth, Google Meet OAuth, central dispatcher
│       └── prisma/          DB service, injected everywhere
├── web/                 Next.js
│   └── app/{login,register,dashboard,onboarding/{profile,pricing,availability,payouts,video},browse,consultants/[id],bookings,admin/{consultants,categories,bookings}}/
├── mobile/              Expo/React Native
│   └── src/{screens,screens/onboarding,navigation,lib}/
└── packages/shared/     types shared conceptually between web + mobile
```

## 7. What's already designed but not yet wired up

The Prisma schema already includes a `Review` model — the full data model from the product spec — so reviews are the only remaining additive slice.

**Since `schema.prisma` changed again in this slice** (added six OAuth token fields to `ConsultantProfile` for Zoom/Google), re-run `npm run prisma:migrate` in `backend/`.

## 8. Pricing model, concretely

A consultant can:
- Create multiple **service types** (e.g. "Initial Consultation", "Follow-up", "Document Review"), each with its own duration, price, currency, and allowed consultation modes.
- Set a service type's price to `0` to make it free — the API forces `price = 0` server-side whenever `isFirstFree` is true, so the UI can't accidentally submit a mismatched price.
- The common "free first, paid after" pattern is modeled as **two separate service types** (a free "Initial Consultation" + a paid "Follow-up") rather than a hidden per-client counter — simpler to reason about and lets the consultant control it explicitly. If you'd rather enforce "free only on a client's literal first booking with this consultant" automatically, that logic belongs in the booking-creation flow and would check booking history before allowing the discount.

## 9. Booking flow, concretely

1. Client browses `/browse`, filters by category, taps into a consultant's profile.
2. Client picks a **service type** (which determines price + duration + which consultation modes are offered for it).
3. Client picks a **consultation mode** from the ones that service type supports (in-app video, Zoom, Google Meet, phone, in-person). If in-person, the consultant's address (set during onboarding) is shown.
4. Client picks a **date**, and the backend computes real open slots: weekly recurring `Availability` rules for that day of week, minus one-off blocked overrides, minus times that overlap an existing booking, minus times already in the past today. See `bookings.service.ts` → `getAvailableSlots`.
5. On booking creation, the backend **re-validates the slot is still open** (prevents race conditions / stale slots) and computes:
   - `priceCharged` = the service type's price at booking time (frozen — later price changes don't affect existing bookings)
   - `commissionAmount` = `priceCharged × COMMISSION_RATE` (flat platform rate for now; per-category/per-consultant overrides are an admin-module feature, not built yet)
   - `status` = `CONFIRMED` immediately if price is `0`, otherwise `PENDING` until the payments slice adds real payment capture
6. `meetingLink` is left `null` for video-based modes for now — populated once the video-integration slice exists. `address` is filled in immediately for in-person bookings since it doesn't depend on payment or video setup.

**Known simplification:** availability/booking times are treated as naive UTC rather than converted through each consultant's stored timezone. Worth fixing before real users across timezones use this — flagged with a comment at the top of `getAvailableSlots` in `bookings.service.ts`.

## 10. Payments, concretely

- **Consultant payouts** use Stripe Connect **Express accounts**. A consultant clicks "Connect with Stripe" (in onboarding step 4, or later from their dashboard), the backend creates the Express account on first use and stores its ID on `ConsultantProfile.payoutAccountId`, then redirects to a Stripe-hosted onboarding link for identity verification and bank details.
- **Client payment** uses a Stripe **Checkout Session** (`mode: 'payment'`) rather than raw Payment Intents — less code, Stripe hosts the whole card-entry UI. The session is created with `payment_intent_data.application_fee_amount` (the commission) and `transfer_data.destination` (the consultant's connected account) — Stripe handles the actual split at settlement time, so the platform never has to move money manually.
- **Confirmation** happens via the `/payments/webhook` endpoint listening for `checkout.session.completed`. On that event, a `Payment` row is created (`amount`, `platformFee`, `consultantPayout`, `providerTxnId`) and the `Booking` status flips from `PENDING` to `CONFIRMED`. The handler is idempotent (checks for an existing `SUCCEEDED` payment first) since Stripe can retry webhook delivery.
- **Why the raw body matters:** Stripe signs the webhook payload, and verifying that signature requires the exact original bytes — not Nest's parsed JSON. `main.ts` installs a custom `express.json()` middleware with a `verify` callback that stashes the raw buffer on the request specifically so `payments.controller.ts` can pass it to `stripe.webhooks.constructEvent()`.
- **What's not built yet:** dispute handling beyond the cancel-triggered refund covered in section 13 below.

## 11. Admin & commission overrides, concretely

- **Verification:** every new consultant starts `verificationStatus: PENDING` and is invisible in public Browse (`GET /consultants` filters to `APPROVED` only). An admin approves or rejects from `/admin` (pending queue) or `/admin/consultants` (full list, any status, reversible). This closes the loop the product spec's platform-provider section called for — no more manually flipping status in Prisma Studio.
- **Commission resolution order:** `consultant.commissionRateOverride` → `category.commissionRateOverride` → the platform-wide `COMMISSION_RATE` env default. Implemented in `bookings.service.ts` → `resolveCommissionRate`, called at booking-creation time so each booking freezes in the rate that applied when it was made (changing a rate later doesn't retroactively touch past bookings — same principle as `priceCharged`).
- **Stats** (`GET /admin/stats`) are computed on read rather than maintained as running counters — fine at MVP scale; worth revisiting (e.g. materialized views, a nightly rollup job) if the bookings table gets large.
- **What's admin-only vs web-only:** the mobile Admin screen covers verification approval and stats (the highest-value, most time-sensitive admin action); category/consultant commission-override editing is web-only for now since it's a low-frequency task better suited to a table UI than a phone screen.

## 12. Video integration, concretely

- **Daily.co (`IN_APP_VIDEO`)** needs no per-consultant setup — one platform API key creates a room per booking. Rooms are time-boxed (`nbf`/`exp`) to open 10 minutes before the appointment and auto-expire an hour after it ends, so there's no manual cleanup job.
- **Zoom and Google Meet** both use a real OAuth authorization-code flow — each consultant connects *their own* account (from the optional 5th onboarding step, `/onboarding/video`), and meetings/events are created under their name, not the platform's. Access tokens are refreshed on demand (`ensureZoomAccessToken` / `ensureGoogleAccessToken`) using the stored refresh token; Zoom rotates its refresh token on every use, which the code accounts for.
- **The OAuth `state` problem:** Zoom/Google redirect the consultant's *browser* straight to our callback URL with no Authorization header attached, so the JWT guard can't identify who's connecting. `video.service.ts` signs a short-lived (10 min), HMAC-verified `state` string when the connect flow starts and verifies it on the way back — see `signState`/`verifyState`.
- **When the meeting link actually gets created:** immediately (synchronously, before the API responds) for a free booking that's confirmed on the spot, or from the Stripe webhook right after a paid booking's payment succeeds. Both paths call the same `VideoService.confirmMeetingForBooking`, which is idempotent and swallows provider errors (logs and leaves `meetingLink` null) rather than blocking booking creation or payment confirmation on a video-provider outage. The UI shows "meeting link pending" in that case rather than a broken link.
- **What's intentionally simple:** joining a call is a plain link (`target="_blank"` on web, `Linking.openURL` on mobile) rather than an embedded in-app player. Daily rooms are perfectly usable directly in a browser tab; a true embedded WebView experience on mobile would need camera/microphone permission plumbing (`react-native-webview`, iOS `NSCameraUsageDescription`/`NSMicrophoneUsageDescription`, Android runtime permissions) that's real but fiddly to get right without a device to test on — noted here as the natural next step rather than half-built now.

## 13. Refunds, concretely

- **Eligibility mirrors the product spec's own edge-case list almost exactly:** a client-initiated cancellation is refunded only if it clears the consultant's `cancellationPolicyHours` window ("no-show by client → consultant may still get paid, commission still applies"); a consultant-or-admin-initiated cancellation is *always* refunded ("no-show by consultant → client gets a refund"). See the comment above `cancelBooking` in `bookings.service.ts`.
- **The Stripe mechanics:** because the original payment used `transfer_data` + `application_fee_amount` (separate charges and transfers, not destination charges), a plain refund on the PaymentIntent would refund the client but leave the money sitting in the consultant's connected account and leave the platform's fee uncollected-back. `PaymentsService.refundPayment` passes `reverse_transfer: true` and `refund_application_fee: true` to actually unwind both sides.
- **Known failure mode:** reversing a transfer requires the consultant's connected account to have sufficient balance. If they've already been paid out to their bank, the refund call fails with a clear Stripe error, the booking still ends up `CANCELLED`, but the client isn't actually refunded — there's no automatic retry or admin alert for this yet. Worth hardening (e.g. an admin-facing "refund failed" queue) before this handles real volume.
- **Admins can now cancel any booking** (`cancelBooking` accepts an admin caller, not just the client/consultant on the booking) as a first pass at the "dispute resolution" tooling the product spec mentioned — treated the same as a consultant-initiated cancellation (always refunded).
- **Not handled:** partial refunds, and disputes raised *after* a booking is marked `COMPLETED` (the admin stats query already excludes non-`CONFIRMED`/`COMPLETED` bookings from GMV/commission totals, so a cancelled-and-refunded booking naturally drops out of those numbers — no extra bookkeeping needed there).

## 14. Security fixes worth knowing about

While wiring the two slices above, I found and fixed two related bugs from Prisma's `include` returning *every* scalar field on a related model rather than just what's needed:

- **`passwordHash` leak (pre-existing since slice 3):** `listMyBookingsAsClient`, `listMyBookingsAsConsultant`, and the booking-creation response all used `include: { user: true }` / `include: { client: true }` somewhere in their relation chain, which meant the bcrypt hash of a consultant's or client's password was being returned in plain API responses. Fixed with explicit `select` clauses everywhere a `User` or `ConsultantProfile` is nested inside anything returned to a client (see `getBookingForParticipant` in `bookings.service.ts`, and the equivalent fixes in `consultants.service.ts`).
- **OAuth token leak (introduced by this slice, caught before it went out):** the same `include`-without-`select` pattern meant the new `zoomAccessToken`/`zoomRefreshToken`/`googleAccessToken`/`googleRefreshToken` fields were reachable through the public `GET /consultants` / `GET /consultants/:id` endpoints and through a consultant's own profile responses. Fixed the same way.
- **Takeaway for future fields:** any new field added to `User` or `ConsultantProfile` needs a conscious decision about whether it's safe to expose — `include` is not a safe default once a model holds secrets. `consultants.service.ts` now has a shared `publicConsultantSelect` for the two public browse methods specifically so this doesn't drift again.

## 15. The consultant settings hub — what was broken, what I fixed

This slice (`web/components/ConsultantNav.tsx` + `web/app/settings/{profile,availability,bookings,payments}/page.tsx`) wasn't built by me — it was started in an earlier session, continued locally on a different machine, and handed back to me as a zip upload mid-way through. Here's what that means concretely:

**What was already there and working well:**
- `settings/bookings` — a proper "Upcoming meetings" page for consultants (upcoming vs. past, cancel with confirmation)
- `settings/availability` — a nicer, day-grouped rewrite of the availability manager
- `settings/payments` — a real earnings dashboard (gross vs. net vs. commission, per-booking breakdown) — genuinely more polished than anything in the onboarding flow
- `settings/profile` — editable name/phone/bio/credentials

**What was broken (the app wouldn't build):**
- `ConsultantNav.tsx` had a syntax error — the opening JSX tag's element name was missing entirely (just bare attributes where `<a` should have been). Since `dashboard/page.tsx` already imported and rendered `<ConsultantNav />`, this broke the dashboard and all four settings pages — effectively the entire consultant experience.
- `settings/profile` called `api.updateMe(...)` and read `user.phone`, but neither existed yet: no `PATCH /users/me` endpoint on the backend, no `updateMe` method in `lib/api.ts`, and `phone` wasn't on the `AuthUser` type or returned by `/auth/me`.
- The nav bar was missing a link to Pricing (`/onboarding/pricing`) — every other onboarding step had a settings-page equivalent or a nav link except this one, so it looked like an oversight rather than intentional.

**What I fixed:**
- Restored the missing `<a>` tag in `ConsultantNav.tsx`.
- Added `PATCH /users/me` (backend: DTO + service method + controller route) to update `fullName`/`phone`, and added `phone` to the JWT-validated user object (`jwt.strategy.ts`) so `/auth/me` actually returns it.
- Added `api.updateMe()` and `phone?: string` to `AuthUser` in `web/lib/api.ts`.
- Added a Pricing link to `ConsultantNav`, pointing at the existing `/onboarding/pricing` page (already a fully functional service-type manager, not just a wizard step — no new page needed).
- Verified all of this for real: your uploaded `node_modules` still had platform binaries cached, so I ran `npx tsc --noEmit` across both `backend/` and `web/` — zero errors. A full `next build` couldn't complete in this sandbox (it wants to download a Linux-native SWC binary, blocked by this environment's network restrictions, since your `node_modules` was populated on macOS) — but the complete type-check passing is strong evidence it's sound, and it'll build normally on your machine.

**Two things worth knowing, not fixed (out of scope for "get it working again"):**
- The settings pages don't check role — a CLIENT or ADMIN who navigates to `/settings/*` directly would see a consultant-oriented nav bar. It won't leak data (the backend still guards each endpoint by role, so a non-consultant just sees empty lists), but it's not a clean experience. Worth adding a role check + redirect if this becomes user-facing for non-consultants.
- Mobile has no equivalent of this settings section — the nav-bar/settings pattern is web-only. The mobile app still uses the older onboarding-flow-as-management-pages pattern from earlier slices.

**One more thing I noticed:** your uploaded `web/.env.local` contains a `VERCEL_OIDC_TOKEN` (Vercel CLI auth for your deployment). It's a short-lived token and — based on the timestamps in it — already expired by the time you uploaded it, so no action needed. But as a general habit, it's worth keeping `.env*` files out of anything you zip up or share (your `web/.gitignore` already excludes them from git, which is correct — this only showed up because zipping a folder doesn't respect `.gitignore`). This delivered zip does not include it; running `vercel env pull` (or just `vercel dev` once) will regenerate it.
