import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {COURSE_PRICE_PAISE, COURSE_SLUG, getCoursePricePaise, recordCoursePayment, isAllowedCourseOrigin} from '@/lib/course-access';
import {limitCourseRequest} from '@/lib/course-request-security';

export const runtime = 'nodejs';

type Stage = 'configuration' | 'rate_limit' | 'provider' | 'database';
function log(requestId: string, stage: Stage, outcome: string, fields: Record<string, string | number> = {}) {
  console.info('CHECKOUT_DIAGNOSTIC', JSON.stringify({requestId, route: '/api/razorpay/create-order', stage, outcome, ...fields}));
}
function fail(requestId: string, status: number, error: string) {
  return NextResponse.json({error, requestId}, {status, headers: {'Cache-Control': 'no-store'}});
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  if (!isAllowedCourseOrigin(request)) return fail(requestId, 403, 'Invalid request origin. Please reload the course page.');

  const missing = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'COURSE_ACCESS_SECRET']
    .filter(name => !process.env[name]);
  if (missing.length) {
    log(requestId, 'configuration', 'missing', {keys: missing.join(',')});
    return fail(requestId, 503, 'Checkout is temporarily unavailable. Please contact support with this reference.');
  }
  let amount: number;
  try {
    amount = getCoursePricePaise();
    if (amount !== COURSE_PRICE_PAISE || !Number.isSafeInteger(amount)) throw new Error('Invalid configured price');
  } catch {
    log(requestId, 'configuration', 'invalid');
    return fail(requestId, 503, 'Checkout is temporarily unavailable. Please contact support with this reference.');
  }
  try {
    if (!await limitCourseRequest(request, 'checkout', 15, 3600)) {
      log(requestId, 'rate_limit', 'rejected');
      return fail(requestId, 429, 'Too many checkout attempts. Please try again later.');
    }
  } catch {
    log(requestId, 'rate_limit', 'unavailable');
    return fail(requestId, 503, 'Checkout is temporarily unavailable. Please try again shortly.');
  }

  const receipt = `course_${Date.now().toString(36)}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const authorization = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  let order: {id?: string; amount?: number; currency?: string};
  const started = Date.now();
  try {
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST', headers: {Authorization: `Basic ${authorization}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({amount, currency: 'INR', receipt, notes: {course: COURSE_SLUG}}),
      cache: 'no-store', signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      log(requestId, 'provider', 'http_error', {httpStatus: response.status, durationMs: Date.now() - started});
      return fail(requestId, 502, 'Payment provider is unavailable. Please try again shortly.');
    }
    order = await response.json();
    if (!/^order_[A-Za-z0-9]{1,100}$/.test(order.id ?? '') || order.amount !== amount || order.currency !== 'INR') {
      log(requestId, 'provider', 'invalid_order', {durationMs: Date.now() - started});
      return fail(requestId, 502, 'Payment provider returned an invalid order. Please try again.');
    }
    log(requestId, 'provider', 'created', {durationMs: Date.now() - started});
  } catch {
    log(requestId, 'provider', 'network_error', {durationMs: Date.now() - started});
    return fail(requestId, 502, 'Payment provider is unavailable. Please try again shortly.');
  }
  const dbStarted = Date.now();
  try {
    await recordCoursePayment({orderId: order.id!, paymentId: null, name: null, email: null,
      amount, currency: 'INR', status: 'pending', courseSlug: COURSE_SLUG});
    log(requestId, 'database', 'recorded', {durationMs: Date.now() - dbStarted});
  } catch {
    log(requestId, 'database', 'write_failed', {durationMs: Date.now() - dbStarted});
    return fail(requestId, 503, 'Checkout is temporarily unavailable. Please try again shortly.');
  }
  return NextResponse.json({orderId: order.id, amount, currency: 'INR', keyId: process.env.RAZORPAY_KEY_ID},
    {headers: {'Cache-Control': 'no-store'}});
}
