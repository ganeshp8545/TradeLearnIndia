import {NextRequest, NextResponse} from 'next/server';
import {CourseAccessTimingEvent, createAccessToken, exchangeAccessTokenForSession, getValidCourseAccessRecord, hashAccessToken} from '@/lib/course-access';

export const runtime = 'nodejs';

const ROUTE = '/api/course-access/verify';

function diagnostic(event: string, fields: Record<string, unknown> = {}) {
	console.info('COURSE_ACCESS_DIAGNOSTIC', JSON.stringify({
		timestamp: new Date().toISOString(),
		route: ROUTE,
		method: 'GET',
		event,
		...fields,
	}));
}

export async function GET(request: NextRequest) {
	const startedAt = Date.now();
	const timing = ({operation, durationMs, success}: CourseAccessTimingEvent) => {
		diagnostic('SUPABASE_OPERATION_END', {operation, durationMs, success});
	};
	const finish = (response: NextResponse, state: string, validationBranch: 'raw-token' | 'invalid' | 'missing', sessionCreated: boolean) => {
		diagnostic('VERIFY_END', {
			state,
			validationBranch,
			sessionCreated,
			redirectGenerated: true,
			httpStatus: response.status,
			totalDurationMs: Date.now() - startedAt,
		});
		return response;
	};
	diagnostic('VERIFY_START');
	const token = new URL(request.url).searchParams.get('token') ?? request.cookies.get('course_access_token')?.value;
	diagnostic('RAW_TOKEN_DETECTED', {detected: Boolean(token)});
	if (!token || token.length > 128) {
		const response = NextResponse.redirect(new URL('/course-access?state=invalid', request.url));
		return finish(response, !token ? 'missing' : 'invalid', !token ? 'missing' : 'invalid', false);
	}

	try {
		const lookupStartedAt = Date.now();
		diagnostic('TOKEN_LOOKUP_START');
		const activeAccess = await getValidCourseAccessRecord(token, undefined, timing);
		diagnostic('TOKEN_LOOKUP_END', {durationMs: Date.now() - lookupStartedAt, authorized: Boolean(activeAccess)});
		if (!activeAccess) {
			const response = NextResponse.redirect(new URL('/course-access?state=invalid', request.url));
			return finish(response, 'invalid', 'invalid', false);
		}

		const sessionToken = createAccessToken();
		const exchangeStartedAt = Date.now();
		diagnostic('TOKEN_EXCHANGE_START');
		const payment = await exchangeAccessTokenForSession(hashAccessToken(token), hashAccessToken(sessionToken), timing);
		diagnostic('TOKEN_EXCHANGE_END', {durationMs: Date.now() - exchangeStartedAt, success: Boolean(payment)});
		if (!payment) {
			const response = NextResponse.redirect(new URL('/course-access?state=invalid', request.url));
			return finish(response, 'invalid', 'invalid', false);
		}
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
		return finish(response, 'success', 'raw-token', true);
	} catch {
		diagnostic('VERIFY_ERROR');
		const response = NextResponse.redirect(new URL('/course-access?state=error', request.url));
		return finish(response, 'error', 'raw-token', false);
	}
}
