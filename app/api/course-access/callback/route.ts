import {NextResponse} from 'next/server';
import {
	COURSE_NAME,
	COURSE_SLUG,
	getCoursePricePaise,
	getPaymentByOrderId,
	grantCourseAccessToken,
} from '@/lib/course-access';
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
	amount?: number;
	currency?: string;
	status?: string;
	order_id?: string | null;
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
	const credentials = Buffer.from(`${requiredEnv('RAZORPAY_KEY_ID')}:${requiredEnv('RAZORPAY_KEY_SECRET')}`).toString('base64');
	const response = await fetch(`https://api.razorpay.com/v1/${resource}`, {
		headers: {Authorization: `Basic ${credentials}`},
		cache: 'no-store',
	});
	if (!response.ok) throw new Error(`Razorpay verification failed (${response.status})`);
	return response.json() as Promise<T>;
}

function reply(status: string, httpStatus = 200) {
	return NextResponse.json({status}, {
		status: httpStatus,
		headers: {'Cache-Control': 'no-store, max-age=0'},
	});
}

export async function POST(request: Request) {
	try {
		const body = await request.json() as Record<string, unknown>;
		const orderId = typeof body.razorpay_order_id === 'string' ? body.razorpay_order_id : '';
		const paymentId = typeof body.razorpay_payment_id === 'string' ? body.razorpay_payment_id : '';
		const signature = typeof body.razorpay_signature === 'string' ? body.razorpay_signature : null;

		if (!orderId || !paymentId || !signature) return reply('not_found', 400);
		const expectedAmount = getCoursePricePaise();
		if (!verifyRazorpayOrderSignature(orderId, paymentId, signature, requiredEnv('RAZORPAY_KEY_SECRET'))) {
			return reply('pending', 401);
		}

		const [order, razorpayPayment, storedPayment] = await Promise.all([
			fetchRazorpay<RazorpayOrder>(`orders/${encodeURIComponent(orderId)}`),
			fetchRazorpay<RazorpayPayment>(`payments/${encodeURIComponent(paymentId)}`),
			getPaymentByOrderId(orderId),
		]);
		const validOrder = order.id === orderId
			&& order.amount === expectedAmount
			&& order.currency === 'INR'
			&& (order.notes?.course ?? COURSE_SLUG) === COURSE_SLUG;
		const validPayment = razorpayPayment.id === paymentId
			&& razorpayPayment.order_id === orderId
			&& razorpayPayment.amount === expectedAmount
			&& razorpayPayment.currency === 'INR'
			&& (razorpayPayment.status === 'captured' || razorpayPayment.status === 'authorized');
		const validRecord = storedPayment?.razorpay_order_id === orderId
			&& storedPayment.razorpay_payment_id === paymentId
			&& storedPayment.amount === expectedAmount
			&& storedPayment.payment_status === 'success'
			&& storedPayment.course_name === COURSE_NAME;

		if (!validOrder || !validPayment || !validRecord) return reply('pending');

		const accessToken = await grantCourseAccessToken(orderId, paymentId);
		if (!accessToken) return reply('success');

		const response = reply('success');
		response.cookies.set('course_access_token', accessToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			path: '/',
			maxAge: 24 * 60 * 60,
		});
		return response;
	} catch (error) {
		console.error('Course callback verification failed', error);
		return reply('pending', 503);
	}
}