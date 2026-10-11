import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {COURSE_SLUG, getCoursePricePaise, recordCoursePayment, isAllowedCourseOrigin} from '@/lib/course-access';

import {limitCourseRequest} from '@/lib/course-request-security';

export const runtime = 'nodejs';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export async function POST(request: Request) {
  if (!isAllowedCourseOrigin(request)) return NextResponse.json({error: 'Invalid request origin'}, {status: 403});
  try {
    if (!await limitCourseRequest(request, 'checkout', 15, 3600)) return NextResponse.json({error: 'Too many checkout attempts. Please try again later.'}, {status: 429});
    const keyId = requiredEnv('RAZORPAY_KEY_ID');
    const keySecret = requiredEnv('RAZORPAY_KEY_SECRET');
    const amount = getCoursePricePaise();
    const timestamp = Date.now().toString(36).slice(-11);
    const receipt = `course_${timestamp}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const payload = {
      amount,
      currency: 'INR',
      receipt,
      notes: {course: COURSE_SLUG},
    };

    const authorization = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authorization}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.json() as {id?: string; amount?: number; currency?: string; error?: {description?: string}};
    if (!response.ok || !data.id || data.amount !== amount || data.currency !== 'INR') {
      throw new Error(data.error?.description ?? 'Razorpay order creation failed');
    }

    await recordCoursePayment({
      orderId: data.id,
      paymentId: null,
      name: null,
      email: null,
      amount,
      currency: 'INR',
      status: 'pending',
      courseSlug: COURSE_SLUG,
    });

    return NextResponse.json({
      orderId: data.id,
      amount,
      currency: 'INR',
      keyId,
    });
  } catch {
    console.error('Razorpay order creation unavailable');
    return NextResponse.json({error: 'Unable to create payment order.'}, {status: 500});
  }
}
