import {Page} from '@/components/Site';

export default function About() {
  return <Page title="About TradeLearnIndia" subtitle="TradeLearnIndia is an educational brand by CampusEduX.">
    <section className="section"><div className="container card prose max-w-4xl">
      <h2>What we offer</h2>
      <p>TradeLearnIndia by CampusEduX publishes share market education and the Share Market Educational Course. The course contains 11 pre-recorded video lessons. Our material is general education and does not promise returns or provide personalized investment advice.</p>
      <h3>Support and seller details</h3>
      <p>For course, payment, or access questions, contact <a href="mailto:campusedux@gmail.com">campusedux@gmail.com</a> or use our <a href="/contact">Contact Us</a> page. The legal seller name and address still require owner verification before they can be published here.</p>
    </div></section>
  </Page>;
}
