import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {COURSE_SLUG, getCoursePricePaise} from '@/lib/course-access';

export const runtime = 'nodejs';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export async function POST() {
  try {
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
    });

    const data = await response.json() as {id?: string; amount?: number; currency?: string; error?: {description?: string}};
    if (!response.ok || !data.id || data.amount !== amount || data.currency !== 'INR') {
      throw new Error(data.error?.description ?? 'Razorpay order creation failed');
    }

    return NextResponse.json({
      orderId: data.id,
      amount,
      currency: 'INR',
      keyId,
    });
  } catch (error) {
    console.error('Razorpay order creation failed', error);
    return NextResponse.json({error: 'Unable to create payment order.'}, {status: 500});
  }
}
