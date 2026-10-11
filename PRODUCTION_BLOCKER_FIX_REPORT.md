# TradeLearnIndia production blocker fix report

**Date:** 11 October 2026
**Project:** TradeLearnIndia by CampusEduX
**Deployment readiness: BLOCKED — local remediation is complete; release evidence and owner approvals remain outstanding.**

## Scope and evidence

Reviewed the working Git diff, `META_ADS_COMPLIANCE_REPORT.md`, `PRODUCTION_READINESS_CHECKLIST.md`, checkout components, all payment/access routes, environment template, and every Supabase migration. Existing uncommitted website and policy changes were preserved.

This report updates the technical conclusions of the earlier reports. Their six original checks did not establish capture-only access or dependable recovery. No commit, push, deployment, production database change, provider payment request, email send, or live transaction was performed. Database tests used disposable local PostgreSQL clusters with fabricated records and Unix sockets. Application tests used fake credentials and mocked network calls; they do not load `.env.local`. The production build loads local configuration but does not exercise the payment endpoints.

## Root causes and fixes

| Area | Root cause | Local correction | Release classification |
| --- | --- | --- | --- |
| Payment capture | The callback accepted `authorized` as success. | Shared server reconciliation verifies signature on callbacks, then fetches the actual Razorpay order and payment and requires exact IDs, expected amount, INR, course identity and `captured`. | **READY locally; BLOCKED on provider integration evidence** |
| Stored entitlements | A status-only RPC set the access flag; historical `success` could mean merely authorized. | Added `capture_verified_at`; restricted capture RPC; revoked application access to the old RPC and direct payment mutations. No automatic promotion of old success rows. | **READY locally; BLOCKED on approved migration and historical audit** |
| Duplicate callbacks/webhooks | Token replacement could strand users; payment writes could change a successful purchase's email. | Unique order/payment indexes plus transaction row locks; verified capture is immutable; callback retries reuse one session without extending expiry; webhook writes issue no credentials. | **READY locally** |
| Recovery | Distinct responses exposed purchase existence; no throttling; sending email overwrote active credentials. | Generic asynchronous response; durable database rate limits; independent, hashed, expiring recovery records; atomic single-use exchange; active sessions survive email failures and new-device recovery. | **READY locally; BLOCKED on sender/inbox/support verification** |
| Legacy access | Access depended on today's sale price; legacy success was not capture evidence. | Valid historical purchases use their stored price and known course title; missing slug/currency can be reconciled using trusted provider data. Existing unexpired raw links/sessions remain compatible after capture verification. | **READY for covered fixtures; BLOCKED on actual historical inventory** |
| Checkout accessibility | Checkout returned multiple flex siblings; feedback and modal-dismiss focus were incomplete. | One responsive checkout wrapper, explicitly underlined inherited-color links, associated checkbox label, loading announcements, disabled explanation, error focus and focus restoration. | **READY in source; BLOCKED on browser/assistive-technology QA** |
| Delivery | Code checked only the Drive URL, without proving videos, permissions or backup. | Assumptions and restoration procedure documented below. | **BLOCKED on owner delivery evidence** |

### Payment security details

- New orders remain **49,900 paise, INR** from server configuration. Client amounts are not accepted. `.env.example` now pairs the test key example with `COURSE_TEST_MODE=true`.
- Callback HMAC verification occurs before payment lookup/reconciliation. Both callback routes use the same service. Browser-submitted payment status is ignored.
- Webhook HMAC covers the raw request body. The event is a reconciliation trigger; the freshly fetched provider payment determines capture eligibility. A captured event with a provider state that is not yet eligible returns 503 for retry.
- `authorized`, `created`, `failed`, absent, unknown and mismatched payment data cannot issue new access. Late failed events cannot downgrade or replace a captured payment.
- Missing local pending records can be recovered only from a provider order with the expected course note, `course_` receipt, price/currency and captured payment. A guessed order or email cannot issue a browser session.
- Captured records are unique by order and payment. The RPC serializes racing writes and keeps the first verified capture timestamp, payment ID and purchase mailbox stable. There is no separate event ledger: replay safety comes from idempotent entitlement writes, and webhooks have no email/token side effect.
- Callback sessions are derived with a separate server secret, stored only as hashes, and expire 24 hours after verified capture. Replaying the callback cannot refresh them, including after expired credential rows are removed. After expiry, mailbox recovery is required.
- New recovery sessions last 24 hours from confirmation. The underlying purchased entitlement has no scheduled expiry. Existing sessions do not depend on today's sale price.
- Cookie responses contain only status and HttpOnly session cookies (`Secure` in production, `SameSite=Lax`, path `/`). No payment records or secrets are returned. Logs use generic failure/timing information.
- Provider and storage calls have 10-second timeouts. Dependency failures fail closed rather than inventing successful access.

Razorpay documents the distinction between authorization and capture and requires capture verification before delivery: [Standard Checkout integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/).

### Recovery behavior and security

1. On `/course-access`, enter the order reference and registered purchase email. The success page now displays the order reference to save.
2. Validly formatted requests receive the same HTTP 202 message, irrespective of purchase existence, payment state, account throttling or email delivery. Database lookup and email work occur after the response via Next.js `after`.
3. The server matches the stored mailbox, checks verified capture evidence and emails **that stored mailbox only**. Neither an order ID nor an email address is proof of access.
4. The email contains a random 256-bit token in a URL fragment. It is not sent in the initial HTTP request URL. The page removes the fragment from browser history after reading it.
5. The customer explicitly confirms access with a same-origin POST. GET requests, including legacy link redirects, do not consume tokens. Automated scanners that only fetch a link cannot consume it.
6. Recovery tokens expire after 30 minutes and can be consumed once. The transaction creates a session and consumes the token together. A failed transaction leaves the link usable. Separate devices can hold independent sessions.
7. Recovery email failure does not revoke working sessions or previously issued links. Request another email or use support if delivery does not complete.

Rate limits are stored atomically in Supabase, not process memory: recovery requests 10/IP/hour, 3/mailbox/hour; confirmation 30/IP/hour; checkout 15/IP/hour; payment verification 300/IP/hour. Each request class also has a global ceiling of 20 times its IP ceiling. Mailbox/IP identifiers are HMACed. Vercel's platform IP header is used only when `VERCEL=1`; other environments deliberately share one bucket until trusted ingress is configured. Exact-origin checks use `APP_BASE_URL` for checkout, verification and recovery.

**Operational limitations:** `after` is not a durable message queue. A terminated function or mail-provider failure can lose an email attempt; retries and support remain necessary. The request route sets a 120-second maximum duration, whose availability must be confirmed in the actual hosting plan. Logs must not capture request bodies, credentials, or legacy token query strings. The complete email flow and deliverability have not been tested against Resend. See [Next.js after](https://nextjs.org/docs/app/api-reference/functions/after) and [Vercel request headers](https://vercel.com/docs/headers/request-headers).

### Historical customer compatibility

- Recognizes the current and historical course names and rejects unrelated course identities.
- Keeps a legitimate recorded historical INR price, including the tested ₹299 fixture, instead of forcing ₹499.
- Existing success/access flags alone are insufficient. With no capture marker, the server re-fetches the original payment and order and persists evidence only after full validation. A temporary provider failure can temporarily prevent first-time historical reconciliation; previously verified entitlements remain usable with valid credentials.
- Old unexpired session cookies remain readable. Old raw links are exchanged atomically after verification. Recovery works after either credential expires when a verified purchase and registered mailbox are available.
- **BLOCKED:** Actual historical rows were not accessed. Missing payment/order IDs, missing mailboxes, unrelated or ambiguous course data, payment-link-only records, old merchant accounts inaccessible with current keys, refunds/disputes and mismatched provider records need an owner-approved reconciliation process. These rows are not silently granted or deleted. Do not bulk-mark old rows as captured.

## Supabase migration and release procedure

New migration: `supabase/migrations/202610110001_captured_access_recovery.sql`.

It adds capture evidence and its constraint, a credential table and expiry index, a rate-limit table, and five restricted RPCs. RLS is enabled on the new tables; public/anonymous/authenticated access is revoked. The application can read payment records server-side and use approved RPCs; it cannot directly write payment rows or call the old status-only RPC. Existing order/payment uniqueness remains in force. SECURITY DEFINER functions have an empty search path and explicit grants, consistent with [Supabase function guidance](https://supabase.com/docs/guides/database/functions).

**No migration was applied to hosted Supabase.** Required next steps, each subject to owner approval where it changes infrastructure/data:

1. Compare the hosted schema, migration history, RPC overloads, role memberships, RLS, constraints and unique indexes read-only against the repository. Inspect historical compatibility using aggregate results and restricted internal records; do not put personal data in this report.
2. Back up the database and rehearse all migrations in an isolated Supabase test project. The local PostgreSQL rehearsal validates SQL and concurrency, but not PostgREST RPC discovery, hosted role inheritance, service-key configuration or connectivity.
3. Verify the new RPC signatures via PostgREST in that test project; repeat callback/webhook races, credential exchange, and client-role denials through HTTP. Confirm no obsolete granted function overload can bypass capture verification.
4. Prepare a coordinated maintenance/release window and a captured-only rollback version. This migration intentionally revokes the old RPC and direct writes, so the old application cannot continue processing payments after it is applied. The new application needs the new schema. Do not run mixed versions against the database without a tested transition.
5. After explicit approval, apply the migration and switch to the approved application version together. Keep checkout unavailable during the transition; reconcile queued webhook events afterward. Preserve all payment/entitlement records.
6. Roll back application behavior only to a compatible captured-only revision. Do not restore the unsafe authorized-payment branch or automatically remove capture evidence/new tables. Any database restore requires a separate owner decision and reconciliation of purchases since the backup.
7. Schedule approved retention cleanup for expired credentials and rate-limit windows. Preserve payment/capture evidence needed for lifetime entitlement; confirm retention with legal review. Cleanup is not scheduled or run by this task.

## Drive delivery and outage runbook

**Code behavior:** `COURSE_DRIVE_URL` must be an HTTPS `drive.google.com` URL. After session verification, the browser is sent to that destination. The application does not inventory files, call the Drive API, grant Google-account permissions, monitor availability or maintain a backup.

**BLOCKED — required owner evidence:**

- Inventory the promised **11 playable videos**, matching each lesson title to its Drive file ID, file size, duration and checksum or equivalent backup identifier. Assign an account owner and backup custodian.
- Test the destination in a fresh browser, on mobile and with the intended Google-account state. Test all eleven files, not just folder visibility.
- Approve the delivery model. “Anyone with the link” permits forwarding; the website gate cannot prevent redistribution once the destination is known. Restricted Drive sharing requires a separately staffed/tested purchaser-permission process; this code does not automate it. [Google's sharing documentation](https://support.google.com/drive/answer/7166529?hl=en) describes these modes.
- Maintain a complete backup outside the serving Drive account, with access controlled by the business, recovery credentials and an inventory. Prove restoration to a second folder/account and playback before claiming backup readiness. Drive is not guaranteed permanent hosting.

**Replacement / outage procedure:**

1. Support confirms whether the fault is a payment/session issue, incorrect sharing, a missing file, quota/account access, or a provider outage. Avoid asking purchasers to pay again.
2. Keep the entitlement database and existing purchase references intact. Communicate a factual incident status through approved support channels; do not promise an unverified restoration time.
3. Restore the eleven files from the owner-controlled backup to a replacement Drive destination. Verify its inventory and access permissions using an isolated purchaser account/browser.
4. With owner approval, update `COURSE_DRIVE_URL` in the correct hosting environment and release the approved configuration. Existing entitlements resolve to the new destination on the next access request. Previously saved raw Drive URLs may remain stale; direct customers to `/course-access` and recovery.
5. Test access, all videos and email recovery after replacement; record incident, owner, validation and resolution. Migration to a non-Drive host requires a reviewed code change because the current allowlist accepts only Drive.

## Support process: missing order reference or lost mailbox

**BLOCKED until a named support owner approves and rehearses this process.**

- If the customer retains their registered mailbox, recover the order reference from the provider receipt or have authorized staff look up the purchase privately and send recovery only to the stored mailbox.
- If that mailbox is inaccessible, first ask the customer to use their email provider's account-recovery process. Do not change the purchase mailbox based on a supplied email, order ID, screenshot, phone number or payment ID alone.
- Escalate unresolved cases to an authorized staff member. Correlate the captured transaction in the merchant dashboard with the original purchase record and independent proof of control of the original payer/payment source, using the provider's support/dispute channel where necessary. Do not request full card details, CVV, passwords, PINs or OTPs.
- Record the case and verification basis, get owner approval for any mailbox change, notify the old mailbox when possible, and verify possession of the new mailbox before releasing access. If ownership cannot be established, do not transfer access.
- A mailbox change and revocation of old credentials are sensitive administrative operations: no public endpoint implements them, and no such operation was performed here. Staff need a reviewed, restricted procedure and audit trail before launch.

## Accessibility and mobile changes

- Grouped each checkout summary, acknowledgment and button in one width-constrained responsive wrapper, fixing the final CTA's fragmented flex layout.
- Policy links explicitly inherit the foreground color and are underlined. The earlier checklist's estimated blue-link contrast was not a measured browser result; Tailwind preflight already makes links inherit color. Computed contrast still needs browser verification.
- Checkbox has a unique associated label and 20px input; links are outside its label. The disabled checkout button has a visible explanation. Busy state and loading text are announced; error messages receive focus and use an explicit light background/dark text.
- Checkout script loading is shared and times out. Dismissal restores button focus. When sessionStorage is unavailable, verification is attempted directly and recovery guidance is shown instead of losing the callback silently.
- Added labeled recovery inputs, status/error announcements and a keyboard-operable confirmation button. Fixed fragment initialization for React Strict Mode effect replay.
- **BLOCKED:** No browser automation/browser binary was available. Verify 320/375/768px and desktop widths, 200% zoom, keyboard order, visible focus, screen-reader announcements, sticky CTA overlap, Razorpay modal focus/escape/dismissal, UPI handoff and actual payment/error states in a safe preview. External Razorpay UI is not proven accessible by these source changes.

## Test results

| Command / check | Result | Evidence limits |
| --- | --- | --- |
| `npx tsc --noEmit` | PASS | TypeScript compilation only. |
| `npm run lint` | PASS | Repository ESLint rules. |
| `npm test` | PASS — 5 compliance checks + 30 behavioral tests | Actual server service/route code with fabricated data, intercepted fetch and simulated storage. No provider transaction. |
| `npm run test:db` | PASS — 12 real database tests (PostgreSQL 18) | Disposable real PostgreSQL; no hosted Supabase/PostgREST or production data. |
| `npm run build` | PASS — 79 static pages generated | Local production compilation, no deployment. |
| `git diff --check` | PASS | Final working-tree whitespace check. |

Behavioral coverage includes all ten requested scenarios: authorized/captured/failed, incorrect amount, incorrect currency, invalid signature, duplicate webhook, expired and invalid recovery token, and legitimate historical captured access. Additional coverage covers missing/unknown states, order/payment mismatch, webhook tampering and stale capture events, callback concurrency, single-use replay, email failure, anti-enumeration, rate limits, cross-origin rejection, secure cookies and test/live mismatch.

Real SQL coverage includes migration application, RLS/grants, denial of status-only success, concurrent capture uniqueness, immutable paid records, idempotent issuance, concurrent recovery consumption, expiry/invalid tokens, historical raw credentials, rate-limit concurrency, transaction rollback, expired checkout replay after cleanup, service-role permissions and capture constraints.

An initial cookie test expected attributes in a particular order; it was corrected to test the actual security attributes independently. TypeScript and ESLint findings during implementation were fixed. Sandbox process/socket restrictions required approved local-only execution for the PostgreSQL suite; the test clusters are stopped and removed on completion.

## Files changed in this blocker remediation

Earlier unrelated edits remain in the working tree; this list covers this task's changes.

- `lib/course-access.ts`: capture reconciliation, historical verification, credential APIs, recovery email, hashing and origin checks.
- `lib/course-request-security.ts` (new): durable request throttling with trusted ingress handling.
- `app/api/razorpay/create-order/route.ts`: origin/rate controls, timeout, generic error logging.
- `app/api/razorpay/verify/route.ts`, `app/api/course-access/callback/route.ts`: validated callback input, origin/rate controls, captured-only session cookie.
- `app/api/razorpay/webhook/route.ts`: signed event handling and shared trusted reconciliation.
- `app/api/course-access/request/route.ts`: privacy-preserving asynchronous recovery request.
- `app/api/course-access/verify/route.ts`: non-consuming GET and protected single-use POST.
- `app/course-access/page.tsx`: recovery entry point, saved order reference and actual historical paid amount.
- `app/course-access/recover/page.tsx`, `components/CourseRecovery.tsx` (new): recovery and confirmation interfaces.
- `components/RazorpayCheckoutButton.tsx`, `components/PaymentReturn.tsx`: accessibility, retry/storage resilience, session flow and recovery guidance.
- `supabase/migrations/202610110001_captured_access_recovery.sql` (new): atomic capture/credential/rate-limit storage and restricted RPCs.
- `.env.example`: matching test-mode configuration and new server-only access secret.
- `tests/security.test.mjs`, `tests/database.test.mjs` (new), `tests/compliance.test.mjs`, `package.json`: behavioral and database tests; replaced the old name-only compatibility assertion with behavioral coverage.
- `PRODUCTION_BLOCKER_FIX_REPORT.md` (this report).

## Remaining blockers and exact exit evidence

| Gate | Status | Required corrective step / evidence |
| --- | --- | --- |
| B1/B4 — Razorpay ₹499 lifecycle | **BLOCKED** | Owner provides isolated test keys, webhook secret and test Supabase project. Run ₹499 mock checkout; demonstrate no access at authorization, capture-triggered access, duplicate/reordered webhooks, failed/dismissed payments, lost callback response and recovery. Record sanitized test IDs/state transitions. No live order is required. |
| B2 — Email and lifetime recovery | **BLOCKED** | Verify Resend sender domain, sender address and real inbox delivery in the test setup. Exercise expired session, new device, expired/reused link, failed email and lost mailbox escalation. Confirm `after` execution and duration limits on the intended host. Name and approve the support owner/process. |
| B3 — Seller/policies | **BLOCKED** | Owner supplies legal seller identity, address/contact and merchant details; counsel/owner approve terms, privacy, refund, retention and grievance text. Replace draft notices only with approved facts. No facts were invented here. |
| B5 — Hosted Supabase and history | **BLOCKED** | Perform read-only schema/history audit; validate new RPCs through isolated PostgREST; review legacy exceptions; approve backup, coordinated migration and captured-only rollback. Migration is currently local only. |
| B6 — Delivery/backup | **BLOCKED** | Verify all 11 files, sharing model, fresh-device access, external backup and a successful restoration/replacement drill. Record owner and manifest. |
| B7 — Vercel/environment/domain | **BLOCKED** | Identify project, branch/revision, runtime, production domain/DNS, preview isolation and rollback. Verify scoped secrets, exact origin, webhook events and function duration. Prior inability to resolve the public domain from this environment is not a global outage diagnosis. |
| B8 — Mobile/accessibility | **BLOCKED** | Execute the browser/assistive-technology matrix above, including the real Razorpay test modal. Source fixes and build success are insufficient evidence. |
| Meta ad consistency | **BLOCKED** | Compare the exact ad creative, text and destination to the approved deployed page, ₹499 checkout, 11 delivered videos and lifetime/refund terms. Actual creative was not supplied; ad approval is not guaranteed. |

### Required environment verification (names only; never copy values into reports)

- `APP_BASE_URL`: exact trusted HTTPS public origin; use the isolated preview origin for tests. Aliases must redirect to it before checkout.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: intended isolated or production project, matching schema, server-only. Never use a `NEXT_PUBLIC_` name for a secret.
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `COURSE_TEST_MODE`: all belong to the same intended mode/environment. Test uses `rzp_test_` and `true`; approved production uses live keys and `false`. Never use the locally observed live-key configuration for automated checkout tests.
- **New required `COURSE_ACCESS_SECRET`:** independent cryptographically random value of at least 32 bytes, stable across instances/releases, separate for test and production. Generate/store through the owner's secrets process. Rotation changes derived checkout sessions and rate-limit keys; existing randomly issued hashed sessions remain valid until expiry. Plan rotation/recovery deliberately.
- `RESEND_API_KEY`, `COURSE_ACCESS_FROM_EMAIL`: required for self-service emailed recovery, with verified sender permissions.
- `COURSE_DRIVE_URL`: validated and tested owner-approved course folder/file URL.
- Confirm platform `VERCEL`/trusted IP behavior and request limits for the real traffic volume; shared buckets intentionally constrain other hosts. Add platform abuse controls as appropriate.

### Warnings to track

- **WARNING:** Mail delivery is retriable but not backed by a durable queue; monitor generic failures without logging tokens/email contents. Approve alerting and retention cleanup.
- **WARNING:** Refund/dispute access revocation and administrative mailbox changes remain manual, privileged processes requiring owner policy. The webhook currently handles captured/failed payment events, not a complete refunds/disputes workflow.
- **WARNING:** Link-shared Drive content can be forwarded. Restricted sharing has no automatic permission provisioning in this app.
- **WARNING:** PostgreSQL tests require local PostgreSQL binaries under `/usr/lib/postgresql`, `initdb` permissions and local socket/process capability; include this prerequisite in CI or use an equivalent isolated test database workflow.

**Release decision:** Do not deploy or describe this project as production-ready until the blocked gates have recorded evidence and the owner explicitly approves the infrastructure changes and release. This report is not approval to modify production data, commit, push, deploy or initiate a live transaction.
