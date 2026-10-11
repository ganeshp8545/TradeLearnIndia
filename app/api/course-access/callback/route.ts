import {limitCourseRequest} from '@/lib/course-request-security';
import {NextResponse} from 'next/server';
import {verifyAndGrantCourseAccess, isAllowedCourseOrigin} from '@/lib/course-access';

export const runtime = 'nodejs';

function reply(status: string, httpStatus = 200) {
  return NextResponse.json({status}, {
    status: httpStatus,
    headers: {'Cache-Control': 'no-store, max-age=0'},
  });
}

export async function POST(request: Request) {
  if (!isAllowedCourseOrigin(request)) return reply('failed', 403);
  try {
    if (!await limitCourseRequest(request, 'payment-verify', 300, 3600)) return reply('pending', 429);
    const body = await request.json() as Record<string, unknown>;
    const orderId = typeof body.razorpay_order_id === 'string' ? body.razorpay_order_id : '';
    const paymentId = typeof body.razorpay_payment_id === 'string' ? body.razorpay_payment_id : '';
    const signature = typeof body.razorpay_signature === 'string' ? body.razorpay_signature : '';

    if (!orderId || !paymentId || !signature) return reply('not_found', 400);

    const result = await verifyAndGrantCourseAccess({orderId, paymentId, signature});
    if (result.status === 'failed') return reply('failed', 401);
    if (result.status === 'pending' || result.status === 'not_found') return reply(result.status === 'pending' ? 'pending' : 'not_found', result.status === 'pending' ? 202 : 400);

    const response = reply('success');
    if (result.sessionToken) {
      response.cookies.set('course_access_session', result.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60,
      });
    }
    return response;
  } catch {
    console.error('Course callback verification unavailable');
    return reply('pending', 503);
  }
}