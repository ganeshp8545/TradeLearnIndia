import {Page} from '@/components/Site';
import {COURSE_PRICE_INR, formatINR} from '@/lib/course-pricing';

const q=[['Is this investment advice?','No. The website is for education and general information.'],['Does the course guarantee profit?','No. Trading and investing involve risk and no return is guaranteed.'],['How much is the course?',`The 11-video course costs ${formatINR(COURSE_PRICE_INR)} INR and includes lifetime access, subject to the Terms.`],['How do I pay?','Use Razorpay checkout on the course page after reviewing the Terms and Refund Policy.'],['Is the course suitable for beginners?','The listed lesson titles focus on price action and trading strategies. Beginner suitability of the underlying lesson files has not been independently verified; review the outline and contact support if you need more information.']];

export default function FAQ(){return <Page title="Frequently Asked Questions"><section className="section"><div className="container grid gap-4 max-w-4xl">{q.map(x=><details className="card" key={x[0]}><summary className="font-black cursor-pointer">{x[0]}</summary><p className="muted mt-3">{x[1]}</p></details>)}</div></section></Page>}
