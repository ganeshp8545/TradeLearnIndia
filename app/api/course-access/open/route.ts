import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {CourseAccessTimingEvent, createAccessToken, exchangeAccessTokenForSession, getCourseDriveUrl, getValidCourseAccessRecord, hashAccessToken} from '@/lib/course-access';

export const runtime = 'nodejs';

const ROUTE = '/api/course-access/open';

function diagnostic(event: string, fields: Record<string, unknown> = {}) {
	console.info('COURSE_ACCESS_DIAGNOSTIC', JSON.stringify({
		timestamp: new Date().toISOString(),
		route: ROUTE,
		method: 'POST',
		event,
		...fields,
	}));
}

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
	const startedAt = Date.now();
	const timing = ({operation, durationMs, success}: CourseAccessTimingEvent) => {
		diagnostic('SUPABASE_OPERATION_END', {operation, durationMs, success});
	};
	const finish = (response: NextResponse, state: string, validationBranch: 'session' | 'raw-token' | 'invalid' | 'missing', redirectDestination: 'interstitial' | 'local' | 'none') => {
		diagnostic('OPEN_END', {
			state,
			validationBranch,
			redirectGenerated: response.status >= 300 && response.status < 400,
			redirectDestination,
			httpStatus: response.status,
			totalDurationMs: Date.now() - startedAt,
		});
		return response;
	};
	diagnostic('OPEN_START');
	if (!isAllowedRequestOrigin(request.headers.get('origin'))) {
		const response = NextResponse.json({error: 'Invalid request origin'}, {status: 403});
		return finish(response, 'invalid_origin', 'invalid', 'none');
	}

	try {
		const redirectPreparationStartedAt = Date.now();
		getCourseDriveUrl();
		diagnostic('REDIRECT_PREPARATION_END', {
			durationMs: Date.now() - redirectPreparationStartedAt,
			redirectDestination: 'same-origin-interstitial',
		});

		const cookieStore = await cookies();
		const token = cookieStore.get('course_access_token')?.value;
		const session = cookieStore.get('course_access_session')?.value;
		diagnostic('CREDENTIAL_TYPE_DETECTED', {
			rawTokenDetected: Boolean(token),
			sessionDetected: Boolean(session),
		});
		let tokenAuthorization = null;
		let sessionAuthorization = null;
		let validationBranch: 'session' | 'raw-token' | 'invalid' | 'missing' = !token && !session ? 'missing' : 'invalid';
		if (token) {
			const validationStartedAt = Date.now();
			diagnostic('RAW_TOKEN_VALIDATION_START');
			tokenAuthorization = await getValidCourseAccessRecord(token, undefined, timing);
			diagnostic('RAW_TOKEN_VALIDATION_END', {
				durationMs: Date.now() - validationStartedAt,
				authorized: Boolean(tokenAuthorization),
			});
			if (tokenAuthorization) validationBranch = 'raw-token';
		}
		if (!tokenAuthorization && session) {
			const validationStartedAt = Date.now();
			diagnostic('SESSION_VALIDATION_START');
			sessionAuthorization = await getValidCourseAccessRecord(undefined, session, timing);
			diagnostic('SESSION_VALIDATION_END', {
				durationMs: Date.now() - validationStartedAt,
				authorized: Boolean(sessionAuthorization),
			});
			if (sessionAuthorization) validationBranch = 'session';
		}
		if (!tokenAuthorization && !sessionAuthorization) {
			const response = NextResponse.redirect(new URL('/course-access?state=invalid', request.url), 303);
			return finish(response, 'unauthorized', validationBranch, 'local');
		}

		// New payment and WhatsApp flows reach this route with a session already
		// established. A session must survive the external Drive redirect so a
		// browser can retry if that navigation does not complete. The raw token is
		// still one-time: legacy raw-token requests are atomically exchanged here.
		const rawToken = tokenAuthorization && token ? token : null;
		const replacementSession = rawToken ? createAccessToken() : null;
		if (replacementSession && rawToken) {
			const exchangeStartedAt = Date.now();
			diagnostic('RAW_TOKEN_EXCHANGE_START');
			const exchanged = await exchangeAccessTokenForSession(hashAccessToken(rawToken), hashAccessToken(replacementSession), timing);
			diagnostic('RAW_TOKEN_EXCHANGE_END', {durationMs: Date.now() - exchangeStartedAt, success: Boolean(exchanged)});
			if (!exchanged) {
				const response = NextResponse.redirect(new URL('/course-access?state=invalid', request.url), 303);
				return finish(response, 'exchange_failed', 'invalid', 'local');
			}
		}

		const response = NextResponse.redirect(new URL('/course-access/redirect', request.url), 303);
		if (replacementSession) {
			response.cookies.set('course_access_token', '', {httpOnly: true, path: '/', maxAge: 0});
			response.cookies.set('course_access_session', replacementSession, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				path: '/',
				maxAge: 24 * 60 * 60,
			});
		}
		return finish(response, 'authorized', validationBranch, 'interstitial');
	} catch {
		diagnostic('OPEN_ERROR');
		const response = NextResponse.redirect(new URL('/course-access?state=error', request.url), 303);
		return finish(response, 'error', 'invalid', 'local');
	}
}
