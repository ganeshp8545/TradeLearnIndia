import {Page} from '@/components/Site';
import {COURSE_ORIGINAL_PRICE_INR, COURSE_PRICE_INR, formatINR} from '@/lib/course-pricing';

const q=[['Is this investment advice?','No. The website is for education and general information.'],['Does the course guarantee profit?','No. Trading and investing involve risk and no return is guaranteed.'],['How much is the course?',`The current course price is ${formatINR(COURSE_PRICE_INR)} against the regular price of ${formatINR(COURSE_ORIGINAL_PRICE_INR)}.`],['How do I pay?','Use the Razorpay button on the course page.'],['Can beginners join?','Yes. The course is structured from beginner concepts towards advanced topics.']];

export default function FAQ(){return <Page title="Frequently Asked Questions"><section className="section"><div className="container grid gap-4 max-w-4xl">{q.map(x=><details className="card" key={x[0]}><summary className="font-black cursor-pointer">{x[0]}</summary><p className="muted mt-3">{x[1]}</p></details>)}</div></section></Page>}
