# TradeLearnIndia UI and payment fix report

Date: 2026-10-11. Scope: local source and mocked tests only. No deployment, live migration, live order, or payment was made.

## Confirmed findings

- The authoritative source in `lib/course-pricing.ts` had `COURSE_PRICE_INR = 1`. Header, hero, and checkout CTA derived from it, while the checkout summary, SEO text, terms, and other copy said ₹499. The server also derived its order amount from ₹1, so the mismatch affected payment creation.
- The existing create-order route collapsed configuration, rate limit, Razorpay, and Supabase failures into the same HTTP 500 and message. This prevented identifying the failing stage in production.
- The route did not verify that `record_course_payment_v2` returned a persisted row. A successful HTTP response with an empty result could have opened an unrecorded order.
- Several sales-page prices were hardcoded, making a later mismatch likely. The pricing card and checkout details had cramped spacing and duplicated payment copy.
- A single button used a ref to stop repeat clicks, but the page renders multiple checkout buttons; another button could start a second order while checkout was open.

## Changes

- Set the standard and test-mode course price to the same shared ₹499 configuration (49,900 paise). Public price, order creation, checkout amount validation, terms, SEO description, and social image now derive from this configuration. No client amount is accepted.
- Create-order now checks required configuration, price and mode, rate limiting, Razorpay response identity/amount/currency, and Supabase persistence. It returns 403 for invalid origin, 429 for rate limit, 502 for provider failure, and 503 for missing configuration or database failure. Safe responses include a request ID.
- Structured `CHECKOUT_DIAGNOSTIC` logs distinguish configuration, rate limit, provider, and database stages. Logs contain the request ID, stage, outcome, status or elapsed time; they omit credentials, payment IDs, order IDs, and customer data. If configuration is missing, only variable names are logged.
- Added a shared client checkout lock across all rendered buttons, a loading state during order creation and checkout, payment-failure messaging, a safe retry path for pre-payment failures, and a pending state that directs charged users to recovery rather than another payment attempt.
- Reworked the pricing card hierarchy, typography, spacing, consent controls, policy summary, and mobile padding. Updated hero layout and responsive final CTA. Removed unused countdown and offer-deadline support.
- Preserved server-side signature checks, provider lookups, captured-only access grants, webhook signature validation, idempotent database writes, and recovery controls.

## Production 500: confirmed versus unverified

The local `.env.local` contains entries for `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `APP_BASE_URL`. It lacks `COURSE_ACCESS_SECRET` and `RAZORPAY_WEBHOOK_SECRET`. These observations disclose presence only. The missing access secret makes **local** create-order fail during rate limiting, before Razorpay; the webhook secret is needed for webhook processing, not order creation. The remote migration was reported applied by the owner but was not independently queried.

The **production** failing operation is not confirmed. Vercel runtime logs and production environment settings were inaccessible, so a production configuration, rate limit RPC, Razorpay, or Supabase write failure remains possible. After deployment, use the returned request ID to locate `CHECKOUT_DIAGNOSTIC` and identify the stage. Confirm the production values and permissions without exporting secrets. A successful 200 order response must be checked against the Razorpay test dashboard and its corresponding Supabase pending row.

## Tests

- `npm run lint`: pass.
- `npx tsc --noEmit`: pass.
- `npm run build`: pass.
- `npm test`: pass with mocked provider/database paths, including ₹499 order payload, ignored client amount, missing configuration, provider failure, database failure and empty persistence, captured-only verification, duplicate webhook idempotency, and recovery.
- No browser automation or usable production screenshot was available. The production URL was inaccessible through the available web tool. Visual behavior at 320, 375, 390, 768, 1024, 1440, and 1920 px needs a real-browser review; before-and-after screenshots could not be captured.

## Files changed

`lib/course-pricing.ts`, `lib/course-page-data.ts`, `lib/course-access.ts`, `app/api/razorpay/create-order/route.ts`, `components/RazorpayCheckoutButton.tsx`, `components/CourseLandingPage.tsx`, `components/CourseLandingPage.module.css`, `components/CourseInteractions.tsx`, `app/terms/page.tsx`, `app/courses/opengraph-image.tsx`, `tests/compliance.test.mjs`, and `tests/security.test.mjs`.

## Production readiness checklist

- [x] One source for ₹499 and 49,900 paise; server ignores client amounts.
- [x] Persist order before returning it to the browser.
- [x] Only captured provider payments can grant access; duplicate callbacks remain idempotent.
- [x] Safe stage-specific order diagnostics and request IDs.
- [x] Local lint, typecheck, build, and mocked tests pass.
- [ ] Review the rendered page at the seven requested viewport widths and capture screenshots.
- [ ] Verify Vercel production environment variable presence and mode, including `COURSE_ACCESS_SECRET` and `RAZORPAY_WEBHOOK_SECRET`, without exposing values.
- [ ] Inspect a production request ID in Vercel logs to establish the actual 500 cause.
- [ ] Run an isolated Razorpay test-mode order and captured-payment flow against a test Supabase project; confirm 49,900 paise and webhook/recovery behavior. Do not use a live customer payment.
- [ ] Confirm the published terms, refund policy, delivered 11 videos, and Drive permissions with the owner.
