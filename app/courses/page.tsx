import type {Metadata} from 'next';
import {Footer, Header} from '@/components/Site';
import {CourseLandingPage} from '@/components/CourseLandingPage';
import {coursePageData, formatCoursePrice} from '@/lib/course-page-data';

const siteUrl = 'https://market.campusedux.com';
const courseUrl = `${siteUrl}/courses`;
const description = coursePageData.seo.description;

export const metadata: Metadata = {
	title: {absolute: coursePageData.seo.title},
	description,
	keywords: coursePageData.seo.keywords,
	alternates: {canonical: '/courses'},
	openGraph: {
		title: coursePageData.seo.title,
		description,
		type: 'website',
		url: courseUrl,
		images: [{url: '/courses/opengraph-image', width: 1200, height: 630, alt: coursePageData.seo.title}],
	},
	twitter: {card: 'summary_large_image', title: coursePageData.seo.title, description, images: ['/courses/opengraph-image']},
};

function jsonLd(value: unknown) {
	return {__html: JSON.stringify(value).replace(/</g, '\\u003c')};
}

export default function Courses() {
	const courseSchema = {
		'@context': 'https://schema.org',
		'@type': 'Course',
		name: coursePageData.name,
		description,
		url: courseUrl,
		provider: {'@type': 'Organization', name: coursePageData.brand, url: siteUrl},
		inLanguage: coursePageData.stats.language,
		offers: {
			'@type': 'Offer',
			url: courseUrl,
			priceCurrency: 'INR',
			price: String(coursePageData.pricing.priceInr),
			availability: 'https://schema.org/InStock',
			priceSpecification: {'@type': 'PriceSpecification', priceCurrency: 'INR', price: String(coursePageData.pricing.originalPriceInr), priceType: 'https://schema.org/ListPrice'},
		},
	};
	const faqSchema = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: coursePageData.faqs.map(({question, answer}) => ({
			'@type': 'Question',
			name: question,
			acceptedAnswer: {'@type': 'Answer', text: answer},
		})),
	};

	return <>
		<Header/>
		<CourseLandingPage enrollLabel={`Enroll Now – ${formatCoursePrice(coursePageData.pricing.priceInr)}`}/>
		<Footer/>
		<script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(courseSchema)}/>
		<script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqSchema)}/>
	</>;
}
