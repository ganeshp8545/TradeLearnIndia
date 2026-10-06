import './globals.css'; import type {Metadata} from 'next';

const siteUrl = 'https://market.campusedux.com';
const siteTitle = 'TradeLearnIndia | Share Market Education';
const siteDescription = 'Learn Indian stock market, shares, mutual funds, trading, technical analysis and risk management.';

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title: {default: siteTitle, template: '%s | TradeLearnIndia'},
	description: siteDescription,
	alternates: {canonical: '/'},
	openGraph: {
		type: 'website',
		locale: 'en_IN',
		url: '/',
		siteName: 'TradeLearnIndia',
		title: siteTitle,
		description: siteDescription,
	},
	twitter: {card: 'summary', title: siteTitle, description: siteDescription},
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
