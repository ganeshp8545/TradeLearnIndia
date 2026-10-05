import type {Metadata} from 'next';
import {ArrowDown, BarChart3, BookOpen, ChartNoAxesCombined, Clock3, Laptop, ShieldCheck, Sparkles} from 'lucide-react';
import {Footer, Header} from '@/components/Site';
import {courseModules} from '@/lib/data';
import {coursePaymentUrl} from '@/lib/payment';

export const metadata:Metadata={
	title:{absolute:'Share Market Course Online: Beginner to Advanced Trading Course | CampusEduX'},
	description:'Learn share market trading from beginner to advanced with 13+ hours of video lessons covering price action, technical analysis, support & resistance, swing trading and risk management. Enroll for ₹499.',
	alternates:{canonical:'https://YOUR-DOMAIN.com/courses/share-market-complete-course'},
	openGraph:{
		title:'Share Market Course Online: Beginner to Advanced Trading Course | CampusEduX',
		description:'Learn share market trading from beginner to advanced with 13+ hours of video lessons covering price action, technical analysis, support & resistance, swing trading and risk management. Enroll for ₹499.',
		url:'https://YOUR-DOMAIN.com/courses/share-market-complete-course',
		type:'website',
	},
};

const learningTopics=[
	'Share Market Basics','Technical Analysis','Price Action Trading','Support and Resistance',
	'Trading Strategies','Bank Nifty Strategies','Swing Trading Concepts','Intraday Trading Concepts',
	'Risk and Money Management','Trading Psychology','Practical Chart Analysis',
];

const courseBenefits=[
	{icon:Clock3,title:'13+ Hours of Video Lectures'},
	{icon:BookOpen,title:'Beginner to Advanced Structure'},
	{icon:BarChart3,title:'Technical Analysis'},
	{icon:ChartNoAxesCombined,title:'Price Action'},
	{icon:Sparkles,title:'Swing Trading Concepts'},
	{icon:ShieldCheck,title:'Risk Management'},
	{icon:Laptop,title:'Mobile & Laptop Access'},
	{icon:ArrowDown,title:'Lifetime Access'},
];

const roadmap=['Share Market Basics','Technical Analysis','Price Action','Support & Resistance','Trading Strategies','Swing Trading','Risk Management','Advanced Concepts'];

const questions=[
	['Is this course suitable for beginners?','Yes. The course follows a beginner-to-advanced learning structure.'],
	['How long is the course?','The course contains 13+ hours of video lectures.'],
	['Can I learn from mobile?','Yes, the course is designed for learning through mobile and laptop.'],
	['What is the regular price?','The regular course price is ₹1,900.'],
	['What is the current offer price?','The current offer price is ₹499.'],
	['How do I pay?','Payment is completed through the secure Razorpay hosted payment page.'],
	['Is this investment advice?','No. The course is educational and informational only.'],
];

function EnrollButton({label}:{label:string}){
	return <a className="btn btn-primary w-full sm:w-auto" href={coursePaymentUrl} target="_blank" rel="noopener noreferrer">{label}</a>;
}

export default function Course(){
	return <>
		<Header/>
		<main>
			<section className="dark-section relative overflow-hidden py-14 md:py-20">
				<div className="container grid items-center gap-10 lg:grid-cols-[1.25fr_.75fr]">
					<div>
						<span className="pill">🔥 LIMITED-TIME COURSE OFFER</span>
						<h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight text-white md:text-6xl">Share Market Complete Course</h1>
						<p className="mt-4 text-xl font-semibold text-green-300">Beginner → Advanced</p>
						<div className="mt-8 grid gap-3 text-slate-200 sm:grid-cols-3">
							<p className="flex items-center gap-2"><span aria-hidden="true">🎥</span>13+ Hours Video Lectures</p>
							<p className="flex items-center gap-2"><span aria-hidden="true">📚</span>Structured Learning</p>
							<p className="flex items-center gap-2"><span aria-hidden="true">♾️</span>Lifetime Access</p>
						</div>
					</div>
					<aside className="rounded-2xl border border-white/15 bg-white p-6 shadow-2xl sm:p-8">
						<p className="text-sm font-bold uppercase tracking-wide text-slate-500">Course offer</p>
						<p className="mt-5 text-lg text-slate-500 line-through">₹1,900</p>
						<p className="text-6xl font-black text-green-700">₹499 <span className="text-base font-bold text-slate-500">ONLY</span></p>
						<div className="mt-6"><EnrollButton label="🛒 ENROLL NOW – ₹499"/></div>
						<p className="mt-4 text-xs leading-5 text-slate-500">Secure payment is handled on Razorpay’s hosted payment page.</p>
					</aside>
				</div>
			</section>

			<section className="section">
				<div className="container grid gap-10 lg:grid-cols-[1fr_.8fr]">
					<div className="prose">
						<span className="tag">LEARN WITH A CLEAR ROADMAP</span>
						<h2 className="mt-4">Share Market Course Online: Learn Trading from Beginner to Advanced</h2>
						<p>Learning the share market can be confusing when you are starting with random videos, different strategies and complicated charts. A structured learning path can make it easier to understand the important concepts step by step.</p>
						<p>The CampusEduX Share Market Complete Course is designed for learners who want to understand the stock market, trading concepts, technical analysis and practical chart-based learning in a structured way. The course includes 13+ hours of video lectures and follows a beginner-to-advanced learning approach.</p>
					</div>
					<div className="card h-fit border-l-4 border-l-green-500">
						<h2 className="text-2xl font-black">Built for steady learning</h2>
						<p className="muted mt-3 leading-7">Explore core market concepts, read charts, and study risk-aware trading topics in a clear sequence.</p>
						<div className="mt-5 flex flex-wrap gap-2"><span className="tag">13+ hours</span><span className="tag">Self-paced</span><span className="tag">Beginner → Advanced</span></div>
					</div>
				</div>
			</section>

			<section className="section bg-white">
				<div className="container">
					<div className="max-w-2xl"><span className="tag">COURSE OUTCOMES</span><h2 className="mt-4 text-3xl font-black">What Will You Learn?</h2><p className="muted mt-3 leading-7">Build familiarity with the market and chart-based topics through a structured series of lessons.</p></div>
					<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{learningTopics.map((topic,index)=><article key={topic} className="card transition duration-200 hover:-translate-y-1 hover:border-green-300">
							<span className="text-sm font-black text-green-700">{String(index+1).padStart(2,'0')}</span><h3 className="mt-3 text-lg font-black">{topic}</h3>
						</article>)}
					</div>
				</div>
			</section>

			<section className="section">
				<div className="container">
					<div className="max-w-2xl"><span className="tag">YOUR LEARNING PATH</span><h2 className="mt-4 text-3xl font-black">Beginner to Advanced Roadmap</h2></div>
					<ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						{roadmap.map((step,index)=><li key={step} className="flex min-h-20 items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
							<span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-green-100 font-black text-green-800">{index+1}</span><span className="font-bold">{step}</span>
						</li>)}
					</ol>
				</div>
			</section>

			<section className="section bg-white">
				<div className="container grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
					<div><span className="tag">WHO CAN JOIN?</span><h2 className="mt-4 text-3xl font-black">Learn at your own pace</h2></div>
					<p className="muted text-lg leading-8">This course is suitable for beginners who want to start learning about the share market, as well as learners who already understand the basics and want to explore technical analysis, price action and trading strategies in a more organised way. The video-based format allows learners to study at their own pace using a mobile phone or laptop.</p>
				</div>
			</section>

			<section className="section">
				<div className="container">
					<div className="max-w-2xl"><span className="tag">COURSE ACCESS</span><h2 className="mt-4 text-3xl font-black">What You Get</h2></div>
					<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{courseBenefits.map(({icon:Icon,title})=><article key={title} className="card transition duration-200 hover:-translate-y-1 hover:border-green-300"><Icon aria-hidden="true" className="text-green-700" size={26}/><h3 className="mt-4 font-bold">{title}</h3></article>)}
					</div>
				</div>
			</section>

			<section className="section bg-white">
				<div className="container grid gap-10 lg:grid-cols-[1.1fr_.9fr]">
					<div><span className="tag">COURSE CURRICULUM</span><h2 className="mt-4 text-3xl font-black">Explore the course modules</h2><div className="mt-6 grid gap-3">
						{courseModules.map(module=><article key={module[0]} className="flex gap-4 rounded-xl border border-slate-200 p-4"><span className="tag h-fit">{module[0]}</span><div><h3 className="font-black">{module[1]}</h3><p className="muted mt-1 text-sm leading-6">{module[2]}</p></div></article>)}
					</div></div>
					<aside className="dark-section h-fit rounded-2xl p-6 text-white sm:p-8">
						<span className="pill">🔥 LIMITED-TIME OFFER</span><p className="mt-6 text-sm text-slate-300">Regular Price</p><p className="text-xl font-bold line-through text-slate-400">₹1,900</p><p className="mt-4 text-sm text-slate-300">Offer Price</p><p className="text-5xl font-black text-green-300">₹499</p><p className="mt-3 font-bold text-yellow-300">Save ₹1,401</p><div className="mt-7"><EnrollButton label="🎓 GET COURSE FOR ₹499"/></div>
					</aside>
				</div>
			</section>

			<section className="section">
				<div className="container rounded-2xl bg-[#0b1d31] px-6 py-10 text-white sm:px-10 md:py-14">
					<div className="max-w-3xl"><span className="pill">START LEARNING</span><h2 className="mt-5 text-3xl font-black md:text-4xl">Start Your Share Market Learning Journey</h2><p className="mt-5 leading-8 text-slate-300">If you are looking for a structured share market course online that takes you from basic concepts towards advanced trading topics, the CampusEduX Share Market Complete Course can give you a clear learning roadmap.</p><p className="mt-3 leading-8 text-slate-300">Start learning at your own pace and build your understanding of the market, charts, trading concepts and risk management.</p><div className="mt-7"><EnrollButton label="🚀 ENROLL NOW – ₹499"/></div></div>
				</div>
			</section>

			<section className="section bg-white">
				<div className="container max-w-4xl"><span className="tag">COMMON QUESTIONS</span><h2 className="mt-4 text-3xl font-black">Frequently Asked Questions</h2><div className="mt-6 grid gap-3">
					{questions.map(([question,answer])=><details key={question} className="card group"><summary className="cursor-pointer list-none pr-8 font-black marker:hidden">{question}<span aria-hidden="true" className="float-right text-green-700 group-open:rotate-45">+</span></summary><p className="muted mt-4 leading-7">{answer}</p></details>)}
				</div></div>
			</section>

			<section className="section">
				<div className="container"><div className="notice"><h2 className="text-xl font-black">Important Disclaimer</h2><p className="mt-3 leading-7">This course is provided for educational and informational purposes only. Trading and investing in financial markets involve risk. No profit, return or specific financial result is guaranteed. The course should not be considered personalised financial or investment advice. Learners should conduct their own research and make financial decisions according to their individual risk tolerance.</p></div></div>
			</section>
		</main>
		<Footer/>
	</>;
}
