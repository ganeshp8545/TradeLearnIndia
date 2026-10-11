import {NextResponse} from 'next/server';
import {COURSE_SLUG, reconcileCoursePayment} from '@/lib/course-access';
import {verifyRazorpayWebhookSignature} from '@/lib/razorpay-webhook';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!secret) throw new Error('Webhook configuration missing');
        const rawBody = await request.text();
        if (!verifyRazorpayWebhookSignature(rawBody, request.headers.get('x-razorpay-signature'), secret)) {
            return NextResponse.json({error: 'Invalid webhook signature'}, {status: 401});
        }
        const event = JSON.parse(rawBody);
        if (!['payment.captured', 'payment.failed'].includes(event?.event)) return NextResponse.json({received: true});
        const payment = event?.payload?.payment?.entity;
        const course = payment?.notes?.course ?? event?.payload?.order?.entity?.notes?.course;
        if (typeof course === 'string' && course !== COURSE_SLUG) return NextResponse.json({received: true});
        if (typeof payment?.order_id !== 'string' || typeof payment?.id !== 'string') {
            return NextResponse.json({error: 'Missing payment reference'}, {status: 400});
        }
        const captured = await reconcileCoursePayment(payment.order_id, payment.id);
        // A captured event arriving before the API reflects capture must be retried.
        // Failed/late events cannot downgrade a verified entitlement in the RPC.
        if (event.event === 'payment.captured' && !captured) {
            return NextResponse.json({error: 'Capture reconciliation pending'}, {status: 503});
        }
        return NextResponse.json({received: true});
    } catch {
        console.error('Razorpay webhook reconciliation unavailable');
        return NextResponse.json({error: 'Webhook processing unavailable'}, {status: 503});
    }
}
