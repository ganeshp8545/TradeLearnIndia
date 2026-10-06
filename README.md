# CampusEduX — Share Market Education

Next.js 16 + TypeScript + Tailwind site with server-side Razorpay Standard Checkout and protected course access.

## Features
- Responsive finance-style UI
- Share market course sales page with Razorpay Standard Checkout
- Razorpay Orders API for server-side order creation
- Server-side signature verification for checkout success callbacks
- Razorpay webhook verification and Supabase payment records
- Secure, server-side course access token workflow
- FAQ, privacy, terms, refund and risk disclaimer pages

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

## Environment setup
Create a local `.env.local` from `.env.example` and set each value server-side only.

Required variables:
- `APP_BASE_URL`: canonical HTTPS origin, `https://market.campusedux.com` in production
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RAZORPAY_KEY_ID`: Razorpay test key in test mode
- `RAZORPAY_KEY_SECRET`: Razorpay test secret in test mode
- `RAZORPAY_WEBHOOK_SECRET`: webhook secret from Razorpay dashboard
- `COURSE_DRIVE_URL`: private Google Drive folder URL kept server-side

Optional:
- `RESEND_API_KEY`
- `COURSE_ACCESS_FROM_EMAIL`

## Razorpay configuration
Use Razorpay Test Mode only for development and validation.

1. In the Razorpay Dashboard, set the key pair to test mode.
2. Create a webhook with the exact URL:
   `https://<your-domain>/api/razorpay/webhook`
3. Subscribe to `payment.captured` and `payment.failed`.
4. Save the generated webhook secret as `RAZORPAY_WEBHOOK_SECRET`.
5. Keep `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` on the server only; never expose them to the browser.

## Runtime flow and security
- Course page: the browser calls `POST /api/razorpay/create-order` and opens Razorpay Checkout.
- Server verification: `POST /api/razorpay/verify` checks the Razorpay signature using `order_id|payment_id` and then confirms the actual Razorpay payment amount and currency.
- Entitlement: verified payments are recorded in Supabase and a secure access token is issued to the server-side course access flow.
- Drive route: `/api/course-access/open` verifies the entitlement and redirects server-side to `COURSE_DRIVE_URL`.
- The drive URL is never exposed to the browser bundle.
- If Google Drive is shared as “Anyone with the link”, it is still public and cannot be treated as a true access-control mechanism.

## Important caution
This project does not protect the downloaded Google Drive content if the folder itself is publicly shared. Keep the folder private or move to a truly restricted storage method if stronger access control is required.
