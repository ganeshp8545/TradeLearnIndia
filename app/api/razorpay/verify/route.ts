import {NextResponse} from 'next/server';
import {COURSE_NAME, COURSE_SLUG, getCoursePricePaise, getPaymentByOrderId, grantCourseAccessToken, recordCoursePayment} from '@/lib/course-access';
import {verifyRazorpayOrderSignature} from '@/lib/razorpay-webhook';

export const runtime = 'nodejs';

type RazorpayOrder = {
  id?: string;
  amount?: number;
  currency?: string;
  notes?: {course?: string};
};

type RazorpayPayment = {
  id?: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  email?: string | null;
  contact?: string | null;
  notes?: {course?: string};
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function reply(status: string, httpStatus = 200) {
  return NextResponse.json({status}, {
    status: httpStatus,
    headers: {'Cache-Control': 'no-store, max-age=0'},
  });
}

async function fetchRazorpay<T>(resource: string): Promise<T> {
  const keyId = requiredEnv('RAZORPAY_KEY_ID');
  const keySecret = requiredEnv('RAZORPAY_KEY_SECRET');
  const credentials = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const response = await fetch(`https://api.razorpay.com/v1/${resource}`, {
    headers: {Authorization: `Basic ${credentials}`},
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Razorpay API request failed (${response.status}) for ${resource}`);
  }
  return response.json() as Promise<T>;
}

export async function POST(request: Request) {
  let orderId = '';
  let paymentId = '';
  let internalOrderId: string | undefined;
  try {
    const body = await request.json() as {
      razorpay_payment_id?: string;
      razorpay_order_id?: string;
      razorpay_signature?: string;
    };
    paymentId = body.razorpay_payment_id?.trim() ?? '';
    orderId = body.razorpay_order_id?.trim() ?? '';
    const signature = body.razorpay_signature?.trim() ?? '';
    const expectedAmount = getCoursePricePaise();

    if (!paymentId || !orderId || !signature) {
      console.warn('Razorpay verification rejected', {orderId, paymentId, reason: 'missing_callback_fields'});
      return reply('not_found', 400);
    }

    const storedPayment = await getPaymentByOrderId(orderId);
    internalOrderId = storedPayment?.id;
    const trustedOrderId = storedPayment?.razorpay_order_id;
    if (!trustedOrderId || trustedOrderId !== orderId) {
      console.warn('Razorpay verification pending', {internalOrderId, orderId, paymentId, reason: 'server_order_not_found'});
      return reply('pending', 202);
    }

    if (!verifyRazorpayOrderSignature(trustedOrderId, paymentId, signature, requiredEnv('RAZORPAY_KEY_SECRET'))) {
      console.warn('Razorpay verification rejected', {internalOrderId, orderId: trustedOrderId, paymentId, reason: 'invalid_signature'});
      return reply('failed', 401);
    }

    const [order, payment] = await Promise.all([
      fetchRazorpay<RazorpayOrder>(`orders/${encodeURIComponent(trustedOrderId)}`),
      fetchRazorpay<RazorpayPayment>(`payments/${encodeURIComponent(paymentId)}`),
    ]);

    const orderMatches = order.id === trustedOrderId
      && order.amount === expectedAmount
      && order.currency === 'INR'
      && order.notes?.course === COURSE_SLUG
      && storedPayment.amount === expectedAmount
      && storedPayment.currency === 'INR'
      && storedPayment.course_name === COURSE_NAME
      && storedPayment.course_slug === COURSE_SLUG;
    const paymentMatches = payment.id === paymentId
      && payment.order_id === trustedOrderId
      && payment.amount === expectedAmount
      && payment.currency === 'INR'
      && (payment.status === 'captured' || payment.status === 'authorized');
    if (!paymentMatches || !orderMatches) {
      const reason = !orderMatches ? 'order_or_stored_payment_mismatch' : 'payment_not_verified';
      console.warn('Razorpay verification pending', {
        internalOrderId,
        orderId: trustedOrderId,
        paymentId,
        paymentStatus: payment.status ?? 'unknown',
        amount: payment.amount ?? null,
        currency: payment.currency ?? null,
        reason,
      });
      return reply('pending', 202);
    }

    await recordCoursePayment({
      orderId: trustedOrderId,
      paymentId,
      name: payment.contact ?? null,
      email: payment.email ?? null,
      amount: payment.amount ?? expectedAmount,
      currency: payment.currency ?? 'INR',
      status: 'success',
      courseSlug: COURSE_SLUG,
    });

    console.info('Razorpay payment verified', {
      internalOrderId,
      orderId: trustedOrderId,
      paymentId,
      paymentStatus: payment.status,
      amount: payment.amount,
      currency: payment.currency,
    });
    const response = reply('success');
    const token = await grantCourseAccessToken(trustedOrderId, paymentId);
    if (!token) {
      return response;
    }
    response.cookies.set('course_access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    console.error('Razorpay payment verification error', {
      internalOrderId,
      orderId,
      paymentId,
      reason: error instanceof Error ? error.message : 'unknown_error',
    });
    return reply('pending', 503);
  }
}
