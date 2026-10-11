import {Page} from '@/components/Site';

export default function Privacy() {
  return <Page title="Privacy Policy" subtitle="Draft privacy wording for owner and legal review before publication.">
    <section className="section"><div className="container card prose max-w-4xl">
      <h2>Information we process</h2>
      <p>When you buy a course or request support, we may process your name, email, contact number, order and payment references, payment status, course entitlement, and support messages. Our server also receives basic technical request data used for security and operation. Razorpay processes payment method details; do not send card numbers, CVV, UPI PINs or OTPs to us.</p>
      <h3>How we use information</h3>
      <p>We use this information to create and reconcile orders, verify payments, provide and recover course access, send access or service emails where configured, answer support requests, and protect the service. Payment and entitlement records are stored in Supabase. Razorpay handles checkout. Resend may deliver access emails when configured. Course videos are reached through our configured Google Drive destination; Google may process information when you use Drive. Our hosting provider processes website requests.</p>
      <h3>Browser storage and cookies</h3>
      <p>The checkout temporarily stores the Razorpay payment callback in browser sessionStorage so the return page can verify it, then removes it. HttpOnly course-access cookies hold short-lived credentials for access verification. These cookies are distinct from the duration of your purchased course entitlement. We found no Meta Pixel or other analytics script in this repository.</p>
      <h3>Retention, security and requests</h3>
      <p>Payment and course-access records are retained as needed to provide access, resolve disputes, and meet applicable obligations; a fixed retention period has not been set in this policy. Server-side payment signature checks, access-token hashes, HttpOnly cookies, and restricted server credentials are used to protect the flow. No online system can be guaranteed completely secure.</p>
      <p>To request access, correction, or deletion of your information, email <a href="mailto:campusedux@gmail.com">campusedux@gmail.com</a>. We will assess requests against legal and transaction record obligations. See <a href="/contact">Contact Us</a> for support.</p>
    </div></section>
  </Page>;
}
