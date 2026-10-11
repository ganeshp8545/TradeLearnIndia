import {Page} from '@/components/Site';

export default function Terms() {
  return <Page title="Terms & Conditions" subtitle="Draft course terms for owner and legal review before publication.">
    <section className="section"><div className="container card prose max-w-4xl">
      <h2>Course purchase and lifetime access</h2>
      <p>The Share Market Educational Course contains 11 pre-recorded video lessons and costs ₹499 INR. A verified purchase entitles you to ongoing access to the purchased 11 videos without a preset expiry date or course renewal fee. This is our lifetime access commitment to the purchaser. This entitlement does not include future courses or new products unless expressly offered. A secure access link or browser session may expire for security; that expiry does not end the course entitlement.</p>
      <h3>Access and recovery</h3>
      <p>Course access currently opens through a configured Google Drive destination after payment verification. If you change browser or device, lose your link, or cannot open the videos, contact <a href="mailto:campusedux@gmail.com">campusedux@gmail.com</a> or <a href="/contact">support</a> with your payment reference and checkout email. We will verify the purchase and assist with access recovery. Access depends on the course files and sharing configuration being maintained. If the delivery platform changes, we intend to provide an alternative way to access the purchased course. A specific long-term hosting arrangement has not yet been independently verified.</p>
      <h3>Permitted use</h3>
      <p>Access is for the purchaser's personal educational use. Do not redistribute, resell, upload, or share course videos or access credentials, or attempt unauthorized access. We may restrict access associated with misuse, subject to applicable law and a review of the circumstances.</p>
      <h3>Payments and refunds</h3>
      <p>Payments are handled through Razorpay. Please read the <a href="/refund-policy">Refund &amp; Cancellation Policy</a> before purchase. Purchases are generally non-refundable once valid access is provided, subject to applicable consumer rights.</p>
      <h3>Educational purpose</h3>
      <p>The course provides general education, not personalized investment advice or stock recommendations. Trading and investing involve the risk of losing capital. See the <a href="/risk-disclaimer">Risk Disclaimer</a>.</p>
    </div></section>
  </Page>;
}
