import {NextResponse} from 'next/server';
import {COURSE_SLUG, getCoursePricePaise, recordCoursePayment, type PaymentStatus} from '@/lib/course-access';
import {verifyRazorpayWebhookSignature} from '@/lib/razorpay-webhook';

export const runtime = 'nodejs';

type RazorpayEntity = {
	id?: string;
	status?: string;
	amount?: number;
	currency?: string;
	email?: string | null;
	contact?: string | null;
	name?: string | null;
	order_id?: string | null;
	notes?: {course?: string};
};

type RazorpayWebhook = {
	event?: string;
	payload?: {
		payment?: {entity?: RazorpayEntity};
		order?: {entity?: {id?: string; notes?: {course?: string}}};
	};
};

function env(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`Missing required environment variable: ${name}`);
	return value;
}

export async function POST(request: Request) {
	try {
		const rawBody = await request.text();
		const signature = request.headers.get('x-razorpay-signature');
		if (!verifyRazorpayWebhookSignature(rawBody, signature, env('RAZORPAY_WEBHOOK_SECRET'))) {
			return NextResponse.json({error: 'Invalid webhook signature'}, {status: 401});
		}

		const event = JSON.parse(rawBody) as RazorpayWebhook;
		if (!['payment.captured', 'payment.failed'].includes(event.event ?? '')) {
			return NextResponse.json({received: true});
		}

		const payment = event.payload?.payment?.entity;
		if (!payment?.order_id || !payment.id) {
			return NextResponse.json({error: 'Missing payment/order information'}, {status: 400});
		}

		const courseSlug = payment.notes?.course ?? event.payload?.order?.entity?.notes?.course ?? COURSE_SLUG;
		if (courseSlug !== COURSE_SLUG) {
			return NextResponse.json({received: true});
		}

		const status: PaymentStatus = event.event === 'payment.captured' ? 'success' : 'failed';
		const amount = payment.amount ?? 0;
		const currency = payment.currency ?? 'INR';
		if (status === 'success' && (amount !== getCoursePricePaise() || currency !== 'INR')) {
			return NextResponse.json({error: 'Payment does not match the course price'}, {status: 422});
		}

		await recordCoursePayment({
			paymentId: payment.id,
			orderId: payment.order_id,
			name: payment.contact ?? payment.name ?? null,
			email: payment.email ?? null,
			amount,
			currency,
			status,
			courseSlug: courseSlug,
		});
		return NextResponse.json({received: true});
	} catch (error) {
		console.error('Razorpay webhook processing failed', error);
		return NextResponse.json({error: 'Webhook processing failed'}, {status: 500});
	}
}