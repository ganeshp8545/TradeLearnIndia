import {Page} from '@/components/Site';

export default function Contact() {
  return <Page title="Contact Us" subtitle="Support for TradeLearnIndia by CampusEduX.">
    <section className="section"><div className="container card prose max-w-3xl">
      <h2>Customer support</h2>
      <p>Email: <a href="mailto:campusedux@gmail.com">campusedux@gmail.com</a></p>
      <p>WhatsApp: <a href="https://wa.me/919370764290" target="_blank" rel="noreferrer">+91 93707 64290</a></p>
      <p>For a payment, refund, or access issue, include your order or payment reference, the email used at checkout, and a short description. We will review the payment and access records and reply through the support channel. Never send passwords, OTPs, UPI PINs, CVV or full card details.</p>
      <p>For privacy or grievance requests, use the same email with a clear subject line. The owner must verify and publish any legally required grievance officer details and business address.</p>
    </div></section>
  </Page>;
}
