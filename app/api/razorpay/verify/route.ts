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
  try {
    const body = await request.json() as {
      razorpay_payment_id?: string;
      razorpay_order_id?: string;
      razorpay_signature?: string;
    };
    const paymentId = body.razorpay_payment_id?.trim() ?? '';
    const orderId = body.razorpay_order_id?.trim() ?? '';
    const signature = body.razorpay_signature?.trim() ?? '';
    const expectedAmount = getCoursePricePaise();

    if (!paymentId || !orderId || !signature) {
      return NextResponse.json({error: 'Missing Razorpay payment details.'}, {status: 400});
    }

    if (!verifyRazorpayOrderSignature(orderId, paymentId, signature, requiredEnv('RAZORPAY_KEY_SECRET'))) {
      return NextResponse.json({error: 'Invalid Razorpay signature.'}, {status: 401});
    }

    const [order, payment, storedPayment] = await Promise.all([
      fetchRazorpay<RazorpayOrder>(`orders/${encodeURIComponent(orderId)}`),
      fetchRazorpay<RazorpayPayment>(`payments/${encodeURIComponent(paymentId)}`),
      getPaymentByOrderId(orderId),
    ]);

    const paymentMatches = payment.id === paymentId
      && payment.order_id === orderId
      && payment.amount === expectedAmount
      && payment.currency === 'INR'
      && (payment.status === 'captured' || payment.status === 'authorized');
    const orderMatches = order.id === orderId
      && order.amount === expectedAmount
      && order.currency === 'INR'
      && (order.notes?.course ?? COURSE_SLUG) === COURSE_SLUG;
    if (!paymentMatches || !orderMatches) {
      await recordCoursePayment({
        orderId,
        paymentId,
        name: payment.contact ?? null,
        email: payment.email ?? null,
        amount: payment.amount ?? 0,
        currency: payment.currency ?? 'INR',
        status: 'failed',
        courseSlug: COURSE_SLUG,
      });
      return NextResponse.json({error: 'Payment verification failed.'}, {status: 400});
    }

    await recordCoursePayment({
      orderId,
      paymentId,
      name: payment.contact ?? null,
      email: payment.email ?? null,
      amount: payment.amount ?? expectedAmount,
      currency: payment.currency ?? 'INR',
      status: 'success',
      courseSlug: COURSE_SLUG,
    });

    const response = NextResponse.json({status: 'success'});
    const token = await grantCourseAccessToken(orderId, paymentId);
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
    console.error('Razorpay payment verification failed', error);
    return NextResponse.json({error: 'Unable to verify payment.'}, {status: 500});
  }
}
