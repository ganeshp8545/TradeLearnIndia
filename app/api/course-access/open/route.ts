import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {consumeAccessCredential, getValidCourseAccessRecord, hashAccessToken} from '@/lib/course-access';

export const runtime = 'nodejs';

function isAllowedRequestOrigin(requestOrigin: string | null): boolean {
	if (!requestOrigin) return false;

	try {
		const origin = new URL(requestOrigin).origin;
		if (process.env.NODE_ENV === 'development') {
			return origin === 'http://localhost:3000' || origin === 'http://127.0.0.1:3000';
		}

		const configuredOrigin = process.env.APP_BASE_URL;
		return Boolean(configuredOrigin && origin === new URL(configuredOrigin).origin);
	} catch {
		return false;
	}
}

export async function POST(request: Request) {
	if (!isAllowedRequestOrigin(request.headers.get('origin'))) {
		return NextResponse.json({error: 'Invalid request origin'}, {status: 403});
	}

	try {
		const driveUrl = process.env.COURSE_DRIVE_URL;
		if (!driveUrl) throw new Error('Missing required environment variable: COURSE_DRIVE_URL');
		const destination = new URL(driveUrl);
		if (destination.protocol !== 'https:' || destination.hostname !== 'drive.google.com') {
			throw new Error('COURSE_DRIVE_URL must be an HTTPS Google Drive URL');
		}

		const cookieStore = await cookies();
		const token = cookieStore.get('course_access_token')?.value;
		const session = cookieStore.get('course_access_session')?.value;
		const tokenAuthorization = token ? await getValidCourseAccessRecord(token) : null;
		const sessionAuthorization = !tokenAuthorization && session
			? await getValidCourseAccessRecord(undefined, session)
			: null;
		if (!tokenAuthorization && !sessionAuthorization) {
			return NextResponse.redirect(new URL('/course-access?state=invalid', request.url), 303);
		}

		const used = tokenAuthorization && token
			? await consumeAccessCredential('access_token_hash', 'access_token_expires_at', hashAccessToken(token))
			: sessionAuthorization && session
				? await consumeAccessCredential('access_session_hash', 'access_session_expires_at', hashAccessToken(session))
				: null;
		if (!used) return NextResponse.redirect(new URL('/course-access?state=invalid', request.url), 303);

		const response = NextResponse.redirect(destination, 303);
		response.cookies.set('course_access_token', '', {httpOnly: true, path: '/', maxAge: 0});
		response.cookies.set('course_access_session', '', {httpOnly: true, path: '/', maxAge: 0});
		return response;
	} catch (error) {
		console.error('Course access redirect failed', error);
		return NextResponse.redirect(new URL('/course-access?state=error', request.url), 303);
	}
}
