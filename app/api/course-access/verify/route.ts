import {NextRequest, NextResponse} from 'next/server';
import {createAccessToken, exchangeAccessTokenForSession, hashAccessToken, isAllowedCourseOrigin} from '@/lib/course-access';
import {limitCourseRequest} from '@/lib/course-request-security';

export const runtime = 'nodejs';

// Legacy emailed URLs get a confirmation screen; GET never consumes a link.
export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get('token') ?? request.cookies.get('course_access_token')?.value;
    const destination = new URL('/course-access/recover', request.url);
    if (token && /^[A-Za-z0-9_-]{32,128}$/.test(token)) destination.hash = `token=${token}`;
    const response = NextResponse.redirect(destination, 303);
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('Referrer-Policy', 'no-referrer');
    return response;
}

export async function POST(request: NextRequest) {
    if (!isAllowedCourseOrigin(request)) return NextResponse.json({error: 'Invalid request origin'}, {status: 403});
    try {
        if (!await limitCourseRequest(request, 'recovery-confirm', 30, 3600)) {
            return NextResponse.json({error: 'Too many attempts. Please try again later.'}, {status: 429});
        }
        const body = await request.json();
        const token = typeof body?.token === 'string' ? body.token : '';
        if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) return NextResponse.json({error: 'Link invalid or expired. Request another recovery email.'}, {status: 400});
        const session = createAccessToken();
        const payment = await exchangeAccessTokenForSession(hashAccessToken(token), hashAccessToken(session));
        if (!payment) return NextResponse.json({error: 'Link invalid or expired. Request another recovery email.'}, {status: 400});
        const response = NextResponse.json({ok: true}, {headers: {'Cache-Control': 'no-store'}});
        response.cookies.set('course_access_session', session, {httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 86400});
        response.cookies.set('course_access_token', '', {httpOnly: true, path: '/', maxAge: 0});
        return response;
    } catch {
        return NextResponse.json({error: 'Recovery temporarily unavailable. Please try again.'}, {status: 503});
    }
}
