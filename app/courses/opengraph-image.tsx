import {ImageResponse} from 'next/og';
import {COURSE_PRICE_INR, COURSE_VIDEO_COUNT, formatINR} from '@/lib/course-pricing';

export const alt = 'TradeLearnIndia Share Market Educational Course';
export const size = {width: 1200, height: 630};
export const contentType = 'image/png';

export default function OpenGraphImage() {
	return new ImageResponse(
		<div style={{background: 'linear-gradient(125deg, #071523, #0b233a)', color: 'white', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', padding: '80px', width: '100%'}}>
			<div style={{color: '#f0cf6b', display: 'flex', fontSize: 24, fontWeight: 700, letterSpacing: 3}}>CAMPUSEDUX · STRUCTURED MARKET EDUCATION</div>
			<div style={{display: 'flex', fontSize: 68, fontWeight: 800, letterSpacing: -2, lineHeight: 1.08, marginTop: 28}}>Share Market Educational Course</div>
			<div style={{color: '#c7d1dd', display: 'flex', fontSize: 30, marginTop: 26}}>Price-Action and Market Strategy Topics</div>
			<div style={{color: '#74e2ae', display: 'flex', fontSize: 28, fontWeight: 700, marginTop: 44}}>{COURSE_VIDEO_COUNT} video lessons · {formatINR(COURSE_PRICE_INR)} · Lifetime access</div>
		</div>,
		size,
	);
}
