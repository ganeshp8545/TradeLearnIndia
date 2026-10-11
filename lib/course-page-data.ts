import {COURSE_NAME, COURSE_PRICE_INR, COURSE_VIDEO_COUNT, formatINR} from '@/lib/course-pricing';

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
	name: COURSE_NAME,
	seo: {
		title: 'Share Market Educational Course | TradeLearnIndia',
		description: 'Explore 11 structured share market educational video lessons. Course fee ₹499. Review the curriculum, lifetime access terms, and refund policy before enrolling.',
		keywords: ['share market course online', 'price action course', 'swing trading course', 'support and resistance lessons', 'market strategy course India'],
	},
	hero: {
		eyebrow: 'TradeLearnIndia by CampusEduX',
		headline: COURSE_NAME,
		subheadline: `Explore share market concepts through ${COURSE_VIDEO_COUNT} structured educational video lessons. Review the complete curriculum, access terms, and refund policy before enrolling.`,
		videoUrl: '', // Add an embeddable video URL when the course preview is ready.
	},
	pricing: {
		priceInr: COURSE_PRICE_INR,
		offerEndDate: null as string | null, // ISO date/time; leave null without a real deadline.
	},
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
		for: ['Learners interested in the price-action, swing-trading and strategy topics listed in the course outline.', 'People who want to review the lesson titles before deciding whether the course suits their needs.'],
		notFor: ['Anyone seeking assured trading outcomes or stock tips.', 'Anyone expecting personal investment advice or managed trades.'],
	},
	gallery: [
		{title: 'Chart example 01', description: 'Replace with a real course screenshot or chart walkthrough.', image: ''},
		{title: 'Chart example 02', description: 'Replace with a real course screenshot or chart walkthrough.', image: ''},
		{title: 'Lesson example', description: 'Replace with a real course lesson screenshot.', image: ''},
	],
	testimonials: [] as {name: string; detail: string; quote: string}[],
	bonuses: [] as {title: string; description: string}[],
	includes: [`${COURSE_VIDEO_COUNT} pre-recorded video lessons`, 'Lifetime access to this course — see Terms', 'Course-access flow after payment verification'],
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
	},
	faqs: [
		{question: 'How long can I access the course?', answer: 'Your purchase includes lifetime access to this course, subject to the Terms. A secure access link or browser session can expire; contact support to recover access.'},
		{question: 'How do I access the course?', answer: 'After payment verification, use the course-access button to open the configured Google Drive destination. Device compatibility and file availability depend on the Drive sharing settings and course files.'},
		{question: 'My payment failed or access did not open. What should I do?', answer: 'Check your payment status first. If money was debited or access is still unavailable, contact support with your payment reference so the team can help.'},
		{question: 'Will I receive a certificate?', answer: 'Certificate availability has not been verified. Please contact support if this matters to you.'},
		{question: 'What is the refund policy?', answer: 'Purchases are generally non-refundable once valid course access has been provided, subject to applicable consumer rights. Review the full policy before purchase.'},
		{question: 'How can I contact support?', answer: 'Contact support by email or WhatsApp using the details on this page.'},
	],
};

export function formatCoursePrice(amount: number) {
	return formatINR(amount);
}
