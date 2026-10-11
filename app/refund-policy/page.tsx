import {Page} from '@/components/Site';

export default function Refund() {
  return <Page title="Refund & Cancellation Policy" subtitle="Draft policy wording for owner and legal review before publication.">
    <section className="section"><div className="container card prose max-w-4xl">
      <h2>Digital course purchases</h2>
      <p>The Share Market Educational Course is a digital product with 11 pre-recorded video lessons. Purchases are generally non-refundable once valid course access has been provided. This does not affect remedies or consumer rights available under applicable law.</p>
      <h3>Cancellation before access</h3>
      <p>If you wish to cancel before valid access is provided, contact support promptly with your payment reference. We will review the payment and access status and explain the available options. No automatic cancellation window is promised.</p>
      <h3>Payment or access problems</h3>
      <p>If a payment fails, is deducted without a confirmed order, or is charged twice, contact support with the relevant payment references. We will check our Razorpay and course payment records and arrange a correction or refund where appropriate. If payment is confirmed but access is not provided, we will work to restore access or assess a refund or other remedy. We also review reports of defective or materially misdescribed course access, including any remedies required by law.</p>
      <h3>How to request help or a refund</h3>
      <p>Email <a href="mailto:campusedux@gmail.com">campusedux@gmail.com</a> or contact <a href="https://wa.me/919370764290">WhatsApp support</a>. Include the order or payment reference, the email used at checkout, the issue, and any relevant screenshots. Never send a card number, CVV, UPI PIN, password, or OTP. We will review the request against the payment and access records and communicate the outcome. Approved refunds are returned through the payment channel where available; bank and provider processing times can vary.</p>
      <p>For access recovery, see the <a href="/terms">Terms &amp; Conditions</a> or <a href="/contact">Contact Us</a>.</p>
    </div></section>
  </Page>;
}
