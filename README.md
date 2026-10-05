# CampusEduX — Share Market Education

Next.js 14 + TypeScript + Tailwind site with server-side Razorpay webhook verification and protected course access. The existing hosted Razorpay Payment Link and all course-page checkout buttons remain unchanged.

## Features
- 30+ static/dynamic frontend routes
- Responsive dark finance-style UI
- Topic grids and article cards
- Dynamic `[slug]` learning and article routes
- Share market course sales page
- Hosted Razorpay Payment Link CTAs for the Share Market Complete Course
- Razorpay webhook verification and Supabase payment records
- Email-delivered, single-use course-access links
- FAQ, privacy, terms, refund and risk disclaimer pages
- Investor-awareness and official-resource links
- Simple client-side learning calculator
- Sitemap and robots metadata routes

## Run locally
```bash
npm install
npm run dev
```
Open `http://localhost:3000`.

## Build
```bash
npm run build
npm start
```

## Payment and course-access setup

This is no longer a static-only deployment. Deploy it to a Node.js hosting platform that supports Next.js route handlers and server environment variables. Do not export it as a static site.

1. Create a Supabase project. Run [`supabase/migrations/202610050001_course_payments.sql`](supabase/migrations/202610050001_course_payments.sql) in the Supabase SQL Editor or apply it with the Supabase CLI. The table has row-level security enabled and denies public/anonymous access; only the server service-role credential is used by the app.
2. Create and verify a sending domain in Resend. The payment link must collect the customer's email address so the app can match the verified payment and send access to that mailbox.
3. Configure these server-side deployment environment variables from `.env.example`:
	- `APP_BASE_URL`: canonical HTTPS origin of this deployment, without a trailing slash.
	- `SUPABASE_URL`: Supabase project URL.
	- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service-role key. Keep it server-only; never prefix it with `NEXT_PUBLIC_`.
	- `RAZORPAY_WEBHOOK_SECRET`: secret generated for the webhook in the Razorpay dashboard, not the Razorpay API key secret.
	- `RESEND_API_KEY`: Resend API key with permission to send from the verified domain.
	- `COURSE_ACCESS_FROM_EMAIL`: verified sender, for example `CampusEduX <courses@example.com>`.
	- `COURSE_DRIVE_URL`: the private-to-the-app course folder URL. Keep it server-only; never prefix it with `NEXT_PUBLIC_`.
4. In Razorpay, open the existing ₹499 INR Payment Link and set its post-payment redirect URL to `https://<your-domain>/payment/return`. Razorpay appends `razorpay_payment_link_id`; the return page treats it only as a lookup reference and does not trust redirect parameters as proof of payment. Keep the existing link itself and its CTA destination unchanged.
5. In Razorpay Dashboard → Account & Settings → Webhooks, add this URL (replace the hostname with the deployed app's exact HTTPS domain):

	`https://<your-domain>/api/razorpay/webhook`

	Subscribe to `payment_link.paid`, `payment.failed`, and `payment_link.created`. Generate a webhook secret, save it as `RAZORPAY_WEBHOOK_SECRET`, and use the same exact value in the dashboard. Razorpay signs the raw webhook request body; the route checks that signature before parsing or storing any event. Successful access is granted only for a signed `payment_link.paid` event whose amount is exactly ₹499 (49900 paise) and currency is INR.
6. Apply the production environment variables, deploy/redeploy the Next.js app, and verify the deployment build succeeds. Configure the webhook only after the public HTTPS endpoint is reachable. Ensure outbound HTTPS requests to Supabase and Resend are allowed.
7. Test with a Razorpay test-mode Payment Link and matching webhook in a staging deployment. Confirm a failed payment stays `failed`, a paid webhook records `success`, repeated events do not downgrade success, the purchaser receives the email, and a fresh/private browser cannot open `/course-access` without the emailed link. Do not test by manually visiting a success URL and treating that as payment evidence.

## Runtime flow and security

- Webhook: `POST /api/razorpay/webhook`. Invalid signatures are rejected. Supabase stores the Razorpay Payment Link ID, payment/order IDs, customer, amount, status, course name, access flag, and timestamps. A database upsert preserves success against later failed events.
- Return page: `/payment/return`. It polls the backend and shows `pending`, `success`, `failed`, `not found`, or server-error states. After verified success, the customer enters the email used at checkout to request a time-limited, single-use access link.
- Access: the email token is stored only as a hash, expires after 30 minutes, and is exchanged for an HttpOnly, SameSite cookie. The server checks the live Supabase payment/access record before rendering the Drive button. Typing `/course-access` without that valid session does not reveal the Drive URL.
- `COURSE_DRIVE_URL` is read only by the protected server-rendered page and is not included in the public course page or JavaScript bundle. Once an authorized learner opens Google Drive, the URL can still be copied/shared; Google Drive's own sharing settings govern access there. Configure the folder's sharing policy to match your intended course access model.
- Payment lookup and email-link request endpoints should be protected by your hosting provider's rate limiting/WAF before launch. Do not expose Supabase service-role keys, Resend API keys, or webhook secrets in client-visible variables.

## Other publishing tasks

1. The checkout destination remains configured in `lib/payment.ts` and is the existing hosted Razorpay Payment Link.
2. Replace `https://YOUR-SUBDOMAIN.example.com` in `app/robots.ts` and `app/sitemap.ts` with your actual subdomain.
3. Replace `support@yourdomain.com` with your real support email.
4. Review the legal pages with a qualified professional for your exact business model.
5. Add your real brand name/logo and course media.
