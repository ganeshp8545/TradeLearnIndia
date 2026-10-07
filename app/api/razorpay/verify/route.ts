import {NextResponse} from 'next/server';
import {verifyAndGrantCourseAccess} from '@/lib/course-access';

export const runtime = 'nodejs';

function reply(status: string, httpStatus = 200) {
  return NextResponse.json({status}, {
    status: httpStatus,
    headers: {'Cache-Control': 'no-store, max-age=0'},
  });
}

export async function POST(request: Request) {
  let orderId = '';
  let paymentId = '';
  try {
    const body = await request.json() as {
      razorpay_payment_id?: string;
      razorpay_order_id?: string;
      razorpay_signature?: string;
    };
    paymentId = body.razorpay_payment_id?.trim() ?? '';
    orderId = body.razorpay_order_id?.trim() ?? '';
    const signature = body.razorpay_signature?.trim() ?? '';

    if (!paymentId || !orderId || !signature) {
      console.warn('Razorpay verification rejected', {orderId, paymentId, reason: 'missing_callback_fields'});
      return reply('not_found', 400);
    }

    const result = await verifyAndGrantCourseAccess({orderId, paymentId, signature});
    if (result.status === 'failed') {
      console.warn('Razorpay verification rejected', {orderId, paymentId, reason: 'invalid_signature'});
      return reply('failed', 401);
    }
    if (result.status === 'pending') {
      console.warn('Razorpay verification pending', {orderId, paymentId, reason: 'payment_not_verified'});
      return reply('pending', 202);
    }
    if (result.status === 'not_found') {
      return reply('not_found', 400);
    }

    const response = reply('success');
    if (result.accessToken) {
      response.cookies.set('course_access_token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60,
      });
    }
    return response;
  } catch (error) {
    console.error('Razorpay payment verification error', {
      orderId,
      paymentId,
      reason: error instanceof Error ? error.message : 'unknown_error',
    });
    return reply('pending', 503);
  }
}
