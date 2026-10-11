# TradeLearnIndia Meta Ads and website remediation report

**Review date:** 11 October 2026
**Scope:** This repository and a local production build. No production deployment, live payment, customer data, or Meta account action was performed. These policy pages are draft wording pending owner and legal approval. Meta ad approval cannot be guaranteed.

## Initial audit

- Next.js 16.3.8 App Router, React 18, TypeScript strict mode, Tailwind CSS and component CSS modules. `/courses` is the canonical course page. `/courses/share-market-complete-course` is a permanent redirect in the repository.
- The working tree already contained uncommitted edits in course, policy, access and navigation files. This work built on those edits; they were not reset.
- The repository's curriculum lists four modules and eleven lessons. The owner supplied the verified count of **11 actual pre-recorded videos** and current fee of **₹499 INR**. Lesson titles support price action, support and resistance, swing trading, index/commodity and stock/investment strategy descriptions. Actual Drive video contents were not inspected; claims about chart analysis or risk management as taught subjects were excluded.
- Prior copy contained or had recently removed unsupported duration, original-price, discount, level and urgency claims. The current local policy pages still said access duration and refund eligibility were unspecified, contrary to the owner's stated policy.
- Razorpay order creation obtains its amount from server configuration; checkout callback and webhook paths verify signatures and reconcile amount/currency. Supabase stores payment and access records. Resend can send access email when configured. A server-configured Google Drive URL delivers videos.
- Access links expire after 30 minutes for emailed links; generated payment tokens and browser sessions last 24 hours. A purchaser's payment entitlement remains recorded in Supabase, but long-term file availability, Drive sharing, account recovery and operations need production verification. The request endpoint can reissue email access after matching order ID and checkout email; support may need to assist customers who lack either detail.
- No Meta Pixel or other analytics script was found in the application source. Checkout temporarily uses `sessionStorage` for a payment callback; HttpOnly access cookies hold temporary credentials. Hosting provider and production integrations were not independently verified.

## Completed changes

### Course offer and SEO

- Centralized the public title **Share Market Educational Course**, price **₹499**, and count **11** in `lib/course-pricing.ts` and aligned `lib/course-page-data.ts`.
- Updated the course hero, curriculum, format, access, pricing, refund, FAQ, support and risk sections in `components/CourseLandingPage.tsx`. The offer now visibly states **11 Video Lessons | ₹499 | Lifetime Access** and links to Terms, Privacy, Refund, Contact and Risk Disclaimer.
- Updated course title, description, Open Graph and social preview copy. `/courses` remains canonical in metadata and sitemap. Site navigation points to `/courses`. The legacy route remains a permanent redirect.
- Removed unsupported price comparison, discount, duration, urgency, broad level and guarantee language from active course sales copy. No reviews, ratings, testimonials, student totals, certificates or instructor credentials were invented.

### Checkout and payment continuity

- `components/RazorpayCheckoutButton.tsx` now presents the title, 11-video format, **Total Payable: ₹499 INR**, lifetime access terms and refund summary before an accessible policy acknowledgment checkbox. Its button remains disabled until acknowledgment, and a local in-progress guard prevents repeat submissions from that button while checkout opens.
- The client checks that the returned order amount matches the trusted course configuration. `app/api/razorpay/create-order/route.ts` continues to set the amount on the server and accepts no client amount. Existing signature verification, webhook verification, payment recording, access creation and email delivery paths remain.
- Compact site and sticky calls to action lead to the full course offer before checkout.
- The public course title changed, so `lib/course-access.ts` and the Razorpay webhook continue to accept historical **Share Market Complete Course** payment records for eligibility. No schema migration was needed.

### Policies, identity and support

- `app/refund-policy/page.tsx` now explains the owner's general no-refund-after-valid-access policy, cancellation requests before access, duplicate and failed payments, debits without access, defective or materially misdescribed access, request steps, and approved refund handling without an invented deadline.
- `app/terms/page.tsx` describes ongoing access to the purchased videos without a preset expiry or renewal fee, excludes future courses, distinguishes expiring credentials, explains recovery, permitted use and platform migration intent.
- `app/privacy-policy/page.tsx` describes data handled for payments and access, Razorpay, Supabase, optional Resend, Google Drive, browser storage, cookies, retention without a fabricated period, correction/deletion requests and implemented security measures.
- `app/about/page.tsx` and `app/contact/page.tsx` identify TradeLearnIndia by CampusEduX and existing repository support channels. Footer legal links were clarified. Legal seller identity and address were not invented.
- Payment return and access screens use the new public title while existing payment records remain eligible.

## Validation

- `npx tsc --noEmit`: passed.
- `npm run lint`: passed.
- `npm test`: six checks passed for course facts/curriculum, checkout acknowledgment and trusted amount, Razorpay signatures, legacy routing/metadata, historical payment compatibility, and unsupported claims.
- `npm run build`: passed; 78 static pages generated.
- Local built server: `/courses` returned HTTP 200 with the updated offer; `/courses/share-market-complete-course` returned HTTP 308 with `Location: /courses`.
- `git diff --check`: passed. No live orders or customer transactions were created. Mobile browser and assistive-technology testing were not available in this environment; the existing responsive CSS and accessible checkbox/label pattern were retained.

## Items requiring owner approval

- Confirm the eleven lesson titles correspond exactly to the delivered files and that each video remains accessible in the configured Drive destination.
- Confirm the legal seller name, business address where required, support email/WhatsApp ownership, merchant display name, grievance contact and any business registration or tax disclosures before publication.
- Approve the draft refund, access, privacy and support wording, including the cancellation-before-access review process and operational handling of approved refunds.
- Define and staff a durable lifetime-access recovery process for device changes, lost order references, email changes, file moves and Drive outages. **This is a blocker for confidently delivering the lifetime promise at scale.** The code does not itself guarantee permanent file hosting or recovery.

## Items requiring legal review

- Review consumer remedies, digital-content cancellation and refund language under applicable Indian law.
- Review privacy notices, retention, data requests, grievance/contact disclosures and any applicable Indian data-protection obligations.
- Confirm whether financial education content or ad copy requires additional regulatory disclosures. No SEBI status is asserted here.

## Items requiring production verification

- Check the deployed Vercel project or actual hosting provider points to the intended commit, domain and environment. Clear or invalidate stale CDN/browser caches if production still shows the old page. Verify both legacy and canonical URLs, redirects, canonical tags, sitemap, Open Graph image and social previews on the public domain.
- Verify Razorpay merchant name, ₹499 live order amount, checkout copy, webhook URL/events/signatures, payment confirmation and Supabase records using a controlled test-mode flow only.
- Verify the Drive folder sharing permissions, long-term backup and replacement process, video file availability, and recovery after session expiry or device change. If Drive is link-shared, the destination can be forwarded; the website access check cannot prevent redistribution of that link.
- Confirm optional Resend configuration and access-email delivery; verify the email contains a working recovery path. Review production logs and rate limiting for access-email requests.
- Check whether analytics or Meta Pixel have been installed outside this repository through hosting, tag managers or third-party tools; amend the Privacy Policy if so.
- Test mobile layouts and keyboard/screen-reader behavior on deployed pages.

## Manual Meta Ads Manager actions

1. Align ad text, image and destination with the published course page: 11 pre-recorded videos, ₹499, lifetime access terms and the refund policy. Avoid profit, return, scarcity and discount claims without evidence.
2. After the approved site version is deployed, request a review of the rejected ad through Meta Ads Manager and supply the corrected landing page. Review the precise rejection details and any account-level notices.
3. Confirm ad click destination and all redirects land on `/courses`, then compare the live offer, checkout and policies on mobile.

## Deployment instructions and final checklist

1. Obtain owner and legal approval for draft policy text and required business details. Resolve the lifetime-access operational blocker.
2. Review this diff, run `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build` in the deployment environment.
3. Deploy the approved revision through the existing hosting workflow; this task intentionally stopped before commit, push or deployment.
4. Verify the live course page, ₹499 checkout amount, policy links, course-access recovery, 308 legacy redirect, metadata, sitemap, Drive delivery and test-mode webhook flow.
5. Only then update/resubmit the Meta advertisement. Meta approval remains at Meta's discretion.

## Files changed in this remediation

`lib/course-pricing.ts`, `lib/course-page-data.ts`, `lib/course-access.ts`, `components/CourseLandingPage.tsx`, `components/RazorpayCheckoutButton.tsx`, `components/CourseInteractions.tsx`, `components/Site.tsx`, `components/PaymentReturn.tsx`, `app/api/razorpay/webhook/route.ts`, `app/about/page.tsx`, `app/contact/page.tsx`, `app/course-access/page.tsx`, `app/courses/opengraph-image.tsx`, `app/faq/page.tsx`, `app/page.tsx`, `app/privacy-policy/page.tsx`, `app/refund-policy/page.tsx`, `app/terms/page.tsx`, `package.json`, `tests/compliance.test.mjs`, and this report. Other already-modified files in the working tree predate this remediation and were preserved.
