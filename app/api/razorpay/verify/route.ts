import {limitCourseRequest} from '@/lib/course-request-security';
import {NextResponse} from 'next/server';
import {CourseAccessTimingEvent, verifyAndGrantCourseAccess, isAllowedCourseOrigin} from '@/lib/course-access';

export const runtime = 'nodejs';

const ROUTE = '/api/razorpay/verify';

function diagnostic(event: string, fields: Record<string, unknown> = {}) {
  console.info('COURSE_ACCESS_DIAGNOSTIC', JSON.stringify({
    timestamp: new Date().toISOString(),
    route: ROUTE,
    method: 'POST',
    event,
    ...fields,
  }));
}

function reply(status: string, httpStatus = 200) {
  return NextResponse.json({status}, {
    status: httpStatus,
    headers: {'Cache-Control': 'no-store, max-age=0'},
  });
}

export async function POST(request: Request) {
  if (!isAllowedCourseOrigin(request)) return reply('failed', 403);
  const startedAt = Date.now();
  const timing = ({operation, durationMs, success}: CourseAccessTimingEvent) => {
    diagnostic('DEPENDENCY_END', {
      dependency: operation.startsWith('razorpay_') ? 'razorpay' : 'supabase',
      operation,
      durationMs,
      success,
    });
  };
  const finish = (status: string, httpStatus: number) => {
    diagnostic('RAZORPAY_VERIFY_END', {
      state: status,
      httpStatus,
      redirectGenerated: false,
      totalDurationMs: Date.now() - startedAt,
    });
  };
  diagnostic('RAZORPAY_VERIFY_START');
  try {
    if (!await limitCourseRequest(request, 'payment-verify', 300, 3600)) return reply('pending', 429);
    const body = await request.json() as {
      razorpay_payment_id?: string;
      razorpay_order_id?: string;
      razorpay_signature?: string;
    };
    const paymentId = typeof body?.razorpay_payment_id === 'string' ? body.razorpay_payment_id.trim() : '';
    const orderId = typeof body?.razorpay_order_id === 'string' ? body.razorpay_order_id.trim() : '';
    const signature = typeof body?.razorpay_signature === 'string' ? body.razorpay_signature.trim() : '';

    if (!paymentId || !orderId || !signature) {
      diagnostic('RAZORPAY_VERIFY_REJECTED', {state: 'missing_callback_fields'});
      const response = reply('not_found', 400);
      finish('not_found', response.status);
      return response;
    }

    const verificationStartedAt = Date.now();
    const result = await verifyAndGrantCourseAccess({orderId, paymentId, signature}, timing);
    diagnostic('RAZORPAY_VERIFICATION_END', {
      durationMs: Date.now() - verificationStartedAt,
      state: result.status,
    });
    if (result.status === 'failed') {
      const response = reply('failed', 401);
      finish('failed', response.status);
      return response;
    }
    if (result.status === 'pending') {
      const response = reply('pending', 202);
      finish('pending', response.status);
      return response;
    }
    if (result.status === 'not_found') {
      const response = reply('not_found', 400);
      finish('not_found', response.status);
      return response;
    }

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
    finish('success', response.status);
    return response;
  } catch {
    diagnostic('RAZORPAY_VERIFY_ERROR');
    const response = reply('pending', 503);
    finish('error', response.status);
    return response;
  }
}
