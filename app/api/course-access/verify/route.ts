import {NextResponse} from 'next/server';
import {exchangeAccessTokenForSession, hashAccessToken, createAccessToken} from '@/lib/course-access';

export const runtime = 'nodejs';

export async function GET(request: Request) {
	const token = new URL(request.url).searchParams.get('token');
	if (!token || token.length > 128) return NextResponse.redirect(new URL('/course-access?state=invalid', request.url));

	try {
		const sessionToken = createAccessToken();
		const payment = await exchangeAccessTokenForSession(hashAccessToken(token), hashAccessToken(sessionToken));
		if (!payment) return NextResponse.redirect(new URL('/course-access?state=invalid', request.url));
		const response = NextResponse.redirect(new URL('/course-access', request.url));
		response.cookies.set('course_access_session', sessionToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			path: '/',
			maxAge: 24 * 60 * 60,
		});
		return response;
	} catch (error) {
		console.error('Course access token verification failed', error);
		return NextResponse.redirect(new URL('/course-access?state=error', request.url));
	}
}