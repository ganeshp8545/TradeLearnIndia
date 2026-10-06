import type {MetadataRoute} from 'next';

const siteUrl = 'https://market.campusedux.com';
const paths = ['/', '/learn', '/stocks', '/indices', '/mutual-funds', '/technical-analysis', '/fundamental-analysis', '/trading', '/intraday', '/swing-trading', '/price-action', '/support-resistance', '/risk-management', '/psychology', '/portfolio', '/ipo', '/etf', '/bonds', '/derivatives', '/commodities', '/courses', '/courses/share-market-complete-course', '/articles', '/calculators', '/market-calendar', '/glossary', '/investor-awareness', '/resources', '/faq', '/about', '/contact', '/privacy-policy', '/terms', '/risk-disclaimer', '/refund-policy'];

export default function sitemap(): MetadataRoute.Sitemap {
	return paths.map((path) => ({url: `${siteUrl}${path}`, lastModified: new Date()}));
}
