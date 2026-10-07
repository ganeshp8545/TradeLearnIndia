import {COURSE_ORIGINAL_PRICE_INR, COURSE_PRICE_INR, COURSE_PRICE_SAVING_INR, formatINR} from '@/lib/course-pricing';

export const showPlaceholders = false;

const PLACEHOLDER_RE = /(placeholder|replace this|replace with)/i;

export type CourseLesson = {title: string; duration?: string; freePreview?: boolean};
export type CourseModule = {title: string; lessons: CourseLesson[]};

function hasPlaceholderText(value?: string | null): boolean {
	if (!value) return true;
	return PLACEHOLDER_RE.test(value);
}

export function getVisibleCurriculum(): CourseModule[] {
	return coursePageData.curriculum
		.filter((module) => !hasPlaceholderText(module.title))
		.map((module) => ({...module, lessons: module.lessons.filter((lesson) => !hasPlaceholderText(lesson.title))}))
		.filter((module) => module.lessons.length > 0);
}

export function getVisibleGallery() {
	return coursePageData.gallery.filter((item) => item.image && !hasPlaceholderText(item.title) && !hasPlaceholderText(item.description));
}

export function getVisibleInstructor() {
	const instructor = coursePageData.instructor;
	if (!showPlaceholders && (!instructor.name || hasPlaceholderText(instructor.name) || hasPlaceholderText(instructor.bio) || hasPlaceholderText(instructor.experience))) {
		return null;
	}
	return instructor;
}

// This sales-page data is the editing surface for copy and course details.
// The live checkout amount stays canonical in course-access.ts and is referenced here.
export const coursePageData = {
	brand: 'TradeLearnIndia by CampusEduX',
	name: 'Share Market Complete Course',
	seo: {
		title: 'Share Market Complete Course | TradeLearnIndia by CampusEduX',
		description: 'Learn share market fundamentals, technical analysis, price action, trading strategies and risk management with structured, practical lessons.',
		keywords: ['share market course online', 'stock market course for beginners', 'technical analysis course', 'price action trading course', 'trading course India'],
	},
	hero: {
		eyebrow: 'A structured learning path',
		headline: 'Understand the market. Build your own process.',
		subheadline: 'A practical share market course: market basics, chart analysis, trading concepts and risk management, one clear lesson at a time.',
		trustPoints: ['Beginner to Advanced', 'Practical chart-based'],
		videoUrl: '', // Add an embeddable video URL when the course preview is ready.
	},
	pricing: {
		priceInr: COURSE_PRICE_INR,
		originalPriceInr: COURSE_ORIGINAL_PRICE_INR,
		savingInr: COURSE_PRICE_SAVING_INR,
		offerEndDate: null as string | null, // ISO date/time; leave null without a real deadline.
	},
	stats: {
		videoHours: '13+ hours',
		language: 'Hindi',
		access: 'Lifetime access',
		devices: 'Mobile + laptop',
	},
	topics: [
		{title: 'Share Market Basics', description: 'Learn how shares, exchanges and market participants fit together.', icon: 'book'},
		{title: 'Technical Analysis', description: 'Read price charts and understand commonly used indicators.', icon: 'chart'},
		{title: 'Price Action', description: 'Study price movement, candles and market structure.', icon: 'activity'},
		{title: 'Support & Resistance', description: 'Identify areas where price has reacted before.', icon: 'layers'},
		{title: 'Trading Strategies', description: 'Explore repeatable frameworks for planning a trade.', icon: 'target'},
		{title: 'Bank Nifty Strategies', description: 'Understand index behaviour and strategy concepts.', icon: 'trending'},
		{title: 'Swing Trading', description: 'Learn the basics of holding trades across multiple sessions.', icon: 'chart'},
		{title: 'Intraday Concepts', description: 'Understand the structure and risks of intraday trading.', icon: 'activity'},
		{title: 'Risk & Money Management', description: 'Plan position risk and protect your capital.', icon: 'shield'},
		{title: 'Trading Psychology', description: 'Recognise habits that can affect trading decisions.', icon: 'brain'},
		{title: 'Practical Chart Analysis', description: 'Apply course concepts to illustrative market charts.', icon: 'search'},
	],
	curriculum: [
		{title: 'Price Action and Support and Resistance', lessons: [
			{title: 'Support and Resistance'},
			{title: 'Price Action A to Z'},
		]},
		{title: 'Swing Trading Strategies', lessons: [
			{title: 'Swing Trading: Inside Range Breakout Strategy'},
			{title: 'Swing Trading: Fractal Breakout Strategy'},
			{title: 'Swing Trading: Fire Flow Strategy'},
			{title: 'Swing Trading: CPR Strategy'},
		]},
		{title: 'Index and Commodity Strategies', lessons: [
			{title: 'Bank Nifty Super Fire Strategy'},
			{title: 'Super Fire Strategy Update'},
			{title: 'Crude Oil Strategy'},
		]},
		{title: 'Stock and Investment Strategies', lessons: [
			{title: 'Stock Blast Strategy'},
			{title: 'Life Save Investment'},
		]},
	] as CourseModule[],
	sample: {
		lessonUrl: '', // Add a public sample lesson URL, or leave empty to hide that link.
		pdfUrl: '', // Add a public sample PDF URL, or leave empty to hide that link.
	},
	instructor: {
		name: 'Instructor name to be added',
		role: 'Course instructor',
		photo: '', // Add a local public path such as /images/course/instructor.webp.
		experience: 'Add verified teaching or market experience.',
		bio: 'Replace this placeholder with a short, factual instructor biography and teaching approach.',
	},
	audience: {
		for: ['New learners who want a structured introduction to the share market.', 'Learners who want to understand charts and common trading concepts.', 'Self-paced learners who can study from a mobile or laptop.'],
		notFor: ['Anyone looking for guaranteed profits or sure-shot calls.', 'Anyone expecting personal investment advice or managed trades.', 'Anyone unwilling to learn risk management before trading.'],
	},
	gallery: [
		{title: 'Chart example 01', description: 'Replace with a real course screenshot or chart walkthrough.', image: ''},
		{title: 'Chart example 02', description: 'Replace with a real course screenshot or chart walkthrough.', image: ''},
		{title: 'Lesson example', description: 'Replace with a real course lesson screenshot.', image: ''},
	],
	testimonials: [] as {name: string; detail: string; quote: string}[],
	bonuses: [] as {title: string; description: string}[],
	includes: ['13+ hours of recorded video lessons', 'Beginner-to-advanced learning sequence', 'Practical chart-based explanations', 'Self-paced learning on mobile and laptop', 'Lifetime access to course materials'],
	steps: [
		{title: 'Pay', description: 'Complete checkout securely using Razorpay.'},
		{title: 'Get access', description: 'Follow the on-screen course-access steps after payment.'},
		{title: 'Start learning', description: 'Open your lessons and learn at your own pace.'},
	],
	policies: {refundUrl: '/refund-policy', termsUrl: '/terms', privacyUrl: '/privacy-policy', contactUrl: '/contact'},
	support: {
		whatsappNumber: '919370764290',
		whatsappDisplay: '+91 93707 64290',
		email: 'campusedux@gmail.com',
		hours: '10 AM–7 PM',
	},
	faqs: [
		{question: 'How long can I access the course?', answer: 'The course includes lifetime access to the course materials, subject to the access terms shown during enrolment.'},
		{question: 'What language is the course in?', answer: 'The current course language is Hindi.'},
		{question: 'Can I learn on my phone?', answer: 'Yes. You can access the lessons on a compatible mobile phone or laptop with an internet connection.'},
		{question: 'My payment failed or access did not open. What should I do?', answer: 'Check your payment status first. If money was debited or access is still unavailable, contact support with your payment reference so the team can help.'},
		{question: 'Will I receive a certificate?', answer: 'Certificate availability is not currently confirmed. Contact support before enrolling if a certificate is important to you.'},
		{question: 'What is the refund policy?', answer: 'Please read the full refund policy before purchase. Refund eligibility is governed by that policy.'},
		{question: 'When is support available?', answer: 'Course support is available between 10 AM and 7 PM. Response time may vary.'},
	],
};

export function formatCoursePrice(amount: number) {
	return formatINR(amount);
}
