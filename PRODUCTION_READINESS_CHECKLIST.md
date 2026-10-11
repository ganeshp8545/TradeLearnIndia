# TradeLearnIndia production readiness checklist

**Review date:** 11 October 2026
**Decision:** **BLOCKED for production deployment and Meta ad resubmission.** This is a read-only review of the current Git diff, repository, and `META_ADS_COMPLIANCE_REPORT.md`. The only file created during this review is this checklist. No application code, payment, database record, deployment, or ad was changed.

The prior report accurately records passing local TypeScript, lint, six focused tests, production build, and a local 308 redirect. Those checks do **not** demonstrate an end-to-end payment, recovery, Drive, mobile, or production-domain flow. The tests in `tests/compliance.test.mjs` mostly inspect source text; their signature checks are meaningful but they do not exercise Razorpay or Supabase integration.

## Status by requested area

| Area | Status | Finding |
| --- | --- | --- |
| Lifetime access and recovery | **BLOCKER** | Purchase records persist, but links/sessions expire, recovery is not exposed in the UI, and sending a replacement link clears the current session before email delivery succeeds. No durable recovery procedure was verified. |
| Legal seller and policies | **BLOCKER** | About/Contact explicitly say the legal seller, address and grievance details need verification. Terms, Privacy and Refund pages visibly call themselves drafts. |
| Razorpay ₹499 and test mode | **BLOCKER** | Server order amount is correctly fixed at 49,900 paise, but callback verification grants access to merely `authorized` payments. No test-mode end-to-end transaction was performed. Local `.env.local` has a live-key prefix and no `COURSE_TEST_MODE` entry; values were not disclosed or used. |
| Supabase compatibility | **BLOCKER** | Migration state and historical data were not checked against a running database. The source-only compatibility test does not prove old purchases or recovery work. |
| Google Drive delivery and backup | **BLOCKER** | Only the URL's HTTPS Google Drive hostname is validated. File inventory, sharing permissions, owner account, backups and restoration have not been verified. |
| Production variables and security | **BLOCKER** | Vercel runtime variables and their mode/target alignment are unknown. Recovery endpoint lacks throttling and exposes distinguishable payment states. |
| Vercel deployment | **BLOCKER** | No project/deployment configuration or dashboard state is available in this checkout. Read-only requests for `market.campusedux.com` failed DNS resolution from this environment; this is not proof of a global outage. |
| Mobile and accessibility | **BLOCKER** | The final CTA now renders multiple bare siblings in a flex row; policy links in dark sections have no contrast-aware color. No browser or assistive-technology QA was performed. |
| Meta ad/site consistency | **WARNING** for the site; **BLOCKER** before ad resubmission | Repository copy aligns with 11 videos/₹499/lifetime terms, but delivered video inventory, actual ad creative, checkout, and live destination have not been compared. |

## Blocking corrective actions and release evidence

### B1 — Grant access only after captured payment

**Evidence:** `lib/course-access.ts:284-303` treats Razorpay `authorized` or `captured` as `success` and grants access. The webhook accepts `payment.captured` for success. Razorpay distinguishes `authorized` from `captured` and advises delivery only after capture in its [Standard Checkout integration guide](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/).

**Steps:**

1. Change callback verification so `authorized` remains pending and does not set `course_access_granted` or issue a token. Grant only after a fresh Razorpay API read confirms `captured`, or after a verified `payment.captured` webhook followed by reconciliation.
2. Confirm the merchant's automatic capture setting or documented manual capture process in the appropriate Razorpay mode.
3. Add mocked tests for `authorized`, `captured`, `failed`, and an uncaptured payment that later changes state. Confirm neither the return page nor the webhook grants access early.
4. Run a complete **test-mode** payment and confirm Razorpay's captured state, one Supabase success record, and exactly one usable access path. Keep the live account untouched.

**Exit:** A merely authorized payment never unlocks content; a captured ₹499 test payment does.

### B2 — Make lifetime recovery dependable and non-disruptive

**Evidence:** `lib/course-access.ts:392-429` clears the existing session and replaces the token **before** Resend confirms delivery. `app/api/course-access/request/route.ts:6-25` requires order ID and checkout email, has no visible recovery form or throttling, and returns distinct payment states. The local environment has no Resend variables; production state is unknown. The 24-hour session and 30-minute emailed link are credentials, not the lifetime entitlement.

**Steps:**

1. Define an owner-operated recovery process for lost order IDs, changed email/device, inaccessible mailbox and Drive migration, with staff responsibility and support response handling.
2. Make token issuance transactional or otherwise ensure a failed email does not revoke a valid session; reissuance should not invalidate other active access until successful verification. Rate-limit recovery requests and give a privacy-preserving response.
3. Provide a visible recovery path from the access error page and purchase confirmation, with a secure identity check; document how existing customers obtain their order reference.
4. Verify Resend sender-domain ownership, production `RESEND_API_KEY`, `COURSE_ACCESS_FROM_EMAIL`, actual inbox delivery, expired-link retry, lost-device recovery and support escalation using isolated test records.

**Exit:** An existing purchaser can recover access on a new device without staff improvisation, and email failure cannot strand an active purchaser.

### B3 — Approve and publish real seller and policy details

**Evidence:** `app/about/page.tsx:8-9` and `app/contact/page.tsx:7-10` retain owner-verification notices. `app/terms/page.tsx`, `app/privacy-policy/page.tsx`, and `app/refund-policy/page.tsx` display draft subtitles. The report itself flags legal review. The checkout says the merchant is CampusEduX, but the legal seller behind that label is unverified.

**Steps:**

1. Owner supplies the exact legal seller name, verified business address where required, support/grievance contact, merchant descriptor, tax details if applicable, and confirms that the published email and WhatsApp channel are monitored.
2. Have qualified Indian counsel review the lifetime-access, digital refund/cancellation, consumer-remedy, privacy, retention and grievance language. Decide the process for cancellations before access and approved refunds.
3. Replace draft/owner-action text on customer-facing pages with approved facts and record approval date/version. Match legal seller, brand, Razorpay merchant display and support channels across checkout and policies.
4. Re-check all policy and footer links in a production-like preview.

**Exit:** The public pages contain approved, accurate seller and policy information with no draft notices or unresolved placeholders.

### B4 — Establish a safe ₹499 test environment before integration testing

**Evidence:** `app/api/razorpay/create-order/route.ts:13-59` uses trusted `getCoursePricePaise()` and records a pending order. `lib/course-access.ts:18-30` distinguishes test/live key prefixes. A names-and-prefixes-only inspection found the local key has a **live** prefix, `COURSE_TEST_MODE` is absent, and the local file has no Resend keys. No order-creation endpoint was called during this review. Razorpay's [test-mode guide](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/) says test keys and mock payment details must be used for simulation.

**Steps:**

1. Create isolated test Razorpay keys and webhook secret, a separate test Supabase project or isolated records, and a test Drive destination. Set `COURSE_TEST_MODE=true` only in that environment and verify `rzp_test_` key prefix without printing key values.
2. Confirm the server creates exactly 49,900 paise INR and Razorpay Checkout shows **₹499 INR**, course title, merchant name and refund/terms links. Test success, failure, dismissal and duplicate clicks.
3. Verify server signature checks, webhook signature/event delivery, callback/webhook races, payment record idempotency, email delivery and access recovery. Do not point test webhooks at production data.
4. Review live-mode settings separately only after test evidence is complete; verify production uses the intended live key pair and `COURSE_TEST_MODE=false` without creating a live order during readiness review.

**Exit:** A documented, isolated test-mode walkthrough passes, and production variables are independently checked for correct mode and amount.

### B5 — Verify Supabase schema and historical entitlements

**Evidence:** Source migrations define payment rows, a `security definer` recording function and access hashes. `202610050003_course_payments_standard_checkout.sql` backfills slug/currency for some legacy rows; `202610060001_course_payment_whatsapp.sql` replaces the payment RPC. `lib/course-access.ts:219-230` now checks success/access/amount for token lookup but no course slug, while callback and webhook demand a matching slug. The prior test merely searches for `LEGACY_COURSE_NAME` in source.

**Steps:**

1. In a read-only database review, compare applied migrations and the actual `record_course_payment` signature, indexes, row-level security grants and nullable columns with the repository's latest migration. Do not run migrations or write production rows in this review.
2. Audit historical course rows by course name, slug, currency, amount, order ID, payment status and entitlement. Specifically identify null slugs/currency, non-₹499 legacy payments, missing emails and duplicate payment identifiers. Do not export personal data into the report.
3. Decide the compatibility rule for old purchases and other courses. Restrict token/session lookups to the intended entitlement identity while preserving legitimate historical rows; do not couple lifetime access to today's sale price if earlier prices existed.
4. Test old-name purchase, existing token/session, webhook arrival order, recovery reissue and replay/duplicate payment paths in an isolated database snapshot or fixtures.

**Exit:** Every valid historical purchaser remains eligible and no unrelated payment can unlock this course.

### B6 — Prove Drive delivery and a replacement path

**Evidence:** `lib/course-access.ts:8-15` checks only `https://drive.google.com`; `app/course-access/redirect/page.tsx` sends the browser to that configured destination. The repository has no file inventory or backup manifest. Google's [Drive sharing guidance](https://support.google.com/drive/answer/7166529?hl=en) states that “Anyone with the link” allows anyone holding it to open the item; restricted sharing may prevent a purchaser from opening it.

**Steps:**

1. Owner verifies the configured Drive folder contains the promised eleven playable videos matching the listed curriculum, with correct permissions for a fresh purchaser on desktop and mobile.
2. Choose and document the access model: if link-shared, acknowledge that the destination can be forwarded; if restricted, document and test how each purchaser gets Drive permission after payment and after account changes.
3. Maintain an owner-controlled backup of all video files, a manifest/checksum or equivalent inventory, and a tested restore or platform-migration procedure. Confirm the Drive account and backup survive staff/account changes.
4. Test delivery after an expired session, a new browser, a moved file, a revoked share and a temporary Drive outage in a non-production setup.

**Exit:** A verified purchaser can open all eleven videos and the owner can restore delivery from backup without losing entitlements.

### B7 — Confirm production Vercel domain, deployment and secrets

**Evidence:** This checkout has no tracked Vercel config or linked project identity. Both web access and a read-only `curl` check could not reach `market.campusedux.com` from this environment; `curl` reported DNS resolution failure even when retried outside the sandbox. The earlier local build returned 200 for `/courses` and 308 for the legacy route, which does not prove the production domain. Vercel [separates Preview and Production variables](https://vercel.com/docs/environment-variables), and changes apply to new deployments.

**Steps:**

1. In the Vercel dashboard, identify the exact project, production branch, currently served deployment ID/commit, custom domain, DNS records, build command, Node runtime and rollback target. Confirm the domain is publicly resolvable from an independent network and that Meta's destination URL is reachable without authentication.
2. Audit **names, presence, scope and mode** of `APP_BASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `COURSE_TEST_MODE`, `COURSE_DRIVE_URL`, and conditional Resend variables in Production and Preview. Never paste values into logs or this report; keep service-role and payment secrets server-side.
3. Verify webhook URL/events in the appropriate Razorpay mode and that `APP_BASE_URL` is the same public origin used by access emails and origin checks. Confirm any Meta Pixel/tag manager added outside Git is reflected in privacy wording.
4. Prepare a preview and inspect its exact commit before any owner-approved production action. On eventual release, verify public 200/308 responses, no redirect loop, checkout/policy links, canonical/Open Graph/sitemap, and record a rollback plan. Vercel documents [preview deployments](https://vercel.com/docs/deployments/environments) and [rollback behavior](https://vercel.com/docs/deployments/promoting-a-deployment).

**Exit:** The owner can identify and reach the intended public deployment, all required runtime variables are verified without disclosure, and rollback is ready.

### B8 — Fix and test mobile checkout disclosure and accessibility

**Evidence:** `components/CourseLandingPage.tsx:136` places the fragment returned by `RazorpayCheckoutButton` directly inside `.finalCtaInner`, which is a desktop flex row (`CourseLandingPage.module.css:159-164`); its summary, checkbox and button become separate siblings. Policy links in the dark hero and final CTA have no local link color rule; a typical browser blue against `#102a40` has about **1.6:1** contrast. The exact browser color requires a rendered check. [WCAG 2.2 contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) sets 4.5:1 for normal text.

**Steps:**

1. Wrap the final CTA checkout summary, checkbox and button in one layout container and style it for 320/375/768/desktop widths.
2. Set explicit, readable link colors for dark backgrounds and verify computed contrast in a browser. Preserve visible focus, label association, keyboard tab order and screen-reader announcements.
3. Check the hero, final CTA, sticky CTA and footer for overflow/overlap, 200% text zoom, keyboard-only checkout, disabled-state explanation and responsive Razorpay modal behavior on real/mobile emulation. Confirm all required policy text is visible before payment.

**Exit:** A mobile user can read the refund and terms links, acknowledge them and complete test checkout without clipping or inaccessible controls.

## Meta ad consistency gate

**Current repository status: READY for copy review.** The course page and metadata state eleven pre-recorded lessons and ₹499, link to refund/lifetime terms, and include an educational risk disclaimer. The old discount/duration copy is absent from active course source. The actual Drive videos and the ad creative were not supplied for comparison, and the live landing page was unreachable here.

Before resubmitting an ad, compare the exact ad image, text, CTA and destination with the **deployed** page, checkout and policies. Verify the eleven files and topic list, avoid profit/return guarantees, fabricated discounts, scarcity or credentials, and confirm the landing page is publicly reachable. Meta says ad review considers the ad, landing page and advertiser identity in its [advertising principles](https://about.fb.com/news/2017/11/our-advertising-principles/). Approval remains Meta's decision.

## Ready items and warnings

| Status | Item |
| --- | --- |
| **READY** | Server-side order creation fixes the sale amount to ₹499 INR and does not read a client amount (`app/api/razorpay/create-order/route.ts`). |
| **READY** | Signature verification exists for callback and webhook; test coverage checks valid and tampered HMACs. |
| **READY** | Repository has a canonical `/courses` page, sitemap entry and a local 308 legacy redirect. |
| **READY** | `.env.local` is ignored by Git and no secret value was printed in this review. |
| **WARNING** | There is no demonstrated integration test against Razorpay test mode, Supabase and Resend; the six existing tests are insufficient as a release gate. |
| **WARNING** | Order creation and recovery routes have no apparent application-level throttling. Add abuse controls and monitor failures before ad traffic. |
| **WARNING** | The public privacy text says no Pixel was found “in this repository”; check Vercel injections, tag managers and ad account setup before asserting actual site behavior. |
| **WARNING** | The earlier `META_ADS_COMPLIANCE_REPORT.md` should be read with this checklist: it describes implemented copy and local checks, not proof of captured-payment gating, dependable lifetime access, legal approval or live deployment. |

## Owner sign-off checklist

- [ ] B1 captured-only entitlement demonstrated in test mode.
- [ ] B2 recovery and support process demonstrated after session expiry, device change and email failure.
- [ ] B3 legal seller, address/contact where applicable, and policies approved by owner and counsel.
- [ ] B4 isolated Razorpay test-mode ₹499 flow passed; production mode independently checked.
- [ ] B5 production Supabase schema and historical entitlements audited read-only; compatibility tests passed in isolation.
- [ ] B6 eleven Drive files, permissions, backup and restore verified.
- [ ] B7 Vercel project, public domain, environment variables, webhook and rollback verified.
- [ ] B8 mobile and accessibility QA passed.
- [ ] Exact Meta creative and live landing page checked together before ad resubmission.

**Release rule:** Keep production deployment and Meta ad resubmission on hold until all eight blocking gates have evidence and the owner approves the release. This document does not authorize a commit, push, deployment, production-data change or live order.
