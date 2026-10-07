import {NextRequest, NextResponse} from 'next/server';
import {createAccessToken, exchangeAccessTokenForSession, getValidCourseAccessRecord, hashAccessToken} from '@/lib/course-access';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
	const token = new URL(request.url).searchParams.get('token') ?? request.cookies.get('course_access_token')?.value;
	if (!token || token.length > 128) return NextResponse.redirect(new URL('/course-access?state=invalid', request.url));

	try {
		const activeAccess = await getValidCourseAccessRecord(token);
		if (!activeAccess) return NextResponse.redirect(new URL('/course-access?state=invalid', request.url));

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
		// A successful exchange invalidates the database token. Remove the
		// corresponding browser cookie so it cannot shadow the new session.
		response.cookies.set('course_access_token', '', {httpOnly: true, path: '/', maxAge: 0});
		return response;
	} catch (error) {
		console.error('Course access token verification failed', error);
		return NextResponse.redirect(new URL('/course-access?state=error', request.url));
	}
}
