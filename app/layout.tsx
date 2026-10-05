import './globals.css'; import type {Metadata} from 'next';
export const metadata:Metadata={title:{default:'MarketLearn | Share Market Education',template:'%s | MarketLearn'},description:'Learn Indian stock market, shares, mutual funds, trading, technical analysis and risk management.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
