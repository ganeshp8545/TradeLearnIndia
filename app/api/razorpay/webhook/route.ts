import {NextResponse} from 'next/server';
import {COURSE_NAME, COURSE_SLUG, getCoursePricePaise, getPaymentByOrderId, recordCoursePayment} from '@/lib/course-access';
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

type RazorpayOrder = {
	id?: string;
	receipt?: string;
	amount?: number;
	currency?: string;
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

async function fetchRazorpay<T>(resource: string): Promise<T> {
	const credentials = Buffer.from(`${env('RAZORPAY_KEY_ID')}:${env('RAZORPAY_KEY_SECRET')}`).toString('base64');
	const response = await fetch(`https://api.razorpay.com/v1/${resource}`, {
		headers: {Authorization: `Basic ${credentials}`},
		cache: 'no-store',
	});
	if (!response.ok) throw new Error(`Razorpay API request failed (${response.status}) for ${resource}`);
	return response.json() as Promise<T>;
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

		const [order, confirmedPayment, storedPayment] = await Promise.all([
			fetchRazorpay<RazorpayOrder>(`orders/${encodeURIComponent(payment.order_id)}`),
			fetchRazorpay<RazorpayEntity>(`payments/${encodeURIComponent(payment.id)}`),
			getPaymentByOrderId(payment.order_id),
		]);
		const expectedAmount = getCoursePricePaise();
		const orderMatches = order.id === payment.order_id
			&& order.receipt?.startsWith('course_')
			&& order.amount === expectedAmount
			&& order.currency === 'INR'
			&& order.notes?.course === COURSE_SLUG
			&& (!storedPayment || (storedPayment.razorpay_order_id === order.id
				&& storedPayment.amount === expectedAmount
				&& storedPayment.currency === 'INR'
				&& storedPayment.course_name === COURSE_NAME
				&& storedPayment.course_slug === COURSE_SLUG));
		const paymentMatches = confirmedPayment.id === payment.id
			&& confirmedPayment.order_id === order.id
			&& confirmedPayment.amount === expectedAmount
			&& confirmedPayment.currency === 'INR'
			&& confirmedPayment.status === (event.event === 'payment.captured' ? 'captured' : 'failed');
		if (!orderMatches || !paymentMatches) {
			console.warn('Razorpay webhook reconciliation rejected', {
				internalOrderId: storedPayment?.id,
				orderId: payment.order_id,
				paymentId: payment.id,
				paymentStatus: confirmedPayment.status ?? 'unknown',
				amount: confirmedPayment.amount ?? null,
				currency: confirmedPayment.currency ?? null,
				reason: !orderMatches ? 'order_or_stored_payment_mismatch' : 'payment_status_or_amount_mismatch',
			});
			return NextResponse.json({error: 'Payment does not match the course order'}, {status: 422});
		}

		if (event.event === 'payment.failed' && storedPayment?.payment_status === 'success') {
			return NextResponse.json({received: true});
		}
		const status = event.event === 'payment.captured' ? 'success' : 'failed';
		await recordCoursePayment({
			paymentId: payment.id,
			orderId: payment.order_id,
			name: payment.contact ?? payment.name ?? null,
			email: payment.email ?? null,
			amount: confirmedPayment.amount ?? 0,
			currency: confirmedPayment.currency ?? 'INR',
			status,
			courseSlug: courseSlug,
		});
		console.info('Razorpay webhook payment reconciled', {
			internalOrderId: storedPayment?.id,
			orderId: payment.order_id,
			paymentId: payment.id,
			paymentStatus: confirmedPayment.status,
			amount: confirmedPayment.amount,
			currency: confirmedPayment.currency,
		});
		return NextResponse.json({received: true});
	} catch (error) {
		console.error('Razorpay webhook processing failed', error);
		return NextResponse.json({error: 'Webhook processing failed'}, {status: 500});
	}
}