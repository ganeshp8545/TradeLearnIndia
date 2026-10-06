import type {Metadata} from 'next';
import {Check, Mail, MessageCircle} from 'lucide-react';
import {CTA, Footer, Header} from '@/components/Site';
import {RazorpayCheckoutButton} from '@/components/RazorpayCheckoutButton';

const siteUrl = 'https://market.campusedux.com';
const coursePath = '/courses';
const courseUrl = `${siteUrl}${coursePath}`;
const description = 'Learn share market trading from beginner to advanced with 13+ hours of video lessons covering price action, technical analysis, support & resistance, swing trading and risk management. Enroll for ₹499.';

export const metadata: Metadata = {
	title: {absolute: 'Share Market Course Online: Beginner to Advanced Trading Course | CampusEduX'},
	description,
	keywords: ['share market course online', 'share market course', 'stock market course for beginners', 'trading course online', 'share market trading course', 'technical analysis course', 'price action trading course', 'swing trading course', 'stock market course India', 'learn share market online'],
	alternates: {canonical: coursePath},
	openGraph: {
		title: 'Share Market Course Online: Beginner to Advanced Trading Course | CampusEduX',
		description,
		type: 'website',
		url: courseUrl,
		images: [{url: `${coursePath}/opengraph-image`, width: 1200, height: 630, alt: 'CampusEduX Share Market Complete Course'}],
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Share Market Course Online: Beginner to Advanced Trading Course | CampusEduX',
		description,
		images: [`${coursePath}/opengraph-image`],
	},
};

const topics = ['Share Market Basics', 'Technical Analysis', 'Price Action Trading', 'Support and Resistance', 'Trading Strategies', 'Bank Nifty-related strategies', 'Swing Trading', 'Intraday Trading Concepts', 'Risk and Money Management', 'Trading Psychology', 'Practical Chart Analysis'];
const benefits = ['13+ hours of video lectures', 'Beginner to advanced learning structure', 'Trading and technical analysis concepts', 'Price action and support & resistance', 'Swing trading concepts', 'Risk management concepts', 'Practical chart-based learning', 'Lifetime course access'];
const whatsappMessage = encodeURIComponent('Hi, I want to know more about the Share Market Complete Course.');

export default function Courses() {
	const courseSchema = {
		'@context': 'https://schema.org',
		'@type': 'Course',
		name: 'Share Market Complete Course',
		description,
		url: courseUrl,
		provider: {'@type': 'Organization', name: 'CampusEduX', url: siteUrl},
		offers: {
			'@type': 'Offer',
			url: courseUrl,
			priceCurrency: 'INR',
			price: '499',
			availability: 'https://schema.org/InStock',
			priceSpecification: {'@type': 'PriceSpecification', priceCurrency: 'INR', price: '1900', priceType: 'https://schema.org/ListPrice'},
		},
	};

	return <>
		<Header/>
		<main>
			<section className="py-8 md:py-12">
				<div className="container">
					<h1 className="max-w-5xl text-3xl font-extrabold leading-tight tracking-tight text-[#0b1728] sm:text-4xl lg:text-5xl">Share Market Course Online: Learn Trading from <span className="text-emerald-600">Beginner to Advanced</span></h1>
					<p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500 sm:text-base">13+ hours of structured video lessons – Self-paced – Practical chart-based learning</p>
				</div>
			</section>

			<section className="pb-12 md:pb-16">
				<div className="container">
					<CTA/>
					<div className="grid grid3">
						<div className="card"><h2 className="font-black">13+ Hours</h2><p className="muted mt-2">Video lessons covering market and trading concepts.</p></div>
						<div className="card"><h2 className="font-black">Beginner → Advanced</h2><p className="muted mt-2">A structured learning path.</p></div>
						<div className="card"><h2 className="font-black">Practical Focus</h2><p className="muted mt-2">Chart-based explanations and strategy concepts.</p></div>
					</div>
				</div>
			</section>

			<section className="section bg-white">
				<div className="container max-w-4xl prose">
					<h2>Share Market Course Online: Learn Trading from Beginner to Advanced</h2>
					<p>Learning the share market can feel confusing when you are starting with random videos, different trading strategies and complicated charts. A structured share market course online can make the learning process easier by taking you through the concepts step by step. The CampusEduX Share Market Complete Course is designed for learners who want to understand the stock market, trading concepts and technical analysis in a structured way. The course includes 13+ hours of video lectures and takes learners from basic concepts towards more advanced trading topics.</p>
				</div>
			</section>

			<section className="section">
				<div className="container">
					<div className="section-heading"><h2>What Will You Learn in This Share Market Course Online?</h2><p>The course begins with the fundamentals so that beginners can build a strong foundation before moving into trading concepts. You will learn about the share market, how trading works and important concepts used while analysing charts.</p></div>
					<ul className="mt-8 grid gap-4 sm:grid-cols-2" aria-label="Course topics">
						{topics.map(topic => <li key={topic} className="card flex items-center gap-3 font-bold text-slate-800"><Check aria-hidden="true" className="shrink-0 text-emerald-600" size={20}/>{topic}</li>)}
					</ul>
					<p className="muted mt-7 max-w-4xl leading-7">The objective is not simply to provide information, but to give learners a step-by-step learning path from beginner to advanced concepts.</p>
				</div>
			</section>

			<section className="section bg-white">
				<div className="container max-w-4xl">
					<h2>Who Can Join This Course?</h2>
					<p className="muted mt-4 leading-8">This course is suitable for beginners who are starting their share market learning journey, as well as learners who already know the basics and want to understand technical analysis, price action and trading strategies in a more organised way. You can learn at your own pace using the video lessons from your mobile or laptop.</p>
				</div>
			</section>

			<section className="section">
				<div className="container">
					<div className="section-heading"><h2>What You Get</h2></div>
					<ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						{benefits.map(benefit => <li key={benefit} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold leading-6 text-slate-700 shadow-sm"><Check aria-hidden="true" className="shrink-0 text-emerald-600" size={18}/>{benefit}</li>)}
					</ul>
				</div>
			</section>

			<section className="section bg-white">
				<div className="container"><div className="course-cta grid items-center gap-7 p-6 text-white sm:p-8 lg:grid-cols-[1fr_auto] lg:gap-10">
					<div><span className="offer-label">Limited-time course offer</span><h2 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">Limited-Time Course Offer</h2><p className="mt-3 max-w-2xl leading-7 text-slate-300">The regular course price is ₹1,900, but the current launch offer is available for only ₹499. Save ₹1,401 on the regular price.</p></div>
					<div className="cta-price"><p className="text-sm font-bold text-slate-300 line-through">₹1,900</p><p className="mt-1 text-5xl font-black text-white">₹499</p><div className="mt-4"><RazorpayCheckoutButton label="Enroll Now – ₹499" className="btn btn-gold w-full"/></div></div>
				</div></div>
			</section>

			<section className="section pt-0">
				<div className="container"><div className="notice"><h2 className="text-xl font-black">Important</h2><p className="mt-3 leading-7">This course is provided for educational purposes only. Trading and investing in financial markets involve risk, and no profit or return is guaranteed. Learners should make financial decisions based on their own research and risk tolerance.</p></div></div>
			</section>

			<section className="section bg-white" aria-labelledby="contact-heading">
				<div className="container"><div className="section-heading"><span className="tag">COURSE SUPPORT</span><h2 id="contact-heading">Need Help? Contact Us</h2><p>We usually reply within 24 hours, during support hours of 10 AM – 7 PM.</p></div>
					<div className="mt-8 grid gap-5 md:grid-cols-2">
						<article className="card"><MessageCircle aria-hidden="true" className="text-emerald-600" size={28}/><h3 className="mt-4 text-xl font-black">WhatsApp</h3><p className="muted mt-2 leading-7">Ask us about the Share Market Complete Course and course access.</p><a className="btn btn-primary mt-5" href={`https://wa.me/919370764290?text=${whatsappMessage}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={18}/>Chat on WhatsApp</a></article>
						<article className="card"><Mail aria-hidden="true" className="text-emerald-600" size={28}/><h3 className="mt-4 text-xl font-black">Email</h3><p className="muted mt-2 leading-7">Email us at <a className="font-bold text-emerald-700 underline" href="mailto:campusedux@gmail.com">campusedux@gmail.com</a>.</p><a className="btn btn-primary mt-5" href="mailto:campusedux@gmail.com?subject=Enquiry%20about%20Share%20Market%20Complete%20Course"><Mail size={18}/>Send an Email</a></article>
					</div>
				</div>
			</section>
		</main>
		<Footer/>
		<script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(courseSchema)}}/>
	</>;
}
