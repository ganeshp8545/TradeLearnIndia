import {NextResponse} from 'next/server';
import {COURSE_PRICE_PAISE, recordCoursePayment, type PaymentStatus} from '@/lib/course-access';
import {verifyRazorpayWebhookSignature} from '@/lib/razorpay-webhook';

export const runtime = 'nodejs';

type RazorpayEntity = {
	id?: string;
	amount?: number;
	amount_paid?: number;
	currency?: string;
	email?: string;
	contact?: string;
	name?: string;
	order_id?: string | null;
	payment_link_id?: string | null;
	customer?: {name?: string; email?: string};
	payments?: Array<{payment_id?: string}>;
};

type RazorpayWebhook = {
	event?: string;
	payload?: {
		payment_link?: {entity?: RazorpayEntity};
		payment?: {entity?: RazorpayEntity};
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
		if (!['payment_link.paid', 'payment.failed', 'payment_link.created'].includes(event.event ?? '')) {
			return NextResponse.json({received: true});
		}

		const link = event.payload?.payment_link?.entity;
		const payment = event.payload?.payment?.entity;
		const linkId = link?.id ?? payment?.payment_link_id;
		if (!linkId) return NextResponse.json({error: 'Missing Payment Link ID'}, {status: 400});

		const status: PaymentStatus = event.event === 'payment_link.paid'
			? 'success'
			: event.event === 'payment.failed' ? 'failed' : 'pending';
		const amount = status === 'success' ? (link?.amount_paid ?? payment?.amount ?? 0) : (link?.amount ?? payment?.amount ?? 0);
		const currency = link?.currency ?? payment?.currency;
		if (status === 'success' && (amount !== COURSE_PRICE_PAISE || currency !== 'INR')) {
			return NextResponse.json({error: 'Payment does not match the course price'}, {status: 422});
		}

		const payId = payment?.id ?? link?.payments?.[0]?.payment_id ?? null;
		await recordCoursePayment({
			linkId,
			paymentId: payId,
			orderId: payment?.order_id ?? null,
			name: payment?.name ?? link?.customer?.name ?? null,
			email: payment?.email ?? link?.customer?.email ?? null,
			amount,
			status,
		});
		return NextResponse.json({received: true});
	} catch (error) {
		console.error('Razorpay webhook processing failed', error);
		return NextResponse.json({error: 'Webhook processing failed'}, {status: 500});
	}
}